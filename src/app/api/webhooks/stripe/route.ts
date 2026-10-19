import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripeSettings, getStripeWebhookSecret } from '@/lib/stripe-server';
import { getSubscriptionPeriod, grantOrExtendCourseAccess, normalizeStripeStatus, stripeTimestampToDate } from '@/lib/course-subscriptions';
import { sendCourseSubscriptionRenewalEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function generateOrderNumber() {
  return `#${Math.floor(100000 + Math.random() * 900000)}`;
}

async function createUniqueOrderNumber() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const orderNumber = generateOrderNumber();
    const existing = await prisma.order.findUnique({ where: { orderNumber } }).catch(() => null);
    if (!existing) return orderNumber;
  }
  return `#${Date.now().toString().slice(-6)}`;
}

function getInvoiceSubscriptionId(invoice: any): string | null {
  const candidates = [
    invoice?.subscription,
    invoice?.parent?.subscription_details?.subscription,
    invoice?.subscription_details?.subscription,
    ...(invoice?.lines?.data || []).flatMap((line: any) => [
      line?.subscription,
      line?.parent?.subscription_item_details?.subscription,
      line?.subscription_item_details?.subscription,
    ]),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) return candidate;
    if (candidate?.id) return candidate.id;
  }

  return null;
}

function getInvoiceMetadata(invoice: any) {
  const line = invoice?.lines?.data?.[0];
  return {
    ...(invoice?.metadata || {}),
    ...(invoice?.subscription_details?.metadata || {}),
    ...(invoice?.parent?.subscription_details?.metadata || {}),
    ...(line?.metadata || {}),
  };
}

function getInvoicePeriod(invoice: any) {
  const line = invoice?.lines?.data?.find((item: any) => item?.period?.start || item?.period?.end);
  const periodStart = stripeTimestampToDate(line?.period?.start || invoice?.period_start);
  const periodEnd = stripeTimestampToDate(line?.period?.end || invoice?.period_end);
  return { periodStart, periodEnd };
}

function getInvoicePriceId(invoice: any): string | null {
  const line = invoice?.lines?.data?.[0];
  return line?.price?.id || line?.plan?.id || line?.pricing?.price_details?.price || null;
}

function getInvoicePaymentId(invoice: any): string | null {
  const paymentIntent = typeof invoice?.payment_intent === 'string' ? invoice.payment_intent : invoice?.payment_intent?.id;
  const charge = typeof invoice?.charge === 'string' ? invoice.charge : invoice?.charge?.id;
  return paymentIntent || charge || invoice?.id || null;
}

function getInvoicePaidAt(invoice: any) {
  const timestamp = invoice?.status_transitions?.paid_at || invoice?.effective_at || invoice?.created;
  return timestamp ? new Date(timestamp * 1000) : new Date();
}

function getLatestDate(...dates: Array<Date | string | null | undefined>) {
  const validDates = dates
    .filter(Boolean)
    .map((date) => new Date(date as any))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (validDates.length === 0) return null;
  return new Date(Math.max(...validDates.map((date) => date.getTime())));
}

async function syncSubscriptionFromStripe(
  stripeSubscription: any,
  fallbackPeriod?: { periodStart?: Date | null; periodEnd?: Date | null },
  fallbackPriceId?: string | null
) {
  const existing = await prisma.courseSubscription.findUnique({
    where: { stripeSubscriptionId: stripeSubscription.id },
  });

  if (!existing) return null;

  const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(stripeSubscription);
  const firstItem = stripeSubscription.items?.data?.[0] as any;

  return prisma.courseSubscription.update({
    where: { id: existing.id },
    data: {
      status: normalizeStripeStatus(stripeSubscription.status),
      currentPeriodStart: currentPeriodStart || fallbackPeriod?.periodStart || existing.currentPeriodStart,
      currentPeriodEnd: getLatestDate(currentPeriodEnd, fallbackPeriod?.periodEnd, existing.currentPeriodEnd) || existing.currentPeriodEnd,
      stripeCustomerId: String(stripeSubscription.customer || existing.stripeCustomerId || ''),
      stripePriceId: firstItem?.price?.id || fallbackPriceId || existing.stripePriceId,
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
      canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
    },
    include: { user: true, course: true, courseAccessPlan: true },
  });
}

async function findLocalSubscription(stripeSubscriptionId: string, invoice: any) {
  const existing = await prisma.courseSubscription.findUnique({
    where: { stripeSubscriptionId },
    include: { user: true, course: true, courseAccessPlan: true },
  });
  if (existing) return existing;

  const metadata = getInvoiceMetadata(invoice);
  const itemId = Number(metadata.itemId || metadata.courseId || 0);
  const planId = metadata.planId ? Number(metadata.planId) : null;
  const customerEmail = String(invoice?.customer_email || '').trim();

  if (!itemId || !customerEmail) return null;

  const user = await prisma.user.findUnique({ where: { email: customerEmail } });
  if (!user) return null;

  const course = await prisma.course.findUnique({ where: { id: itemId } });
  if (!course) return null;

  const created = await prisma.courseSubscription.create({
    data: {
      userId: user.id,
      courseId: course.id,
      courseAccessPlanId: planId || null,
      stripeCustomerId: String(invoice?.customer || ''),
      stripeSubscriptionId,
      stripePriceId: getInvoicePriceId(invoice),
      status: 'ACTIVE',
      currentPeriodStart: getInvoicePeriod(invoice).periodStart,
      currentPeriodEnd: getInvoicePeriod(invoice).periodEnd,
      cancelAtPeriodEnd: false,
      latestInvoiceId: null,
      latestPaymentIntentId: null,
    },
    include: { user: true, course: true, courseAccessPlan: true },
  });

  return created;
}

async function handleInvoicePaid(invoice: any, stripe: Stripe) {
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubscriptionId) {
    return;
  }

  const existing = await findLocalSubscription(stripeSubscriptionId, invoice);
  if (!existing) {
    return;
  }

  const invoicePeriod = getInvoicePeriod(invoice);
  const invoicePriceId = getInvoicePriceId(invoice);
  const invoicePaymentId = getInvoicePaymentId(invoice);
  const paidAt = getInvoicePaidAt(invoice);
  const isRenewalInvoice = invoice?.billing_reason === 'subscription_cycle';

  let stripeSubscription: any | null = null;
  try {
    stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['latest_invoice.payment_intent'],
    } as any);
  } catch (error) {
    console.error('Could not retrieve Stripe subscription; using invoice period fallback', stripeSubscriptionId, error);
  }

  const synced = stripeSubscription
    ? await syncSubscriptionFromStripe(stripeSubscription, invoicePeriod, invoicePriceId)
    : await prisma.courseSubscription.update({
        where: { id: existing.id },
        data: {
          currentPeriodStart: invoicePeriod.periodStart || existing.currentPeriodStart,
          currentPeriodEnd: getLatestDate(invoicePeriod.periodEnd, existing.currentPeriodEnd) || existing.currentPeriodEnd,
          stripePriceId: invoicePriceId || existing.stripePriceId,
          status: existing.status || 'ACTIVE',
          stripeCustomerId: String(invoice?.customer || existing.stripeCustomerId || ''),
        },
        include: { user: true, course: true, courseAccessPlan: true },
      });

  if (!synced) return;

  const stripePeriod = getSubscriptionPeriod(stripeSubscription || {});
  const finalPeriodEnd = getLatestDate(invoicePeriod.periodEnd, stripePeriod.currentPeriodEnd, synced.currentPeriodEnd);
  const finalPeriodStart = invoicePeriod.periodStart || stripePeriod.currentPeriodStart || synced.currentPeriodStart;
  const latestPaymentIntentId = invoice?.payment_intent ? String(invoice.payment_intent) : invoicePaymentId;

  // Initial subscription payments are finalized by /api/checkout/fulfill. Keep the subscription/access
  // dates synced, but do not create a duplicate payment-history order for subscription_create invoices.
  if (!isRenewalInvoice) {
    await prisma.courseSubscription.update({
      where: { id: synced.id },
      data: {
        latestInvoiceId: invoice.id,
        latestPaymentIntentId,
        currentPeriodStart: finalPeriodStart || synced.currentPeriodStart,
        currentPeriodEnd: finalPeriodEnd || synced.currentPeriodEnd,
      },
    });

    await grantOrExtendCourseAccess({
      userId: synced.userId,
      courseId: synced.courseId,
      courseAccessPlanId: synced.courseAccessPlanId,
      durationMonths: synced.courseAccessPlan?.durationMonths || null,
      orderId: null,
      source: 'subscription',
      adminNote: `Synced by Stripe subscription invoice ${invoice.id}.`,
      forceExpiresAt: finalPeriodEnd || null,
    });
    return;
  }

  const amountPaid = typeof invoice.amount_paid === 'number' ? invoice.amount_paid / 100 : 0;
  const orderItemName = `${synced.course.title}${synced.courseAccessPlan ? ` - ${synced.courseAccessPlan.name}` : ''}`;
  const paymentRefs = [latestPaymentIntentId, invoice?.charge ? String(invoice.charge) : null, invoice?.id].filter(Boolean) as string[];

  let order = await prisma.order.findFirst({
    where: {
      customerId: synced.userId,
      paymentMethod: 'STRIPE_SUBSCRIPTION_RENEWAL',
      OR: paymentRefs.map((paymentId) => ({ paymentId })),
    },
  });

  let createdRenewalOrder = false;
  if (!order) {
    const generatedOrderNumber = await createUniqueOrderNumber();
    order = await prisma.order.create({
      data: {
        customerId: synced.userId,
        customerEmail: synced.user.email,
        orderNumber: generatedOrderNumber,
        status: 'COMPLETED',
        paymentMethod: 'STRIPE_SUBSCRIPTION_RENEWAL',
        paymentId: latestPaymentIntentId || invoice?.id,
        totalAmount: amountPaid,
        billingAddress: '{}',
        shippingAddress: '{}',
        createdAt: paidAt,
        items: {
          create: [
            {
              courseId: synced.courseId,
              courseAccessPlanId: synced.courseAccessPlanId,
              name: orderItemName,
              quantity: 1,
              price: amountPaid,
              total: amountPaid,
            },
          ],
        },
      },
    });
    createdRenewalOrder = true;
  }

  await prisma.courseSubscription.update({
    where: { id: synced.id },
    data: {
      latestInvoiceId: invoice.id,
      latestPaymentIntentId,
      currentPeriodStart: finalPeriodStart || synced.currentPeriodStart,
      currentPeriodEnd: finalPeriodEnd || synced.currentPeriodEnd,
      status: synced.status || 'ACTIVE',
    },
  });

  await grantOrExtendCourseAccess({
    userId: synced.userId,
    courseId: synced.courseId,
    courseAccessPlanId: synced.courseAccessPlanId,
    durationMonths: synced.courseAccessPlan?.durationMonths || null,
    orderId: order.id,
    source: 'subscription',
    adminNote: `Extended by Stripe subscription renewal invoice ${invoice.id}.`,
    forceExpiresAt: finalPeriodEnd || null,
  });

  if (createdRenewalOrder) {
    const userName = `${synced.user.firstName || ''} ${synced.user.lastName || ''}`.trim() || synced.user.email;
    await sendCourseSubscriptionRenewalEmail({
      userEmail: synced.user.email,
      userName,
      courseName: synced.course.title,
      planName: synced.courseAccessPlan?.name || 'Course Access',
      amount: amountPaid > 0 ? amountPaid.toFixed(2) : '0',
      orderNumber: order.orderNumber,
      accessUntil: finalPeriodEnd,
    }).catch(console.error);
  }
}

export async function POST(req: Request) {
  try {
    const stripeSettings = await getStripeSettings();
    const webhookSecret = getStripeWebhookSecret();
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;
    if (webhookSecret && signature) {
      event = stripeSettings.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }

    if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
      await handleInvoicePaid(event.data.object as any, stripeSettings.stripe);
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await syncSubscriptionFromStripe(event.data.object as any);
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice: any = event.data.object;
      const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);
      if (stripeSubscriptionId) {
        await prisma.courseSubscription.updateMany({
          where: { stripeSubscriptionId },
          data: {
            status: 'PAST_DUE',
            latestInvoiceId: invoice.id,
            latestPaymentIntentId: invoice.payment_intent ? String(invoice.payment_intent) : null,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook failed' }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripeSettings } from '@/lib/stripe-server';

async function isSubscriptionFeatureEnabled() {
  const setting = await prisma.setting.findUnique({ where: { key: 'subscriptionEnabled' } }).catch(() => null);
  return setting?.value !== 'false';
}

function isTestSubscriptionPlanEnabled() {
  return (
    process.env.ENABLE_TEST_SUBSCRIPTION === 'true' ||
    process.env.ENABLE_TEST_SUBSCRIPTION_PLAN === 'true'
  );
}

export async function POST(req: Request) {
  try {
    const { itemId, type, planId, billingMode, customerName, customerEmail, customerPhone } = await req.json();
    const testPlanEnabled = isTestSubscriptionPlanEnabled();
    const subscriptionFeatureEnabled = await isSubscriptionFeatureEnabled();
    const isTestSubscription = billingMode === 'test_subscription' && testPlanEnabled;
    const mode = billingMode === 'subscription' || isTestSubscription ? 'subscription' : 'one_time';

    if (!itemId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if ((billingMode === 'subscription' || billingMode === 'test_subscription') && !subscriptionFeatureEnabled) {
      return NextResponse.json({ error: 'Auto-renew subscriptions are currently disabled.' }, { status: 400 });
    }

    if (billingMode === 'test_subscription' && !testPlanEnabled) {
      return NextResponse.json({ error: 'Test subscription plan is disabled.' }, { status: 400 });
    }

    let amount = 0;
    let itemName = '';
    let durationMonths: number | null = null;
    let recurringInterval: 'day' | 'month' | 'year' = 'month';
    let recurringIntervalCount = 1;

    if (type === 'course') {
      const course = await prisma.course.findUnique({
        where: { id: parseInt(itemId) },
        include: { accessPlans: { where: { isActive: true } } },
      });
      if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

      if (course.pricingType === 'VARIABLE' && course.accessPlans.length > 0) {
        const selectedPlan = course.accessPlans.find((plan) => plan.id === Number(planId));
        if (!selectedPlan) return NextResponse.json({ error: 'Please select a valid access plan.' }, { status: 400 });
        amount = selectedPlan.salePrice || selectedPlan.regularPrice || 0;
        itemName = `${course.title} - ${selectedPlan.name}`;
        durationMonths = selectedPlan.durationMonths;
      } else {
        amount = course.salePrice || course.price || 0;
        itemName = course.title;
      }

      if (isTestSubscription) {
        amount = 1;
        itemName = `${course.title} - $1 Daily Auto-Renew Test`;
        recurringInterval = 'day';
        recurringIntervalCount = 1;
      } else if (durationMonths === 12) {
        recurringInterval = 'year';
        recurringIntervalCount = 1;
      } else {
        recurringInterval = 'month';
        recurringIntervalCount = durationMonths || 1;
      }
    } else {
      if (mode === 'subscription') {
        return NextResponse.json({ error: 'Auto-renew is available for courses only.' }, { status: 400 });
      }
      const product = await prisma.product.findUnique({ where: { id: parseInt(itemId) } });
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      amount = product.salePrice || product.price || 0;
      itemName = product.title;
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (mode === 'subscription' && !isTestSubscription && (!durationMonths || durationMonths <= 0)) {
      return NextResponse.json({ error: 'Auto-renew requires a valid course plan duration.' }, { status: 400 });
    }

    const stripeSettings = await getStripeSettings();
    const { stripe, currency } = stripeSettings;
    const amountInCents = Math.round(amount * 100);

    if (mode === 'subscription') {
      const customer = await stripe.customers.create({
        email: customerEmail || undefined,
        name: customerName || undefined,
        phone: customerPhone || undefined,
        metadata: {
          itemId: itemId.toString(),
          itemType: type,
          planId: planId ? String(planId) : '',
          customerEmail: customerEmail || '',
          customerName: customerName || '',
          customerPhone: customerPhone || '',
          isTestSubscription: isTestSubscription ? 'true' : 'false',
        },
      });

      const stripeProduct = await stripe.products.create({
        name: itemName,
        metadata: {
          itemId: itemId.toString(),
          itemType: type,
          planId: planId ? String(planId) : '',
          customerEmail: customerEmail || '',
          customerName: customerName || '',
          isTestSubscription: isTestSubscription ? 'true' : 'false',
        },
      });

      const subscription: any = await stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price_data: {
              currency,
              unit_amount: amountInCents,
              product: stripeProduct.id,
              recurring: {
                interval: recurringInterval,
                interval_count: recurringIntervalCount,
              },
            },
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.confirmation_secret', 'latest_invoice.payment_intent'],
        metadata: {
          itemId: itemId.toString(),
          itemType: type,
          planId: planId ? String(planId) : '',
          durationMonths: String(durationMonths || ''),
          customerEmail: customerEmail || '',
          customerName: customerName || '',
          customerPhone: customerPhone || '',
          isTestSubscription: isTestSubscription ? 'true' : 'false',
        },
      } as any);

      let latestInvoice = subscription.latest_invoice as any;

      if (latestInvoice?.id && (!latestInvoice?.confirmation_secret || !latestInvoice?.payment_intent)) {
        try {
          latestInvoice = await stripe.invoices.retrieve(latestInvoice.id, {
            expand: ['confirmation_secret', 'payment_intent'],
          } as any);
        } catch (invoiceError) {
          console.error('Unable to retrieve expanded subscription invoice:', invoiceError);
        }
      }

      const paymentIntent = latestInvoice?.payment_intent as any;
      const confirmationSecret = latestInvoice?.confirmation_secret as any;
      const subscriptionClientSecret =
        confirmationSecret?.client_secret ||
        paymentIntent?.client_secret ||
        null;

      if (!subscriptionClientSecret) {
        console.error('Stripe subscription missing client secret', {
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          latestInvoiceId: latestInvoice?.id,
          latestInvoiceStatus: latestInvoice?.status,
          latestInvoiceBillingReason: latestInvoice?.billing_reason,
          latestInvoiceCollectionMethod: latestInvoice?.collection_method,
          paymentIntentType: typeof latestInvoice?.payment_intent,
          paymentIntentStatus: paymentIntent?.status,
          hasPaymentIntentSecret: Boolean(paymentIntent?.client_secret),
          hasConfirmationSecret: Boolean(latestInvoice?.confirmation_secret),
          hasConfirmationSecretClientSecret: Boolean(confirmationSecret?.client_secret),
        });

        return NextResponse.json(
          { error: 'Unable to initialize subscription payment. Please check Stripe subscription settings.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        clientSecret: subscriptionClientSecret,
        publishableKey: stripeSettings.publishableKey,
        allowedCountries: stripeSettings.allowedCountries,
        zelleEnabled: false,
        zellePhone: '',
        zelleQrCodeUrl: '',
        checkoutMode: isTestSubscription ? 'test_subscription' : 'subscription',
        subscriptionId: subscription.id,
        stripeCustomerId: customer.id,
        testSubscriptionPlanEnabled: testPlanEnabled,
        subscriptionEnabled: subscriptionFeatureEnabled,
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata: {
        itemId: itemId.toString(),
        itemType: type,
        planId: planId ? String(planId) : '',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: stripeSettings.publishableKey,
      allowedCountries: stripeSettings.allowedCountries,
      zelleEnabled: stripeSettings.zelleEnabled,
      zellePhone: stripeSettings.zellePhone,
      zelleQrCodeUrl: stripeSettings.zelleQrCodeUrl,
      checkoutMode: 'one_time',
      testSubscriptionPlanEnabled: testPlanEnabled,
      subscriptionEnabled: subscriptionFeatureEnabled,
    });
  } catch (error: any) {
    console.error('Stripe checkout initialization error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

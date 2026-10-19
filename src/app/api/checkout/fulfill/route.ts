import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { sendCoursePurchaseEmail } from '@/lib/email';
import { grantOrExtendCourseAccess, getSubscriptionPeriod, normalizeStripeStatus } from '@/lib/course-subscriptions';
import { getStripeSettings } from '@/lib/stripe-server';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function isSubscriptionFeatureEnabled() {
  const setting = await prisma.setting.findUnique({ where: { key: 'subscriptionEnabled' } }).catch(() => null);
  return setting?.value !== 'false';
}

function testSubscriptionEnabled() {
  return process.env.ENABLE_TEST_SUBSCRIPTION === 'true' || process.env.ENABLE_TEST_SUBSCRIPTION_PLAN === 'true';
}

function getLatestPaymentIntentId(latestInvoice: any, fallback?: string | null) {
  const paymentIntent = latestInvoice?.payment_intent;
  if (typeof paymentIntent === 'string') return paymentIntent;
  if (paymentIntent?.id) return paymentIntent.id;
  return fallback || null;
}

export async function POST(req: Request) {
  try {
    const {
      itemId,
      type,
      name,
      email,
      phone,
      password,
      paymentIntentId,
      paymentId,
      shippingAddress,
      paymentMethod,
      planId,
      billingMode,
      subscriptionId,
      stripeCustomerId,
      isTestSubscriptionPlan,
    } = await req.json();

    const isTestSubscription = billingMode === 'test_subscription' && Boolean(isTestSubscriptionPlan);
    const isSubscriptionCheckout =
      paymentMethod === 'STRIPE_SUBSCRIPTION' ||
      billingMode === 'subscription' ||
      isTestSubscription ||
      Boolean(subscriptionId);

    if (isSubscriptionCheckout && !(await isSubscriptionFeatureEnabled())) {
      return NextResponse.json({ error: 'Auto-renew subscriptions are currently disabled.' }, { status: 400 });
    }

    if (isTestSubscription && !testSubscriptionEnabled()) {
      return NextResponse.json({ error: 'Test subscription plan is disabled.' }, { status: 400 });
    }

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('cms_session')?.value;

    let userId: number | null = null;
    let userEmail: string = email || '';
    let userName: string = name || '';

    if (token) {
      try {
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
        );
        const { payload } = await jwtVerify(token, secret);
        userId = Number(payload.id);
        const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
        if (user) {
          userEmail = user.email;
          userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        }
      } catch {
        // Continue as guest checkout when cookie is invalid.
      }
    }

    let isNewUser = false;

    if (!userId) {
      if (!email || !password || !phone) {
        return NextResponse.json({ error: 'Name, email, phone, and password are required for checkout.' }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        const passwordOk = existing.password ? await bcrypt.compare(password, existing.password).catch(() => false) : false;
        if (!passwordOk) {
          return NextResponse.json({ error: 'An account with this email already exists. Please log in or use the correct password.' }, { status: 400 });
        }
        userId = existing.id;
        userEmail = existing.email;
        userName = `${existing.firstName || ''} ${existing.lastName || ''}`.trim() || existing.email;
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
          data: {
            username: email,
            email,
            phone,
            password: hashedPassword,
            firstName: name?.split(' ')[0] || '',
            lastName: name?.split(' ').slice(1).join(' ') || '',
            role: 'Customer',
          },
        });
        userId = newUser.id;
        userEmail = newUser.email;
        userName = `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim() || newUser.email;
        isNewUser = true;
      }
    }

    if (userId && phone) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone },
      }).catch(() => null);
    }

    const isZelle = paymentMethod === 'ZELLE';
    const orderStatus = isZelle ? 'PENDING' : 'COMPLETED';
    const paymentRef = paymentId || paymentIntentId || subscriptionId || null;
    let responseData: any = { success: true };

    if (type === 'course') {
      const course = await prisma.course.findUnique({
        where: { id: Number(itemId) },
        include: { accessPlans: { where: { isActive: true } } },
      });

      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const isVariable = course.pricingType === 'VARIABLE' && course.accessPlans.length > 0;
      const selectedPlan = isVariable ? course.accessPlans.find((plan) => plan.id === Number(planId)) : null;

      if (isVariable && !selectedPlan && !isTestSubscription) {
        return NextResponse.json({ error: 'Please select a valid course access plan.' }, { status: 400 });
      }

      const normalAmount = selectedPlan ? (selectedPlan.salePrice || selectedPlan.regularPrice || 0) : (course.salePrice || course.price || 0);
      const amountPaid = isTestSubscription ? 1 : normalAmount;
      const generatedOrderNumber = `#${Math.floor(100000 + Math.random() * 900000)}`;
      const planName = isTestSubscription ? '$1 Daily Auto-Renew Test' : (selectedPlan?.name || null);
      const orderItemName = planName ? `${course.title} - ${planName}` : course.title;

      const existingOrder = paymentRef
        ? await prisma.order.findFirst({ where: { paymentId: paymentRef } })
        : null;

      const order = existingOrder || await prisma.order.create({
        data: {
          customerId: userId,
          customerEmail: userEmail,
          orderNumber: generatedOrderNumber,
          status: orderStatus,
          paymentMethod: paymentMethod || 'STRIPE',
          paymentId: paymentRef,
          totalAmount: amountPaid,
          billingAddress: '{}',
          shippingAddress: '{}',
          items: {
            create: [{
              courseId: course.id,
              courseAccessPlanId: selectedPlan?.id || null,
              name: orderItemName,
              quantity: 1,
              price: amountPaid,
              total: amountPaid,
            }],
          },
        },
      });

      if (!isZelle || amountPaid === 0) {
        let subscriptionRecord: any = null;
        let forceExpiresAt: Date | null = null;

        if (isSubscriptionCheckout) {
          if (!subscriptionId) {
            return NextResponse.json({ error: 'Subscription ID missing.' }, { status: 400 });
          }

          let stripeSubscription: any = null;
          let currentPeriodStart: Date | null = null;
          let currentPeriodEnd: Date | null = null;
          let latestInvoice: any = null;
          let latestPaymentIntentId: string | null = paymentIntentId || null;
          let stripePriceId: string | null = null;
          let stripeCustomerValue = stripeCustomerId || '';
          let stripeStatus = 'ACTIVE';
          let cancelAtPeriodEnd = false;
          let canceledAt: Date | null = null;

          try {
            const stripeSettings = await getStripeSettings();
            stripeSubscription = await stripeSettings.stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['latest_invoice.payment_intent', 'items.data.price'],
            } as any);

            const stripePeriod = getSubscriptionPeriod(stripeSubscription);
            currentPeriodStart = stripePeriod.currentPeriodStart;
            currentPeriodEnd = stripePeriod.currentPeriodEnd;
            latestInvoice = stripeSubscription.latest_invoice as any;
            latestPaymentIntentId = getLatestPaymentIntentId(latestInvoice, paymentIntentId || null);
            stripePriceId = stripeSubscription.items?.data?.[0]?.price?.id || null;
            stripeCustomerValue = String(stripeSubscription.customer || stripeCustomerId || '');
            stripeStatus = normalizeStripeStatus(stripeSubscription.status);
            cancelAtPeriodEnd = Boolean(stripeSubscription.cancel_at_period_end);
            canceledAt = stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null;

            if (stripeSubscription.customer) {
              await stripeSettings.stripe.customers.update(stripeSubscription.customer as string, {
                email: userEmail || undefined,
                name: userName || undefined,
                phone: phone || undefined,
                metadata: {
                  userId: String(userId),
                  courseId: String(course.id),
                  planId: selectedPlan?.id ? String(selectedPlan.id) : '',
                },
              }).catch(() => null);
            }
          } catch {
            const startsAt = new Date();
            currentPeriodStart = startsAt;
            currentPeriodEnd = isTestSubscription
              ? addDays(startsAt, 1)
              : selectedPlan?.durationMonths
                ? new Date(startsAt.getFullYear(), startsAt.getMonth() + selectedPlan.durationMonths, startsAt.getDate(), startsAt.getHours(), startsAt.getMinutes(), startsAt.getSeconds(), startsAt.getMilliseconds())
                : null;
          }

          forceExpiresAt = currentPeriodEnd;

          subscriptionRecord = await prisma.courseSubscription.upsert({
            where: { stripeSubscriptionId: subscriptionId },
            update: {
              userId: userId!,
              courseId: course.id,
              courseAccessPlanId: selectedPlan?.id || null,
              stripeCustomerId: stripeCustomerValue,
              stripePriceId,
              status: stripeStatus,
              currentPeriodStart,
              currentPeriodEnd,
              cancelAtPeriodEnd,
              canceledAt,
              latestInvoiceId: latestInvoice?.id || null,
              latestPaymentIntentId,
            },
            create: {
              userId: userId!,
              courseId: course.id,
              courseAccessPlanId: selectedPlan?.id || null,
              stripeCustomerId: stripeCustomerValue,
              stripeSubscriptionId: subscriptionId,
              stripePriceId,
              status: stripeStatus,
              currentPeriodStart,
              currentPeriodEnd,
              cancelAtPeriodEnd,
              canceledAt,
              latestInvoiceId: latestInvoice?.id || null,
              latestPaymentIntentId,
            },
          });
        }

        await grantOrExtendCourseAccess({
          userId: userId!,
          courseId: course.id,
          courseAccessPlanId: selectedPlan?.id || null,
          durationMonths: selectedPlan?.durationMonths || null,
          orderId: order.id,
          source: isSubscriptionCheckout ? 'subscription' : 'online',
          adminNote: isTestSubscription ? 'Granted by $1 daily auto-renew test subscription checkout.' : (isSubscriptionCheckout ? 'Granted by auto-renew subscription checkout.' : null),
          forceExpiresAt,
        });

        sendCoursePurchaseEmail(userEmail, userName, orderItemName, amountPaid > 0 ? amountPaid.toString() : 'Free', order.orderNumber).catch(console.error);
        responseData.subscriptionId = subscriptionRecord?.id || null;
      }

      responseData.enrollmentId = course.id;
      responseData.orderId = order.id;
      responseData.isPending = isZelle;
    } else {
      const product = await prisma.product.findUnique({ where: { id: Number(itemId) } });
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      const generatedOrderNumber = `#${Math.floor(100000 + Math.random() * 900000)}`;
      const amountPaid = product.salePrice || product.price || 0;
      const existingOrder = paymentRef
        ? await prisma.order.findFirst({ where: { paymentId: paymentRef } })
        : null;

      const order = existingOrder || await prisma.order.create({
        data: {
          customerId: userId,
          customerEmail: userEmail,
          orderNumber: generatedOrderNumber,
          status: orderStatus,
          paymentMethod: paymentMethod || 'STRIPE',
          paymentId: paymentRef,
          totalAmount: amountPaid,
          billingAddress: JSON.stringify(shippingAddress || {}),
          shippingAddress: JSON.stringify(shippingAddress || {}),
          items: {
            create: [{
              productId: product.id,
              name: product.title,
              quantity: 1,
              price: amountPaid,
              total: amountPaid,
            }],
          },
        },
      });

      if (!isZelle && product.linkedCourseId) {
        const existingAccess = await prisma.userCourseAccess.findFirst({
          where: { userId: userId!, courseId: product.linkedCourseId },
        });

        if (!existingAccess) {
          await prisma.userCourseAccess.create({
            data: { userId: userId!, courseId: product.linkedCourseId },
          });

          const linkedCourse = await prisma.course.findUnique({ where: { id: product.linkedCourseId } });
          if (linkedCourse) {
            sendCoursePurchaseEmail(userEmail, userName, linkedCourse.title, amountPaid.toString(), order.orderNumber).catch(console.error);
          }
        }
      }

      responseData.orderId = order.id;
      responseData.isPending = isZelle;
    }

    const response = NextResponse.json(responseData);

    if (isNewUser && userId) {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
      );
      const newToken = await new SignJWT({ id: userId, role: 'Subscriber' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(secret);

      response.cookies.set('cms_session', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      });
    }

    return response;
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

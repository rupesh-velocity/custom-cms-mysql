import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { getStripeSettings } from '@/lib/stripe-server';
import { getSubscriptionPeriod, normalizeStripeStatus } from '@/lib/course-subscriptions';

export const dynamic = 'force-dynamic';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cms_session')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
    );
    const { payload } = await jwtVerify(token, secret);
    const userId = Number(payload.id);
    if (!userId) return null;

    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
  } catch {
    return null;
  }
}

function isAdminRole(role?: string | null) {
  return String(role || '').toLowerCase() === 'administrator';
}

function getStripePriceId(stripeSubscription: any) {
  return stripeSubscription?.items?.data?.[0]?.price?.id || null;
}

async function updateLocalSubscriptionFromStripe(subscriptionId: number, stripeSubscription: any) {
  const stripePeriod = getSubscriptionPeriod(stripeSubscription);

  return prisma.courseSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: normalizeStripeStatus(stripeSubscription.status),
      currentPeriodStart: stripePeriod.currentPeriodStart || undefined,
      currentPeriodEnd: stripePeriod.currentPeriodEnd || undefined,
      stripeCustomerId: stripeSubscription.customer ? String(stripeSubscription.customer) : undefined,
      stripePriceId: getStripePriceId(stripeSubscription) || undefined,
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
      canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
    },
    include: { user: true, course: true, courseAccessPlan: true },
  });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    const params = await context.params;
    const subscriptionId = Number(params.id);
    if (!subscriptionId) {
      return NextResponse.json({ success: false, error: 'Invalid subscription ID.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as 'cancel_at_period_end' | 'resume';

    if (!['cancel_at_period_end', 'resume'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid subscription action.' }, { status: 400 });
    }

    const subscription = await prisma.courseSubscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true, course: true, courseAccessPlan: true },
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Subscription not found.' }, { status: 404 });
    }

    const isAdmin = isAdminRole(currentUser.role);
    const isOwner = subscription.userId === currentUser.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ success: false, error: 'You do not have permission to manage this subscription.' }, { status: 403 });
    }

    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json({ success: false, error: 'Stripe subscription ID is missing.' }, { status: 400 });
    }

    const { stripe } = await getStripeSettings();

    const stripeSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: action === 'cancel_at_period_end',
      expand: ['items.data.price'],
    });

    const updated = await updateLocalSubscriptionFromStripe(subscription.id, stripeSubscription);

    return NextResponse.json({
      success: true,
      message: action === 'cancel_at_period_end' ? 'Auto renewal cancelled.' : 'Auto renewal resumed.',
      subscription: updated,
    });
  } catch (error: any) {
    console.error('Subscription update error:', error);

    const stripeMessage = error?.raw?.message || error?.message;
    return NextResponse.json(
      {
        success: false,
        error: stripeMessage || 'Unable to update subscription.',
      },
      { status: 500 }
    );
  }
}

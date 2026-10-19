import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const JWT_FALLBACK = 'fallback_super_secret_key_change_in_production';

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || JWT_FALLBACK);
}

function isAdminRole(role?: string | null) {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'admin' || normalized === 'administrator' || normalized === 'super_admin';
}

function subscriptionIsActive(status?: string | null) {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'ACTIVE' || normalized === 'TRIALING' || normalized === 'PAST_DUE' || normalized === 'UNPAID';
}

function getTimeValue(date?: Date | string | null) {
  if (!date) return 0;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function accessIsActive(expiresAt?: Date | string | null) {
  if (!expiresAt) return true;
  return getTimeValue(expiresAt) >= Date.now();
}

function subscriptionGivesAccess(subscription: any) {
  if (!subscriptionIsActive(subscription?.status)) return false;

  // Active auto-renew should grant access even when UserCourseAccess.expiresAt is old.
  if (!subscription?.cancelAtPeriodEnd) return true;

  // Cancelled-at-period-end subscriptions should still grant access until currentPeriodEnd.
  return getTimeValue(subscription?.currentPeriodEnd) >= Date.now();
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('cms_session')?.value;

    if (!token) {
      return NextResponse.json({ redirectUrl: '/login' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, getSecret());
    const userId = Number(payload.id || 0);

    if (!userId) {
      return NextResponse.json({ redirectUrl: '/login' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ redirectUrl: '/login' }, { status: 401 });
    }

    if (isAdminRole(user.role)) {
      return NextResponse.json({ redirectUrl: '/admin' });
    }

    const [subscriptions, accessRecords] = await Promise.all([
      prisma.courseSubscription.findMany({
        where: { userId },
        include: { course: { select: { id: true, slug: true } } },
        orderBy: [{ currentPeriodEnd: 'desc' }, { updatedAt: 'desc' }],
      }),
      prisma.userCourseAccess.findMany({
        where: { userId },
        include: { course: { select: { id: true, slug: true } } },
        orderBy: [{ expiresAt: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    const courseMap = new Map<number, { courseId: number; slug: string; priority: number }>();

    for (const subscription of subscriptions) {
      if (!subscription.course?.slug || !subscriptionGivesAccess(subscription)) continue;
      const priority = getTimeValue(subscription.currentPeriodEnd) || getTimeValue(subscription.updatedAt);
      const current = courseMap.get(subscription.courseId);
      if (!current || priority > current.priority) {
        courseMap.set(subscription.courseId, {
          courseId: subscription.courseId,
          slug: subscription.course.slug,
          priority,
        });
      }
    }

    for (const access of accessRecords) {
      if (!access.course?.slug || !accessIsActive(access.expiresAt)) continue;
      const priority = getTimeValue(access.expiresAt) || getTimeValue(access.updatedAt);
      const current = courseMap.get(access.courseId);
      if (!current || priority > current.priority) {
        courseMap.set(access.courseId, {
          courseId: access.courseId,
          slug: access.course.slug,
          priority,
        });
      }
    }

    const activeCourses = Array.from(courseMap.values()).sort((a, b) => b.priority - a.priority);

    if (activeCourses.length === 1) {
      return NextResponse.json({ redirectUrl: `/courses/${activeCourses[0].slug}` });
    }

    if (activeCourses.length > 1) {
      return NextResponse.json({ redirectUrl: '/my-account?tab=courses' });
    }

    return NextResponse.json({ redirectUrl: '/my-account' });
  } catch (error) {
    console.error('Login redirect error:', error);
    return NextResponse.json({ redirectUrl: '/my-account' });
  }
}

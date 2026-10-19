import { prisma } from '@/lib/prisma';
import { addMonths } from '@/lib/course-access';

export function normalizeStripeStatus(status?: string | null) {
  return (status || 'incomplete').toUpperCase();
}

export function stripeTimestampToDate(value?: number | null) {
  if (!value) return null;
  return new Date(value * 1000);
}

export function getSubscriptionPeriod(subscription: any) {
  const item = subscription?.items?.data?.[0] || null;
  const currentPeriodStart = stripeTimestampToDate(subscription?.current_period_start || item?.current_period_start);
  const currentPeriodEnd = stripeTimestampToDate(subscription?.current_period_end || item?.current_period_end);
  return { currentPeriodStart, currentPeriodEnd };
}

export async function grantOrExtendCourseAccess({
  userId,
  courseId,
  courseAccessPlanId = null,
  durationMonths,
  orderId = null,
  source = 'online',
  adminNote = null,
  forceExpiresAt = null,
}: {
  userId: number;
  courseId: number;
  courseAccessPlanId?: number | null;
  durationMonths?: number | null;
  orderId?: number | null;
  source?: string;
  adminNote?: string | null;
  forceExpiresAt?: Date | null;
}) {
  const now = new Date();
  const existingAccess = await prisma.userCourseAccess.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  let startsAt = existingAccess?.startsAt || now;
  let expiresAt: Date | null = null;

  if (forceExpiresAt) {
    expiresAt = forceExpiresAt;
  } else if (durationMonths && durationMonths > 0) {
    const existingExpiry = existingAccess?.expiresAt ? new Date(existingAccess.expiresAt) : null;
    const baseDate = existingExpiry && existingExpiry.getTime() > now.getTime() ? existingExpiry : now;
    expiresAt = addMonths(baseDate, durationMonths);
    if (!existingAccess || !existingAccess.expiresAt || existingExpiry!.getTime() <= now.getTime()) {
      startsAt = now;
    }
  }

  return prisma.userCourseAccess.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {
      courseAccessPlanId,
      startsAt,
      expiresAt,
      source,
      orderId,
      adminNote,
    },
    create: {
      userId,
      courseId,
      courseAccessPlanId,
      startsAt,
      expiresAt,
      source,
      orderId,
      adminNote,
    },
  });
}

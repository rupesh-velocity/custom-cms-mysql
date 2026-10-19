import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCourseAccessRenewalReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function getTargetDateWindow(daysFromNow: number) {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function isActiveAutoRenewSubscription(subscription: any) {
  if (!subscription) return false;

  const status = String(subscription.status || '').toUpperCase();
  const activeStatus = ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(status);
  const hasFutureAccess = !subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd).getTime() >= Date.now();

  return activeStatus && !subscription.cancelAtPeriodEnd && hasFutureAccess;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');

    if (!process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: 'CRON_SECRET is not configured.' },
        { status: 500 }
      );
    }

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { start, end } = getTargetDateWindow(15);

    const expiringAccess = await prisma.userCourseAccess.findMany({
      where: {
        expiresAt: {
          gte: start,
          lt: end,
        },
        renewalReminderSentAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        courseAccessPlan: true,
      },
    });

    const results: Array<{
      accessId: number;
      email: string;
      status: 'sent' | 'skipped' | 'failed';
      message?: string;
    }> = [];

    for (const access of expiringAccess) {
      const userEmail = access.user?.email;

      if (!userEmail) {
        results.push({
          accessId: access.id,
          email: '',
          status: 'skipped',
          message: 'User email missing',
        });
        continue;
      }

      const activeSubscription = await prisma.courseSubscription.findFirst({
        where: {
          userId: access.userId,
          courseId: access.courseId,
          cancelAtPeriodEnd: false,
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
          OR: [
            { currentPeriodEnd: null },
            { currentPeriodEnd: { gte: new Date() } },
          ],
        },
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      });

      if (isActiveAutoRenewSubscription(activeSubscription)) {
        results.push({
          accessId: access.id,
          email: userEmail,
          status: 'skipped',
          message: 'Active auto-renew subscription exists',
        });
        continue;
      }

      const userName =
        `${access.user.firstName || ''} ${access.user.lastName || ''}`.trim() ||
        access.user.username ||
        userEmail;

      const result = await sendCourseAccessRenewalReminderEmail({
        userEmail,
        userName,
        courseName: access.course.title,
        courseSlug: access.course.slug,
        planName: access.courseAccessPlan?.name || 'Course Access',
        expiresAt: access.expiresAt,
      });

      if (result.success) {
        await prisma.userCourseAccess.update({
          where: { id: access.id },
          data: {
            renewalReminderSentAt: new Date(),
          },
        });

        results.push({
          accessId: access.id,
          email: userEmail,
          status: 'sent',
        });
      } else {
        results.push({
          accessId: access.id,
          email: userEmail,
          status: 'failed',
          message: result.error instanceof Error ? result.error.message : 'Email failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      checkedWindow: {
        start,
        end,
      },
      found: expiringAccess.length,
      sent: results.filter((item) => item.status === 'sent').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      failed: results.filter((item) => item.status === 'failed').length,
      results,
    });
  } catch (error: any) {
    console.error('Course access reminder error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to process renewal reminders',
      },
      { status: 500 }
    );
  }
}

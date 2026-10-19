import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { notFound } from 'next/navigation';
import CourseViewerClient from './CourseViewerClient';
import CourseLandingClient from './CourseLandingClient';
import { generateFullMetadata } from '@/lib/seo-metadata';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug } });
  
  if (!course) {
    return { title: 'Course Not Found' };
  }

  return generateFullMetadata({
    title: course.title,
    rawTitle: course.title,
    description: course.contentText?.replace(/<[^>]*>?/gm, '').substring(0, 160) || '',
    rawContentText: course.contentText?.replace(/<[^>]*>?/gm, '').substring(0, 160) || '',
    image: course.featuredImage || '',
    type: 'website',
    url: `/courses/${slug}`,
  });
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  
  // 1. Fetch course details
  const course = await prisma.course.findUnique({
    where: { slug: resolvedParams.slug },
    include: { accessPlans: { orderBy: { sortOrder: 'asc' } } },
  });
  
  if (!course) {
    notFound();
  }

  // 2. Verify Authentication (Silently)
  const cookieStore = await cookies();
  const token = cookieStore.get('cms_session')?.value;
  
  let userId: number | null = null;
  let userRole = '';
  
  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
      );
      const { payload } = await jwtVerify(token, secret);
      userId = payload.id as number;
      userRole = String(payload.role || '');
    } catch (error) {
      // Invalid token, treat as unauthenticated
    }
  }

  // 3. Verify Access
  let hasAccess = ['Administrator', 'Admin'].includes(userRole);
  if (userId && !hasAccess) {
    const now = new Date();

    const access = await prisma.userCourseAccess.findFirst({
      where: {
        userId,
        courseId: course.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      }
    });

    if (access) {
      hasAccess = true;
    }

    // Active Stripe auto-renew subscriptions must also grant access.
    // This prevents an old UserCourseAccess.expiresAt value from blocking
    // users whose CourseSubscription is still ACTIVE and auto-renew is ON.
    if (!hasAccess) {
      const activeSubscription = await prisma.courseSubscription.findFirst({
        where: {
          userId,
          courseId: course.id,
          cancelAtPeriodEnd: false,
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID'] },
        },
        orderBy: [
          { currentPeriodEnd: 'desc' },
          { updatedAt: 'desc' },
        ],
      });

      if (activeSubscription) {
        hasAccess = true;
      }
    }

    // Cancelled auto-renew subscriptions should still grant access only until
    // their current paid period ends.
    if (!hasAccess) {
      const paidThroughSubscription = await prisma.courseSubscription.findFirst({
        where: {
          userId,
          courseId: course.id,
          currentPeriodEnd: { gt: now },
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID'] },
        },
        orderBy: [
          { currentPeriodEnd: 'desc' },
          { updatedAt: 'desc' },
        ],
      });

      if (paidThroughSubscription) {
        hasAccess = true;
      }
    }
  }

  return (
    <div className="flex flex-col w-full min-h-screen">
      {hasAccess ? (
        <CourseViewerClient course={course} />
      ) : (
        <CourseLandingClient course={course} />
      )}
    </div>
  );
}

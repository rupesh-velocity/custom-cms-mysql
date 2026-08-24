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
    where: { slug: resolvedParams.slug }
  });
  
  if (!course) {
    notFound();
  }

  // 2. Verify Authentication (Silently)
  const cookieStore = await cookies();
  const token = cookieStore.get('cms_session')?.value;
  
  let userId: number | null = null;
  
  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
      );
      const { payload } = await jwtVerify(token, secret);
      userId = payload.id as number;
    } catch (error) {
      // Invalid token, treat as unauthenticated
    }
  }

  // 3. Verify Access
  let hasAccess = false;
  if (userId) {
    const access = await prisma.userCourseAccess.findFirst({
      where: {
        userId: userId,
        courseId: course.id
      }
    });
    if (access) {
      hasAccess = true;
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

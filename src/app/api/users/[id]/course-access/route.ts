import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { addMonths } from '@/lib/course-access';

export async function GET(req: Request, context: any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const params = await context.params;
    const userId = Number(params.id);
    const access = await prisma.userCourseAccess.findMany({
      where: { userId },
      include: {
        course: { select: { id: true, title: true, slug: true, featuredImage: true } },
        courseAccessPlan: true,
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(access);
  } catch (error) {
    console.error('Course access fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch course access' }, { status: 500 });
  }
}

export async function POST(req: Request, context: any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const params = await context.params;
    const userId = Number(params.id);
    const data = await req.json();

    if (data.action === 'remove') {
      const accessId = Number(data.accessId);
      await prisma.userCourseAccess.deleteMany({ where: { id: accessId, userId } });
      return NextResponse.json({ success: true });
    }

    const courseId = Number(data.courseId);
    const planId = data.courseAccessPlanId ? Number(data.courseAccessPlanId) : null;
    if (!courseId) return NextResponse.json({ error: 'Course is required.' }, { status: 400 });

    const course = await prisma.course.findUnique({ where: { id: courseId }, include: { accessPlans: { where: { isActive: true } } } });
    if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 });

    const requiresPlan = course.pricingType === 'VARIABLE' && course.accessPlans.length > 0;
    const selectedPlan = planId ? course.accessPlans.find((plan) => plan.id === planId) : null;
    if (requiresPlan && !selectedPlan) return NextResponse.json({ error: 'Select a valid course variation/access plan.' }, { status: 400 });

    const startsAt = data.startsAt ? new Date(data.startsAt) : new Date();
    const expiresAt = selectedPlan ? addMonths(startsAt, selectedPlan.durationMonths) : null;

    const access = await prisma.userCourseAccess.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {
        courseAccessPlanId: selectedPlan?.id || null,
        startsAt,
        expiresAt,
        source: data.source === 'free' ? 'free' : 'manual',
        adminNote: data.adminNote || null,
      },
      create: {
        userId,
        courseId,
        courseAccessPlanId: selectedPlan?.id || null,
        startsAt,
        expiresAt,
        source: data.source === 'free' ? 'free' : 'manual',
        adminNote: data.adminNote || null,
      },
      include: { course: true, courseAccessPlan: true },
    });

    return NextResponse.json(access);
  } catch (error: any) {
    console.error('Course access update error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update course access' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';

function normalizeAccessPlans(input: any[] | undefined) {
  if (!Array.isArray(input)) return [];
  return input
    .map((plan, index) => ({
      id: plan.id ? Number(plan.id) : undefined,
      name: String(plan.name || '').trim(),
      durationMonths: Number(plan.durationMonths || 0),
      regularPrice: Number(plan.regularPrice || 0),
      salePrice: plan.salePrice === '' || plan.salePrice === null || plan.salePrice === undefined ? null : Number(plan.salePrice),
      isActive: plan.isActive !== false,
      isDefault: !!plan.isDefault,
      sortOrder: Number.isFinite(Number(plan.sortOrder)) ? Number(plan.sortOrder) : index,
    }))
    .filter((plan) => plan.name && plan.durationMonths > 0 && plan.regularPrice >= 0);
}

async function syncCourseAccessPlans(courseId: number, pricingType: string, input: any[] | undefined) {
  const plans = pricingType === 'VARIABLE' ? normalizeAccessPlans(input) : [];

  if (pricingType !== 'VARIABLE') {
    await prisma.courseAccessPlan.updateMany({ where: { courseId }, data: { isActive: false, isDefault: false } });
    return;
  }

  const defaultIndex = plans.findIndex((plan) => plan.isDefault);
  if (plans.length && defaultIndex === -1) plans[0].isDefault = true;
  if (defaultIndex !== -1) plans.forEach((plan, index) => { plan.isDefault = index === defaultIndex; });

  const existing = await prisma.courseAccessPlan.findMany({ where: { courseId }, select: { id: true } });
  const keepIds = plans.filter((plan) => plan.id).map((plan) => Number(plan.id));
  const disableIds = existing.map((item) => item.id).filter((id) => !keepIds.includes(id));
  if (disableIds.length) {
    await prisma.courseAccessPlan.updateMany({ where: { id: { in: disableIds }, courseId }, data: { isActive: false, isDefault: false } });
  }

  for (const [index, plan] of plans.entries()) {
    const data = {
      name: plan.name,
      durationMonths: plan.durationMonths,
      regularPrice: plan.regularPrice,
      salePrice: plan.salePrice,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      sortOrder: index,
    };
    if (plan.id && existing.some((item) => item.id === plan.id)) {
      await prisma.courseAccessPlan.update({ where: { id: plan.id }, data });
    } else {
      await prisma.courseAccessPlan.create({ data: { ...data, courseId } });
    }
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const course = await prisma.course.findUnique({
      where: { id: parseInt(resolvedParams.id) },
      include: { accessPlans: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const { title, contentHtml, contentText, videos, metaDescription, focusKeyword, slug, status, featuredImage, createdAt, price, salePrice, pricingType, accessPlans } = await req.json();
    const selectedPricingType = pricingType === 'VARIABLE' ? 'VARIABLE' : 'SIMPLE';

    await prisma.course.update({
      where: { id },
      data: {
        title,
        slug: slug || slugify(title, { lower: true, strict: true }),
        contentHtml,
        contentText,
        videos: videos || [],
        metaDescription,
        focusKeyword,
        status: status || 'Draft',
        pricingType: selectedPricingType,
        price: price || 0,
        salePrice: salePrice || null,
        featuredImage,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      }
    });

    await syncCourseAccessPlans(id, selectedPricingType, accessPlans);

    const course = await prisma.course.findUnique({ where: { id }, include: { accessPlans: { orderBy: { sortOrder: 'asc' } } } });
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await req.json();
    const course = await prisma.course.update({
      where: { id: parseInt(resolvedParams.id) },
      data: { status: data.status }
    });
    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update course status' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    await prisma.course.delete({ where: { id: parseInt(resolvedParams.id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

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

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: { accessPlans: { orderBy: { sortOrder: 'asc' } } },
    });
    return NextResponse.json(courses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, contentHtml, contentText, videos, metaDescription, focusKeyword, slug, status, featuredImage, createdAt, price, salePrice, pricingType, accessPlans } = await req.json();
    const selectedPricingType = pricingType === 'VARIABLE' ? 'VARIABLE' : 'SIMPLE';
    let generatedSlug = slug || slugify(title, { lower: true, strict: true });

    const cookieStore = await cookies();
    const token = cookieStore.get('cms_session')?.value;
    let authorId: any = null;

    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production');
        const { payload } = await jwtVerify(token, secret);
        if (payload && payload.id) authorId = payload.id;
      } catch (e) {}
    }

    let uniqueSlug = generatedSlug;
    let counter = 1;
    while (await prisma.course.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${generatedSlug}-${counter}`;
      counter++;
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug: uniqueSlug,
        contentHtml: contentHtml || '',
        contentText: contentText || '',
        videos: videos || [],
        metaDescription: metaDescription || '',
        focusKeyword: focusKeyword || '',
        status: status || 'Draft',
        pricingType: selectedPricingType,
        price: price || 0,
        salePrice: salePrice || null,
        featuredImage: featuredImage || null,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        authorId: authorId ? Number(authorId) : undefined,
      }
    });

    await syncCourseAccessPlans(course.id, selectedPricingType, accessPlans);

    const fullCourse = await prisma.course.findUnique({ where: { id: course.id }, include: { accessPlans: { orderBy: { sortOrder: 'asc' } } } });
    return NextResponse.json(fullCourse);
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}

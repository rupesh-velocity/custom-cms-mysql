import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { normalizePostCarouselImages, normalizePostCarouselSettings } from '@/lib/post-carousel';

async function validCarouselImages(value: unknown) {
  const normalized = normalizePostCarouselImages(value);
  if (!normalized.length) return [];

  const existing = await prisma.media.findMany({
    where: { id: { in: normalized.map((item) => item.mediaId) } },
    select: { id: true },
  });
  const validIds = new Set(existing.map((item) => item.id));
  return normalized.filter((item) => validIds.has(item.mediaId));
}

export async function POST(req: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await req.json();
    const carouselImages = await validCarouselImages(data.carouselImages);
    const carouselSettings = normalizePostCarouselSettings({
      heading: data.carouselHeading,
      slidesPerView: data.carouselSlidesPerView,
      autoplay: data.carouselAutoplay ?? true,
      autoplayDelay: data.carouselAutoplayDelay,
      pagination: data.carouselPagination ?? true,
    });

    let authorId: any = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('cms_session')?.value;
      if (token) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production');
        const { payload } = await jwtVerify(token, secret);
        authorId = payload.id as number;
      }
    } catch (e) {}

    if (!authorId) {
      const firstUser = await prisma.user.findFirst();
      authorId = firstUser?.id || null;
    }

    let finalSlug = data.slug;
    let counter = 1;
    while (await prisma.post.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${data.slug}-${counter}`;
      counter++;
    }

    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug: finalSlug,
        contentHtml: data.contentHtml,
        contentText: data.contentText,
        metaDescription: data.metaDescription,
        focusKeyword: data.focusKeyword,
        seoTitle: data.seoTitle,
        redirectUrl: data.redirectUrl,
        redirectType: data.redirectType,
        noIndex: data.noIndex || false,
        seoRobots: data.seoRobots !== undefined ? data.seoRobots : null,
        seoAdvancedRobots: data.seoAdvancedRobots !== undefined ? data.seoAdvancedRobots : null,
        status: data.status || 'Draft',
        visibility: data.visibility || 'Public',
        password: data.password || null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        schemaJson: data.schemaJson || null,
        seoScore: data.seoScore || 0,
        isPillar: data.isPillar || false,
        authorId: authorId,
        featuredImage: data.featuredImage || null,
        carouselHeading: carouselSettings.heading,
        carouselSlidesPerView: carouselSettings.slidesPerView,
        carouselAutoplay: carouselSettings.autoplay,
        carouselAutoplayDelay: carouselSettings.autoplayDelay,
        carouselPagination: carouselSettings.pagination,
        ...(data.categoryIds !== undefined && {
          categories: {
            connect: data.categoryIds.map((id: number) => ({ id }))
          }
        }),
        ...(data.tagIds !== undefined && {
          tags: {
            connect: data.tagIds.map((id: number) => ({ id }))
          }
        }),
        ...(carouselImages.length > 0 && {
          carouselImages: {
            create: carouselImages.map((item, index) => ({
              media: { connect: { id: item.mediaId } },
              sortOrder: index,
              caption: item.caption,
            })),
          },
        }),
      },
    });
    return NextResponse.json(post);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error creating post' }, { status: 500 });
  }
}

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    include: { categories: true, tags: true },
  });
  return NextResponse.json(posts);
}

import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { maybeCreateRevision } from '@/lib/revisions';
import {
  normalizePostCarouselImages,
  normalizeCarouselHeading,
  normalizeCarouselSlidesPerView,
  normalizeCarouselAutoplay,
  normalizeCarouselAutoplayDelay,
  normalizeCarouselPagination,
} from '@/lib/post-carousel';

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

export async function GET(req: Request, context: any) {
  try {
    const params = await context.params;
    const post = await prisma.post.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        categories: true,
        tags: true,
        carouselImages: {
          orderBy: { sortOrder: 'asc' },
          include: { media: true },
        },
      },
    });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Error fetching post', details: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const params = await context.params;
    const postId = parseInt(params.id);
    const data = await req.json();
    const carouselImages = data.carouselImages !== undefined
      ? await validCarouselImages(data.carouselImages)
      : undefined;

    const current = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        categories: true,
        tags: true,
        carouselImages: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (current) await maybeCreateRevision('post', postId, current);

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        title: data.title,
        slug: data.slug,
        contentHtml: data.contentHtml,
        contentText: data.contentText,
        metaDescription: data.metaDescription,
        focusKeyword: data.focusKeyword,
        seoTitle: data.seoTitle,
        redirectUrl: data.redirectUrl,
        redirectType: data.redirectType,
        noIndex: data.noIndex,
        seoRobots: data.seoRobots !== undefined ? data.seoRobots : undefined,
        seoAdvancedRobots: data.seoAdvancedRobots !== undefined ? data.seoAdvancedRobots : undefined,
        status: data.status,
        visibility: data.visibility,
        password: data.password,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        schemaJson: data.schemaJson || null,
        seoScore: data.seoScore !== undefined ? data.seoScore : undefined,
        isPillar: data.isPillar !== undefined ? data.isPillar : undefined,
        featuredImage: data.featuredImage,
        carouselHeading: data.carouselHeading !== undefined ? normalizeCarouselHeading(data.carouselHeading) : undefined,
        carouselSlidesPerView: data.carouselSlidesPerView !== undefined ? normalizeCarouselSlidesPerView(data.carouselSlidesPerView) : undefined,
        carouselAutoplay: data.carouselAutoplay !== undefined ? normalizeCarouselAutoplay(data.carouselAutoplay) : undefined,
        carouselAutoplayDelay: data.carouselAutoplayDelay !== undefined ? normalizeCarouselAutoplayDelay(data.carouselAutoplayDelay) : undefined,
        carouselPagination: data.carouselPagination !== undefined ? normalizeCarouselPagination(data.carouselPagination) : undefined,
        ...(data.categoryIds !== undefined && {
          categories: {
            set: data.categoryIds.map((id: number) => ({ id }))
          }
        }),
        ...(data.tagIds !== undefined && {
          tags: {
            set: data.tagIds.map((id: number) => ({ id }))
          }
        }),
        ...(carouselImages !== undefined && {
          carouselImages: {
            deleteMany: {},
            create: carouselImages.map((item, index) => ({
              media: { connect: { id: item.mediaId } },
              sortOrder: index,
              caption: item.caption,
            })),
          },
        }),
      },
      include: {
        categories: true,
        tags: true,
        carouselImages: {
          orderBy: { sortOrder: 'asc' },
          include: { media: true },
        },
      },
    });
    return NextResponse.json(post);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error updating post' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const params = await context.params;
    await prisma.post.delete({
      where: { id: parseInt(params.id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error deleting post' }, { status: 500 });
  }
}

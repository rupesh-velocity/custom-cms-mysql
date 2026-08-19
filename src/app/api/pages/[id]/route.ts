import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: any) {
  try {
    const params = await context.params;
    const page = await prisma.page.findUnique({
      where: { id: parseInt(params.id) },
    });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error fetching page' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const params = await context.params;
    const data = await req.json();
    const page = await prisma.page.update({
      where: { id: parseInt(params.id) },
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
        hideTitle: data.hideTitle || false,
        schemaJson: data.schemaJson || null,
        seoScore: data.seoScore !== undefined ? data.seoScore : undefined,
        isPillar: data.isPillar !== undefined ? data.isPillar : undefined,
        featuredImage: data.featuredImage,
        heroDescription: data.heroDescription,
      },
    });
    return NextResponse.json(page);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Error updating page' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const params = await context.params;
    await prisma.page.delete({
      where: { id: parseInt(params.id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error deleting page' }, { status: 500 });
  }
}

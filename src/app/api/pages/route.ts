import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
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
    while (await prisma.page.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${data.slug}-${counter}`;
      counter++;
    }

    const page = await prisma.page.create({
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
        status: data.status || 'Draft',
        visibility: data.visibility || 'Public',
        password: data.password || null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        hideTitle: data.hideTitle || false,
        schemaJson: data.schemaJson || null,
        seoScore: data.seoScore || 0,
        isPillar: data.isPillar || false,
        author: authorId ? { connect: { id: authorId } } : undefined,
        featuredImage: data.featuredImage || null,
        heroDescription: data.heroDescription || null,
      },
    });
    return NextResponse.json(page);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Error creating page' }, { status: 500 });
  }
}

export async function GET() {
  const pages = await prisma.page.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(pages);
}

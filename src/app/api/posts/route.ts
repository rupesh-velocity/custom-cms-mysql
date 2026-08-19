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
        status: data.status || 'Draft',
        visibility: data.visibility || 'Public',
        password: data.password || null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        schemaJson: data.schemaJson || null,
        seoScore: data.seoScore || 0,
        isPillar: data.isPillar || false,
        authorId: authorId,
        featuredImage: data.featuredImage || null,
        ...(data.categoryIds !== undefined && {
          categories: {
            connect: data.categoryIds.map((id: number) => ({ id }))
          }
        }),
        ...(data.tagIds !== undefined && {
          tags: {
            connect: data.tagIds.map((id: number) => ({ id }))
          }
        })
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

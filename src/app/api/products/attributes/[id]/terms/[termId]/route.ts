import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string, termId: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await request.json();
    const { name, slug, description } = data;
    const finalSlug = slug ? slugify(slug, { lower: true }) : undefined;

    const term = await prisma.globalAttributeTerm.update({
      where: { id: parseInt(resolvedParams.termId) },
      data: {
        ...(name && { name }),
        ...(finalSlug && { slug: finalSlug }),
        ...(description !== undefined && { description })
      }
    });

    return NextResponse.json(term);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, termId: string }> }) {
  try {
    const resolvedParams = await params;
    await prisma.globalAttributeTerm.delete({
      where: { id: parseInt(resolvedParams.termId) }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

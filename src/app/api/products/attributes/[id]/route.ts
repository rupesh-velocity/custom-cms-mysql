import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const attribute = await prisma.globalAttribute.findUnique({
      where: { id: parseInt(resolvedParams.id) },
      include: { terms: true }
    });
    
    if (!attribute) {
      return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });
    }
    
    return NextResponse.json(attribute);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await request.json();
    const { name, slug } = data;
    const finalSlug = slug ? slugify(slug, { lower: true }) : undefined;

    const attribute = await prisma.globalAttribute.update({
      where: { id: parseInt(resolvedParams.id) },
      data: {
        ...(name && { name }),
        ...(finalSlug && { slug: finalSlug })
      }
    });

    return NextResponse.json(attribute);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    await prisma.globalAttribute.delete({
      where: { id: parseInt(resolvedParams.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    const data = await req.json();

    let slug = data.slug;
    if (!slug && data.name) {
      slug = slugify(data.name, { lower: true, strict: true });
    }

    // Ensure slug uniqueness (except for the current category)
    if (slug) {
      const existing = await prisma.category.findUnique({
        where: { slug }
      });
      if (existing && existing.id !== id) {
        slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        slug: slug !== undefined ? slug : undefined,
        description: data.description !== undefined ? data.description : undefined,
        parentId: data.parentId !== undefined ? (data.parentId ? parseInt(data.parentId, 10) : null) : undefined,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error updating category' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    
    // Check if category exists
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await prisma.category.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error deleting category' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const course = await prisma.course.findUnique({
      where: { id: parseInt(resolvedParams.id) }
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
    const { title, contentHtml, contentText, videos, metaDescription, focusKeyword, slug, status, featuredImage, createdAt, price, salePrice } = await req.json();
    
    const course = await prisma.course.update({
      where: { id: parseInt(resolvedParams.id) },
      data: {
        title: title,
        slug: slug || slugify(title, { lower: true, strict: true }),
        contentHtml: contentHtml,
        contentText: contentText,
        videos: videos || [],
        metaDescription,
        focusKeyword,
        status: status || 'Draft',
        price: price || 0,
        salePrice: salePrice || null,
        featuredImage,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      }
    });

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
    await prisma.course.delete({
      where: { id: parseInt(resolvedParams.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}

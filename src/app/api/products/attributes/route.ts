import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';

export async function GET() {
  try {
    const attributes = await prisma.globalAttribute.findMany({
      include: {
        terms: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    return NextResponse.json(attributes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, slug } = data;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const finalSlug = slug ? slugify(slug, { lower: true }) : slugify(name, { lower: true });

    // Ensure uniqueness
    const existing = await prisma.globalAttribute.findUnique({
      where: { slug: finalSlug }
    });

    if (existing) {
      return NextResponse.json({ error: 'Attribute with this slug already exists' }, { status: 400 });
    }

    const attribute = await prisma.globalAttribute.create({
      data: {
        name,
        slug: finalSlug
      }
    });

    return NextResponse.json(attribute);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

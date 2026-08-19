import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import slugify from 'slugify';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const terms = await prisma.globalAttributeTerm.findMany({
      where: { attributeId: parseInt(resolvedParams.id) },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(terms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await request.json();
    const { name, slug, description } = data;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let finalSlug = slug ? slugify(slug, { lower: true }) : slugify(name, { lower: true });

    // Ensure uniqueness for the slug globally among terms
    let existing = await prisma.globalAttributeTerm.findUnique({
      where: { slug: finalSlug }
    });
    
    let counter = 1;
    let uniqueSlug = finalSlug;
    while(existing) {
      uniqueSlug = `${finalSlug}-${counter}`;
      existing = await prisma.globalAttributeTerm.findUnique({
        where: { slug: uniqueSlug }
      });
      counter++;
    }

    const term = await prisma.globalAttributeTerm.create({
      data: {
        attributeId: parseInt(resolvedParams.id),
        name,
        slug: uniqueSlug,
        description
      }
    });

    return NextResponse.json(term);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

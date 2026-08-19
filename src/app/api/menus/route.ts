import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const menus = await prisma.menu.findMany({
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(menus);
  } catch (error) {
    console.error('Error fetching menus:', error);
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, slug } = await req.json();
    
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const menu = await prisma.menu.create({
      data: { name, slug },
    });
    
    return NextResponse.json(menu, { status: 201 });
  } catch (error: any) {
    console.error('Error creating menu:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A menu with this slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const redirections = await prisma.redirection.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(redirections);
  } catch (error) {
    console.error('Error fetching redirections:', error);
    return NextResponse.json({ error: 'Failed to fetch redirections' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const redirection = await prisma.redirection.create({
      data: {
        sourceUrl: data.sourceUrl,
        ignoreCase: data.ignoreCase || false,
        destinationUrl: data.destinationUrl,
        redirectType: data.redirectType || '301',
        status: data.status !== undefined ? data.status : true,
      }
    });

    return NextResponse.json(redirection);
  } catch (error) {
    console.error('Error creating redirection:', error);
    return NextResponse.json({ error: 'Failed to create redirection' }, { status: 500 });
  }
}

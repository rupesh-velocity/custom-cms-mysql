import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const redirections = await prisma.redirection.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(redirections, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error) {
    console.error('Error fetching redirections:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch redirections' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const redirection = await prisma.redirection.update({
      where: { id: parseInt(id) },
      data: {
        sourceUrl: data.sourceUrl,
        ignoreCase: data.ignoreCase,
        destinationUrl: data.destinationUrl,
        redirectType: data.redirectType,
        status: data.status,
        isTrashed: data.isTrashed !== undefined ? data.isTrashed : undefined,
      }
    });

    return NextResponse.json(redirection);
  } catch (error) {
    console.error('Error updating redirection:', error);
    return NextResponse.json({ error: 'Failed to update redirection', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.redirection.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting redirection:', error);
    return NextResponse.json({ error: 'Failed to delete redirection' }, { status: 500 });
  }
}

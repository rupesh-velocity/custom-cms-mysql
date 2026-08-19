import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const form = await prisma.form.findUnique({
      where: { id: parseInt(resolvedParams.id) }
    });
    if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(form);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await req.json();
    const form = await prisma.form.update({
      where: { id: parseInt(resolvedParams.id) },
      data: {
        title: data.title,
        fields: typeof data.fields === 'string' ? data.fields : JSON.stringify(data.fields),
        settings: typeof data.settings === 'string' ? data.settings : JSON.stringify(data.settings),
        notificationEmail: data.notificationEmail,
        status: data.status
      }
    });
    return NextResponse.json(form);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await req.json();
    const form = await prisma.form.update({
      where: { id: parseInt(resolvedParams.id) },
      data: { status: data.status }
    });
    return NextResponse.json(form);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    await prisma.form.delete({
      where: { id: parseInt(resolvedParams.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

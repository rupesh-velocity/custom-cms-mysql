import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function GET() {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: true }
    });
    return NextResponse.json(forms);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Auth
    const token = (await cookies()).get('auth-token')?.value;
    let authorId: any = null;
    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret');
        const { payload } = await jwtVerify(token, secret);
        if (payload.id) {
          authorId = parseInt(payload.id as string);
        }
      } catch (e) {}
    }

    if (data.id) {
      // It's an update!
      const updatedForm = await prisma.form.update({
        where: { id: parseInt(data.id) },
        data: {
          title: data.title,
          fields: typeof data.fields === 'string' ? data.fields : JSON.stringify(data.fields),
          settings: typeof data.settings === 'string' ? data.settings : JSON.stringify(data.settings),
          notificationEmail: data.notificationEmail,
          status: data.status
        }
      });
      return NextResponse.json(updatedForm);
    }

    const form = await prisma.form.create({
      data: {
        title: data.title || 'Untitled Form',
        shortcode: `[form id="TEMP"]`,
        fields: typeof data.fields === 'string' ? data.fields : JSON.stringify(data.fields || []),
        settings: typeof data.settings === 'string' ? data.settings : JSON.stringify(data.settings || {}),
        notificationEmail: data.notificationEmail || null,
        status: data.status || 'Published',
        authorId
      }
    });

    const updatedForm = await prisma.form.update({
      where: { id: form.id },
      data: { shortcode: `[form id="${form.id}"]` }
    });

    return NextResponse.json(updatedForm);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
  }
}
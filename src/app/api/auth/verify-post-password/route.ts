import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { id, password, type, redirectUrl } = await req.json();

    if (!id || !password || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let item;
    if (type === 'post') {
      item = await prisma.post.findUnique({ where: { id: parseInt(id) } });
    } else {
      item = await prisma.page.findUnique({ where: { id: parseInt(id) } });
    }

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (item.password !== password) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(`post_pass_${id}`, password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 10 // 10 days
    });

    return NextResponse.json({ success: true, redirectUrl: redirectUrl || `/${item.slug}` });
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

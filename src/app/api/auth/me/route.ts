import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cms_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
    );
    const { payload } = await jwtVerify(token, secret);
    const userId = Number(payload.id || 0);

    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Always read the current profile from the database rather than relying on
    // the JWT snapshot. This keeps the admin header name/email in sync after a
    // profile edit and works identically for password and Twilio OTP logins.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth profile error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

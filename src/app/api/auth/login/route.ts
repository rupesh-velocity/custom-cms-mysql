import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { sendTwilioVerification } from '@/lib/twilio';
import { maskPhone, normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

const JWT_FALLBACK = 'fallback_super_secret_key_change_in_production';

function jwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || JWT_FALLBACK);
}

async function createSessionToken(user: { id: number; username: string; role: string }) {
  return new SignJWT({ id: user.id, username: user.username, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(jwtSecret());
}

async function twilioLoginEnabled() {
  const setting = await prisma.setting.findUnique({ where: { key: 'addon_twilio_enabled' } });
  return setting?.value === 'true';
}

async function recentOtpRetryAfter(phone: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('cms_otp_pending')?.value;
    if (!token) return 0;
    const { payload } = await jwtVerify(token, jwtSecret());
    if (payload.purpose !== 'otp' || normalizePhone(payload.phone) !== phone) return 0;
    const sentAt = Number(payload.sentAt || 0);
    if (!sentAt) return 0;
    const elapsed = Math.floor((Date.now() - sentAt) / 1000);
    return elapsed < 30 ? 30 - elapsed : 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    return NextResponse.json(
      { mode: (await twilioLoginEnabled()) ? 'both' : 'password' },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Login mode error:', error);
    return NextResponse.json({ error: 'Could not load login configuration.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const usePhoneOtp = Boolean(data.phone);

    if (usePhoneOtp) {
      const phone = normalizePhone(data.phone);
      if (!phone) {
        return NextResponse.json(
          { error: 'Enter a valid mobile number including country code, for example +15551234567.' },
          { status: 400 }
        );
      }

      // Phone was added after the original CMS schema and may contain legacy formatting.
      // Compare normalized values so "+1 555..." and "+1555..." resolve to the same account.
      const phoneUsers = await prisma.user.findMany({
        where: { phone: { not: null } },
        select: { id: true, username: true, role: true, phone: true },
      });
      const matches = phoneUsers.filter((user) => normalizePhone(user.phone) === phone);

      if (matches.length === 0) {
        return NextResponse.json({ error: 'No account found with this phone number.' }, { status: 404 });
      }
      if (matches.length > 1) {
        return NextResponse.json(
          { error: 'This phone number is assigned to more than one account. Please contact an administrator.' },
          { status: 409 }
        );
      }

      const user = matches[0];
      const retryAfter = await recentOtpRetryAfter(phone);
      if (retryAfter > 0) {
        return NextResponse.json(
          { error: `Please wait ${retryAfter} seconds before requesting another code.`, retryAfter },
          { status: 429 }
        );
      }

      await sendTwilioVerification(phone);

      const pending = await new SignJWT({
        id: user.id,
        username: user.username,
        role: user.role,
        phone,
        purpose: 'otp',
        sentAt: Date.now(),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('10m')
        .sign(jwtSecret());

      const response = NextResponse.json({
        success: true,
        requiresOtp: true,
        phoneHint: maskPhone(phone),
        resendAfter: 30,
      });
      response.cookies.set('cms_otp_pending', pending, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10,
        path: '/',
      });
      return response;
    }

    const { username, password } = data;
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createSessionToken(user);
    const response = NextResponse.json({ success: true, requiresOtp: false });
    response.cookies.set('cms_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

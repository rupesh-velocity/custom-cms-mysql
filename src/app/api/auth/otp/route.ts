import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { checkTwilioVerification, sendTwilioVerification } from '@/lib/twilio';
import { normalizePhone } from '@/lib/phone';

const JWT_FALLBACK = 'fallback_super_secret_key_change_in_production';
const RESEND_SECONDS = 30;

function secretKey() {
  return new TextEncoder().encode(process.env.JWT_SECRET || JWT_FALLBACK);
}

async function readPending() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cms_otp_pending')?.value;
  if (!token) throw new Error('Your verification session has expired. Please start again.');
  const secret = secretKey();
  const { payload } = await jwtVerify(token, secret);
  if (payload.purpose !== 'otp' || !payload.id || !payload.phone) {
    throw new Error('Invalid verification session.');
  }
  return { payload, secret };
}

function setPendingCookie(response: NextResponse, token: string) {
  response.cookies.set('cms_otp_pending', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });
}

export async function POST(req: Request) {
  try {
    const { code, action } = await req.json();
    const { payload, secret } = await readPending();
    const phone = normalizePhone(String(payload.phone));
    if (!phone) throw new Error('Invalid phone number in verification session.');

    if (action === 'resend') {
      const sentAt = Number(payload.sentAt || 0);
      const elapsedSeconds = sentAt ? Math.floor((Date.now() - sentAt) / 1000) : RESEND_SECONDS;
      if (elapsedSeconds < RESEND_SECONDS) {
        const retryAfter = RESEND_SECONDS - elapsedSeconds;
        return NextResponse.json(
          { error: `Please wait ${retryAfter} seconds before requesting another code.`, retryAfter },
          { status: 429 }
        );
      }

      await sendTwilioVerification(phone);
      const pending = await new SignJWT({
        id: payload.id,
        username: payload.username,
        role: payload.role,
        phone,
        purpose: 'otp',
        sentAt: Date.now(),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('10m')
        .sign(secret);

      const response = NextResponse.json({ success: true, resent: true, resendAfter: RESEND_SECONDS });
      setPendingCookie(response, pending);
      return response;
    }

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
    }

    const approved = await checkTwilioVerification(phone, String(code));
    if (!approved) {
      return NextResponse.json({ error: 'Incorrect or expired verification code.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      select: { id: true, username: true, role: true, phone: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    // Do not complete a login if the account phone was changed while OTP verification was pending.
    if (normalizePhone(user.phone) !== phone) {
      return NextResponse.json(
        { error: 'The phone number on this account has changed. Please start again.' },
        { status: 401 }
      );
    }

    const session = await new SignJWT({ id: user.id, username: user.username, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    const response = NextResponse.json({ success: true });
    response.cookies.set('cms_session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    response.cookies.set('cms_otp_pending', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Verification failed.' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('cms_otp_pending', '', { maxAge: 0, path: '/' });
  return response;
}

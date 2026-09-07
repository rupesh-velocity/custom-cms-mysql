import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();

    const isAdmin = await isAdministratorSession();

    const sensitive = new Set([
      'smtp_pass','smtp_user','twilio_auth_token','twilio_account_sid','twilio_verify_service_sid',
      'google_reviews_api_key','stripe_secret_key','zelle_account_email','forms_recaptcha_secret_key'
    ]);

    const settingsObj = settings.reduce(
      (acc: Record<string, string>, setting) => {
        if (isAdmin || !sensitive.has(setting.key)) acc[setting.key] = setting.value || '';
        return acc;
      },
      {}
    );

    return NextResponse.json(settingsObj, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);

    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

export async function POST(req: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await req.json();

    const promises = Object.entries(data).map(([key, value]) => {
      return prisma.setting.upsert({
        where: { key },
        update: {
          value: String(value ?? ''),
        },
        create: {
          key,
          value: String(value ?? ''),
        },
      });
    });

    await Promise.all(promises);

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error saving settings:', error);

    return NextResponse.json(
      { error: 'Failed to save settings' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();

    const settingsObj = settings.reduce(
      (acc: Record<string, string>, setting) => {
        acc[setting.key] = setting.value;
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
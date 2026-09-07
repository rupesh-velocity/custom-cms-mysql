import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const groups: Record<string, string[]> = {
  advanced: ['custom_css', 'head_scripts', 'body_scripts', 'custom_js'],
  analytics: ['analytics_head_code', 'analytics_body_code'],
};

function keysForGroup(group: string | null) {
  return groups[group || ''] || [];
}

function encode(value: string | null | undefined) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64');
}

function decode(value: unknown) {
  if (typeof value !== 'string') return '';
  return Buffer.from(value, 'base64').toString('utf8');
}

export async function GET(request: Request) {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = new URL(request.url).searchParams.get('group');
  const keys = keysForGroup(group);
  if (!keys.length) {
    return NextResponse.json({ error: 'Invalid code-settings group' }, { status: 400 });
  }

  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const values: Record<string, string> = {};
    keys.forEach((key) => { values[key] = ''; });
    rows.forEach((row) => { values[row.key] = encode(row.value); });

    return NextResponse.json({ values }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Failed to load code settings:', error);
    return NextResponse.json({ error: 'Failed to load code settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const group = String(body?.group || '');
    const keys = keysForGroup(group);
    if (!keys.length) {
      return NextResponse.json({ error: 'Invalid code-settings group' }, { status: 400 });
    }

    const incoming = body?.values && typeof body.values === 'object' ? body.values : {};
    const decoded: Record<string, string> = {};

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(incoming, key)) {
        decoded[key] = decode(incoming[key]);
      }
    }

    await Promise.all(Object.entries(decoded).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    ));

    // Read back from the DB before returning so the client can verify persistence,
    // not merely that the request reached the API.
    const savedRows = await prisma.setting.findMany({ where: { key: { in: Object.keys(decoded) } } });
    const saved: Record<string, string> = {};
    savedRows.forEach((row) => { saved[row.key] = encode(row.value); });

    return NextResponse.json({ success: true, values: saved }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Failed to save code settings:', error);
    return NextResponse.json({ error: 'Failed to save code settings' }, { status: 500 });
  }
}

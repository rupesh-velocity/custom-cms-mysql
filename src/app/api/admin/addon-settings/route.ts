import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedKeys = new Set([
  // Add-on toggles
  'addon_google_reviews_enabled',
  'addon_backup_restore_enabled',
  'addon_maintenance_enabled',
  'addon_analytics_enabled',
  'addon_cookie_consent_enabled',
  'addon_image_optimization_enabled',
  'addon_popup_builder_enabled',
  'addon_twilio_enabled',
  'addon_import_export_enabled',
  'addon_smtp_enabled',
  'enable_physical_products',

  // Google Reviews
  'google_reviews_api_key',
  'google_reviews_place_id',
  'google_reviews_cache_hours',
  'google_reviews_max',

  // Maintenance
  'maintenance_title',
  'maintenance_message',

  // Analytics / Tracking
  'analytics_ga4_id',
  'analytics_gtm_id',

  // Cookie Consent
  'cookie_consent_message',
  'cookie_accept_text',
  'cookie_reject_text',
  'cookie_privacy_url',
  'cookie_position',

  // Image Optimization
  'image_optimize_new_uploads',
  'image_convert_webp',
  'image_keep_originals',
  'image_quality',
  'image_max_width',

  // Twilio
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_verify_service_sid',
  'twilio_channel',

  // SMTP
  'smtp_host',
  'smtp_port',
  'smtp_secure_mode',
  'smtp_auth_mode',
  'smtp_user',
  'smtp_pass',
  'smtp_from_email',
  'smtp_from_name',
  'smtp_reply_to',
  'smtp_reject_unauthorized',
]);

function encode(value: string | null | undefined) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64');
}

function decode(value: unknown) {
  if (typeof value !== 'string') return '';
  return Buffer.from(value, 'base64').toString('utf8');
}

function responseEntries(rows: Array<{ key: string; value: string | null }>) {
  return rows.map((row) => ({ k: encode(row.key), v: encode(row.value) }));
}

export async function GET() {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Array.from(allowedKeys) } },
      orderBy: { key: 'asc' },
    });

    return NextResponse.json(
      { entries: responseEntries(rows) },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Failed to load add-on settings:', error);
    return NextResponse.json({ error: 'Failed to load add-on settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawEntries = Array.isArray(body?.entries) ? body.entries : [];
    if (!rawEntries.length) {
      return NextResponse.json({ error: 'No settings supplied' }, { status: 400 });
    }

    const decoded = new Map<string, string>();
    for (const entry of rawEntries) {
      const key = decode(entry?.k);
      const value = decode(entry?.v);
      if (!allowedKeys.has(key)) {
        return NextResponse.json({ error: `Unsupported add-on setting: ${key || 'unknown'}` }, { status: 400 });
      }
      decoded.set(key, value);
    }

    await prisma.$transaction(
      Array.from(decoded.entries()).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    // Critical for live/cPanel reliability: read values back from MySQL and return
    // exactly what was persisted. Clients verify this before showing success.
    const keys = Array.from(decoded.keys());
    const savedRows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const savedMap = new Map(savedRows.map((row) => [row.key, row.value || '']));

    const mismatched = keys.filter((key) => (savedMap.get(key) ?? '') !== decoded.get(key));
    if (mismatched.length) {
      console.error('Add-on settings read-back mismatch:', mismatched);
      return NextResponse.json(
        { error: `Database verification failed for: ${mismatched.join(', ')}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, entries: responseEntries(savedRows) },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Failed to save add-on settings:', error);
    return NextResponse.json({ error: 'Failed to save add-on settings' }, { status: 500 });
  }
}

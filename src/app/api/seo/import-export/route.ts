import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';



type ContentType = 'page' | 'post';

type SeoRow = {
  contentType: ContentType;
  slug: string;
  title: string;
  focusKeyword: string;
  seoTitle: string;
  metaDescription: string;
  noIndex: boolean;
  seoRobots: string;
  seoAdvancedRobots: string;
  seoScore: number;
  isPillar: boolean;
  redirectUrl: string;
  redirectType: string;
  schemaJson: string;
};

function normalizeRow(contentType: ContentType, row: any): SeoRow {
  return {
    contentType,
    slug: String(row.slug || ''),
    title: String(row.title || ''),
    focusKeyword: String(row.focusKeyword || ''),
    seoTitle: String(row.seoTitle || ''),
    metaDescription: String(row.metaDescription || ''),
    noIndex: Boolean(row.noIndex),
    seoRobots: String(row.seoRobots || ''),
    seoAdvancedRobots: String(row.seoAdvancedRobots || ''),
    seoScore: Number(row.seoScore || 0),
    isPillar: Boolean(row.isPillar),
    redirectUrl: String(row.redirectUrl || ''),
    redirectType: String(row.redirectType || ''),
    schemaJson: String(row.schemaJson || ''),
  };
}

function csvEscape(value: unknown) {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function toCsv(rows: SeoRow[]) {
  const headers = [
    'contentType','slug','title','focusKeyword','seoTitle','metaDescription','noIndex',
    'seoRobots','seoAdvancedRobots','seoScore','isPillar','redirectUrl','redirectType','schemaJson'
  ];
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => csvEscape((row as any)[key])).join(',')),
  ].join('\n');
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      current.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      current.push(value);
      value = '';
      if (current.some((cell) => cell.length > 0)) rows.push(current);
      current = [];
    } else {
      value += char;
    }
  }
  if (value.length || current.length) {
    current.push(value);
    if (current.some((cell) => cell.length > 0)) rows.push(current);
  }
  if (!rows.length) return [];
  const headers = rows.shift()!.map((h) => h.trim());
  return rows.map((cells) => headers.reduce((obj: Record<string,string>, key, index) => {
    obj[key] = cells[index] ?? '';
    return obj;
  }, {}));
}

function asBoolean(value: unknown) {
  return value === true || String(value).toLowerCase() === 'true' || String(value) === '1';
}

function importData(row: any) {
  return {
    focusKeyword: String(row.focusKeyword || ''),
    seoTitle: String(row.seoTitle || '') || null,
    metaDescription: String(row.metaDescription || ''),
    noIndex: asBoolean(row.noIndex),
    seoRobots: String(row.seoRobots || '') || null,
    seoAdvancedRobots: String(row.seoAdvancedRobots || '') || null,
    seoScore: Math.max(0, Math.min(100, Number(row.seoScore || 0) || 0)),
    isPillar: asBoolean(row.isPillar),
    redirectUrl: String(row.redirectUrl || '') || null,
    redirectType: String(row.redirectType || '') || null,
    schemaJson: String(row.schemaJson || '') || null,
  };
}

export async function GET(request: Request) {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json';
    const scope = url.searchParams.get('scope') || 'all';
    const includeSettings = url.searchParams.get('settings') !== '0';

    const [pages, posts, settings] = await Promise.all([
      scope === 'posts' ? Promise.resolve([]) : prisma.page.findMany({
        select: {
          slug:true,title:true,focusKeyword:true,seoTitle:true,metaDescription:true,noIndex:true,
          seoRobots:true,seoAdvancedRobots:true,seoScore:true,isPillar:true,redirectUrl:true,redirectType:true,schemaJson:true,
        },
        orderBy: { id: 'asc' },
      }),
      scope === 'pages' ? Promise.resolve([]) : prisma.post.findMany({
        select: {
          slug:true,title:true,focusKeyword:true,seoTitle:true,metaDescription:true,noIndex:true,
          seoRobots:true,seoAdvancedRobots:true,seoScore:true,isPillar:true,redirectUrl:true,redirectType:true,schemaJson:true,
        },
        orderBy: { id: 'asc' },
      }),
      includeSettings ? prisma.setting.findMany({
        where: {
          OR: [
            { key: { startsWith: 'seo_' } },
            { key: { startsWith: 'breadcrumbs_' } },
            { key: { startsWith: 'llms_txt_' } },
            { key: { startsWith: 'md_' } },
          ],
        },
        select: { key: true, value: true },
      }) : Promise.resolve([]),
    ]);

    const rows = [
      ...pages.map((row) => normalizeRow('page', row)),
      ...posts.map((row) => normalizeRow('post', row)),
    ];

    const date = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      return new NextResponse(toCsv(rows), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="seo-content-${date}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const document = {
      kind: 'velocity-cms-seo-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      content: rows,
      settings: Object.fromEntries(settings.map((row) => [row.key, row.value || ''])),
    };

    return new NextResponse(JSON.stringify(document, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="seo-export-${date}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('SEO export failed:', error);
    return NextResponse.json({ error: error?.message || 'SEO export failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let contentRows: any[] = [];
    let settings: Record<string,string> = {};

    if (contentType.includes('text/csv')) {
      contentRows = parseCsv(await request.text());
    } else {
      const doc = await request.json();
      if (doc?.kind && doc.kind !== 'velocity-cms-seo-export') {
        throw new Error('This is not a supported CMS SEO export file.');
      }
      contentRows = Array.isArray(doc?.content) ? doc.content : Array.isArray(doc) ? doc : [];
      settings = doc?.settings && typeof doc.settings === 'object' ? doc.settings : {};
    }

    let updated = 0;
    let skipped = 0;
    const errors: { type:string; slug:string; error:string }[] = [];

    for (const row of contentRows) {
      const type = String(row.contentType || '').toLowerCase();
      const slug = String(row.slug || '').trim();
      if (!slug || !['page','post'].includes(type)) {
        skipped += 1;
        continue;
      }
      try {
        if (type === 'page') {
          const exists = await prisma.page.findUnique({ where: { slug }, select: { id: true } });
          if (!exists) { skipped += 1; continue; }
          await prisma.page.update({ where: { slug }, data: importData(row) });
        } else {
          const exists = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
          if (!exists) { skipped += 1; continue; }
          await prisma.post.update({ where: { slug }, data: importData(row) });
        }
        updated += 1;
      } catch (error: any) {
        errors.push({ type, slug, error: error?.message || 'Update failed' });
      }
    }

    let settingsUpdated = 0;
    for (const [key, value] of Object.entries(settings)) {
      if (!/^(seo_|breadcrumbs_|llms_txt_|md_)/.test(key)) continue;
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value ?? '') },
        create: { key, value: String(value ?? '') },
      });
      settingsUpdated += 1;
    }

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      failed: errors.length,
      settingsUpdated,
      errors: errors.slice(0, 50),
    });
  } catch (error: any) {
    console.error('SEO import failed:', error);
    return NextResponse.json({ error: error?.message || 'SEO import failed.' }, { status: 400 });
  }
}

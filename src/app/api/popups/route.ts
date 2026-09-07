import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get('active') === '1';
  if (!activeOnly && !(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const now = new Date();
  const rows = await prisma.popup.findMany({
    where: activeOnly ? {
      status: 'Published',
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ]
    } : undefined,
    orderBy: { updatedAt: 'desc' }
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await req.json();
    const base = String(data.slug || data.title || 'popup').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'popup';
    let slug = base, n = 1;
    while (await prisma.popup.findUnique({ where: { slug } })) slug = `${base}-${n++}`;
    const popup = await prisma.popup.create({ data: {
      title: data.title || 'Untitled Popup',
      slug,
      contentHtml: data.contentHtml || '<div><h2>Your popup</h2><p>Add your content here.</p></div>',
      status: data.status || 'Draft',
      triggerType: data.triggerType || 'delay',
      delaySeconds: Number(data.delaySeconds ?? 3),
      scrollPercent: Number(data.scrollPercent ?? 50),
      displayMode: data.displayMode || 'all',
      pageRules: JSON.stringify(data.pageRules || []),
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    }});
    return NextResponse.json(popup);
  } catch (error:any) {
    return NextResponse.json({ error: error.message || 'Could not create popup' }, { status:500 });
  }
}

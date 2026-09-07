import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const ALLOWED = new Set(['page', 'post']);

function cleanSnapshot(snapshot: any, type: string) {
  const common: any = {
    title: snapshot.title,
    slug: snapshot.slug,
    contentHtml: snapshot.contentHtml,
    contentText: snapshot.contentText,
    metaDescription: snapshot.metaDescription,
    focusKeyword: snapshot.focusKeyword,
    seoTitle: snapshot.seoTitle,
    redirectUrl: snapshot.redirectUrl,
    redirectType: snapshot.redirectType,
    noIndex: snapshot.noIndex,
    seoRobots: snapshot.seoRobots,
    seoAdvancedRobots: snapshot.seoAdvancedRobots,
    status: snapshot.status,
    visibility: snapshot.visibility,
    password: snapshot.password,
    schemaJson: snapshot.schemaJson,
    seoScore: snapshot.seoScore,
    isPillar: snapshot.isPillar,
    featuredImage: snapshot.featuredImage,
    publishedAt: snapshot.publishedAt ? new Date(snapshot.publishedAt) : null,
  };
  if (type === 'page') {
    common.hideTitle = snapshot.hideTitle;
    common.heroDescription = snapshot.heroDescription;
  }
  if (type === 'post') {
    if (Array.isArray(snapshot.categories)) {
      common.categories = { set: snapshot.categories.map((x:any) => ({ id: x.id })) };
    }
    if (Array.isArray(snapshot.tags)) {
      common.tags = { set: snapshot.tags.map((x:any) => ({ id: x.id })) };
    }
  }
  return common;
}

export async function GET(req: Request, context: any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = await context.params;
  const type = String(params.type);
  const id = Number(params.id);
  if (!ALLOWED.has(type) || !id) return NextResponse.json({ error: 'Invalid content.' }, { status: 400 });
  const revisions = await prisma.revision.findMany({
    where: { contentType: type, contentId: id },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  return NextResponse.json(revisions.map((r:any) => ({ ...r, snapshot: undefined })));
}

export async function POST(req: Request, context: any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const params = await context.params;
    const type = String(params.type);
    const id = Number(params.id);
    const { revisionId } = await req.json();
    if (!ALLOWED.has(type) || !id || !revisionId) return NextResponse.json({ error: 'Invalid restore request.' }, { status: 400 });

    const revision = await prisma.revision.findFirst({ where: { id: Number(revisionId), contentType: type, contentId: id } });
    if (!revision) return NextResponse.json({ error: 'Revision not found.' }, { status: 404 });
    const snapshot = JSON.parse(revision.snapshot);
    const data = cleanSnapshot(snapshot, type);

    const restored = type === 'page'
      ? await prisma.page.update({ where: { id }, data })
      : await prisma.post.update({ where: { id }, data });
    return NextResponse.json({ success: true, item: restored });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not restore revision.' }, { status: 500 });
  }
}

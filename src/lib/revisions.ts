import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function getRevisionAuthor() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('cms_session')?.value;
    if (!token) return { authorId: null, authorName: null };
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production');
    const { payload } = await jwtVerify(token, secret);
    const authorId = payload.id ? Number(payload.id) : null;
    let authorName = payload.username ? String(payload.username) : null;
    if (authorId) {
      const user = await prisma.user.findUnique({
        where: { id: authorId },
        select: { firstName: true, lastName: true, username: true, email: true },
      });
      if (user) {
        authorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || authorName;
      }
    }
    return { authorId, authorName };
  } catch {
    return { authorId: null, authorName: null };
  }
}

export async function maybeCreateRevision(contentType: 'page' | 'post', contentId: number, current: any) {
  const maxSetting = await prisma.setting.findUnique({ where: { key: 'revision_max_per_item' } });
  const max = Math.max(1, Math.min(100, Number(maxSetting?.value || 20)));
  const author = await getRevisionAuthor();

  await prisma.revision.create({
    data: {
      contentType,
      contentId,
      title: current.title || '',
      slug: current.slug || '',
      snapshot: JSON.stringify(current),
      authorId: author.authorId,
      authorName: author.authorName,
    }
  });

  const old = await prisma.revision.findMany({
    where: { contentType, contentId },
    orderBy: { createdAt: 'desc' },
    skip: max,
    select: { id: true }
  });
  if (old.length) {
    await prisma.revision.deleteMany({ where: { id: { in: old.map((x:any) => x.id) } } });
  }
}

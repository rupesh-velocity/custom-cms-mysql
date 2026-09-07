import { prisma } from '@/lib/prisma';

export async function getPermalinkSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [
      'permalink_post_base', 'permalink_category_base', 'permalink_tag_base', 'permalink_trailing_slash'
    ] } }
  });
  return rows.reduce((acc: Record<string, string>, row) => {
    acc[row.key] = row.value || '';
    return acc;
  }, {});
}

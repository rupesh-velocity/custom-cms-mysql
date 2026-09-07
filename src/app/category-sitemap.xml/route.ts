import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildCategoryUrl } from '@/lib/permalinks';
import { escapeXml, requestBaseUrl, sitemapResponseHeaders } from '@/lib/sitemap-utils';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ['seo_sitemap_include_categories', 'seo_sitemap_empty_categories', 'permalink_category_base', 'permalink_trailing_slash', 'site_url'] }
      }
    });

    const settingMap = settings.reduce((acc:Record<string,string>, row:any) => { acc[row.key]=row.value||''; return acc; }, {});
    const appUrl = requestBaseUrl(request, settingMap.site_url);
    const includeCategories = settings.find(s => s.key === 'seo_sitemap_include_categories')?.value !== 'false';
    const includeEmpty = settings.find(s => s.key === 'seo_sitemap_empty_categories')?.value === 'true';

    if (!includeCategories) {
      return new NextResponse('Sitemap disabled', { status: 404 });
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { posts: true }
        }
      }
    });

    const filteredCategories = includeEmpty ? categories : categories.filter(c => c._count.posts > 0);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const cat of filteredCategories) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${appUrl}${buildCategoryUrl(cat.slug, settingMap)}`)}</loc>\n`;
      xml += `    <lastmod>${new Date(cat.updatedAt).toISOString()}</lastmod>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    return new NextResponse(xml, {
      headers: sitemapResponseHeaders,
    });
  } catch (error) {
    console.error('Error generating category sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

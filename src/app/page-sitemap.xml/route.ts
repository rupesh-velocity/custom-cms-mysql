import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;
    
    // Check if pages are enabled in sitemap and get homepage settings
    const settings = await prisma.setting.findMany({
      where: { key: { in: [
        'seo_sitemap_include_pages', 
        'homepage_displays', 
        'homepage_page_id',
        'seo_sitemap_images', 
        'seo_sitemap_include_featured_images', 
        'seo_sitemap_exclude_posts'
      ] } }
    });
    const settingMap = settings.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
    
    if (settingMap['seo_sitemap_include_pages'] === 'false') {
      return new NextResponse('Sitemap disabled for pages', { status: 404 });
    }

    const excludeIds = (settingMap['seo_sitemap_exclude_posts'] || '')
      .split(',')
      .map((id: string) => parseInt(id.trim()))
      .filter((id: number) => !isNaN(id));

    const includeImages = settingMap['seo_sitemap_images'] !== 'false';
    const includeFeaturedImages = settingMap['seo_sitemap_include_featured_images'] === 'true';

    const pages = await prisma.page.findMany({
      where: { 
        status: 'Published',
        noIndex: false,
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {})
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
        contentHtml: true,
        featuredImage: true
      },
      take: 1000
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    pages.forEach(page => {
      xml += `  <url>\n`;
      // Handle homepage
      const isHomepage = settingMap['homepage_displays'] === 'static_page' && settingMap['homepage_page_id'] === String(page.id);
      const loc = isHomepage ? appUrl : `${appUrl}/${page.slug}`;
      xml += `    <loc>${loc}</loc>\n`;
      xml += `    <lastmod>${page.updatedAt.toISOString()}</lastmod>\n`;
      
      // Extract images
      if (includeImages && page.contentHtml) {
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(page.contentHtml)) !== null) {
          const imgSrc = match[1];
          // Ensure absolute URL if it starts with /
          const absoluteImgSrc = imgSrc.startsWith('/') ? `${appUrl}${imgSrc}` : imgSrc;
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${absoluteImgSrc}</image:loc>\n`;
          xml += `    </image:image>\n`;
        }
      }
      
      // Add featured image
      if (includeFeaturedImages && page.featuredImage) {
        const absoluteImgSrc = page.featuredImage.startsWith('/') ? `${appUrl}${page.featuredImage}` : page.featuredImage;
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${absoluteImgSrc}</image:loc>\n`;
        xml += `    </image:image>\n`;
      }
      
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error generating page sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

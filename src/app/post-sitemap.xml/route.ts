import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;
    
    // Check if posts are enabled in sitemap
    const settings = await prisma.setting.findMany({
      where: { key: { in: [
        'seo_sitemap_include_posts', 
        'seo_sitemap_images', 
        'seo_sitemap_include_featured_images', 
        'seo_sitemap_exclude_posts'
      ] } }
    });
    const settingMap = settings.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
    
    if (settingMap['seo_sitemap_include_posts'] === 'false') {
      return new NextResponse('Sitemap disabled for posts', { status: 404 });
    }

    const excludeIds = (settingMap['seo_sitemap_exclude_posts'] || '')
      .split(',')
      .map((id: string) => parseInt(id.trim()))
      .filter((id: number) => !isNaN(id));

    const includeImages = settingMap['seo_sitemap_images'] !== 'false';
    const includeFeaturedImages = settingMap['seo_sitemap_include_featured_images'] === 'true';

    const posts = await prisma.post.findMany({
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
      // You can add pagination using seo_sitemap_links_per_page here
      take: 1000
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    posts.forEach(post => {
      xml += `  <url>\n`;
      xml += `    <loc>${appUrl}/${post.slug}</loc>\n`;
      xml += `    <lastmod>${post.updatedAt.toISOString()}</lastmod>\n`;
      
      // Extract images
      if (includeImages && post.contentHtml) {
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(post.contentHtml)) !== null) {
          const imgSrc = match[1];
          const absoluteImgSrc = imgSrc.startsWith('/') ? `${appUrl}${imgSrc}` : imgSrc;
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${absoluteImgSrc}</image:loc>\n`;
          xml += `    </image:image>\n`;
        }
      }
      
      // Add featured image
      if (includeFeaturedImages && post.featuredImage) {
        const absoluteImgSrc = post.featuredImage.startsWith('/') ? `${appUrl}${post.featuredImage}` : post.featuredImage;
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
    console.error('Error generating post sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

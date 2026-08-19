import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;
    
    // Fetch settings to check if sitemaps are enabled
    const settings = await prisma.setting.findMany({
      where: {
        key: { in: [
          'seo_sitemap_include_posts', 
          'seo_sitemap_include_pages',
          'seo_sitemap_include_categories',
          'seo_sitemap_include_tags',
          'seo_sitemap_include_kml'
        ] }
      }
    });

    const includePosts = settings.find(s => s.key === 'seo_sitemap_include_posts')?.value !== 'false';
    const includePages = settings.find(s => s.key === 'seo_sitemap_include_pages')?.value !== 'false';
    const includeCategories = settings.find(s => s.key === 'seo_sitemap_include_categories')?.value !== 'false';
    const includeTags = settings.find(s => s.key === 'seo_sitemap_include_tags')?.value === 'true';
    const includeKml = settings.find(s => s.key === 'seo_sitemap_include_kml')?.value !== 'false';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    if (includePosts) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${appUrl}/post-sitemap.xml</loc>\n`;
      // You can add lastmod here based on latest post
      xml += `  </sitemap>\n`;
    }

    if (includePages) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${appUrl}/page-sitemap.xml</loc>\n`;
      xml += `  </sitemap>\n`;
    }

    if (includeCategories) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${appUrl}/category-sitemap.xml</loc>\n`;
      xml += `  </sitemap>\n`;
    }

    if (includeTags) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${appUrl}/post_tag-sitemap.xml</loc>\n`;
      xml += `  </sitemap>\n`;
    }

    if (includeKml) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${appUrl}/locations.kml</loc>\n`;
      xml += `  </sitemap>\n`;
    }

    xml += `</sitemapindex>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import TurndownService from 'turndown';

export async function GET(request: Request) {
  const url = new URL(request.url);
  // request.url contains the original requested url (e.g. http://localhost:3000/about-us.md)
  let rawSlug = url.pathname; // "/about-us.md"
  
  if (rawSlug.startsWith('/')) {
    rawSlug = rawSlug.substring(1);
  }

  let slug = rawSlug;

  // If the routing passed the .md extension through, strip it
  if (slug.endsWith('.md')) {
    slug = slug.slice(0, -3);
  }

  if (!slug) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Fetch settings
  const settingsRecords = await prisma.setting.findMany({
    where: {
      key: { in: ['md_endpoints_enabled', 'md_endpoints_pages', 'md_endpoints_posts'] }
    }
  });

  const settings = settingsRecords.reduce((acc: Record<string, string>, setting) => {
    acc[setting.key] = setting.value || '';
    return acc;
  }, {});

  if (settings.md_endpoints_enabled !== 'true') {
    return new NextResponse('Not found', { status: 404 });
  }

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  // Handle special case for homepage (index.md)
  if (slug === 'index') {
    const homepageMode = await prisma.setting.findUnique({ where: { key: 'homepage_displays' } });
    
    if (homepageMode?.value === 'static_page') {
      const pageIdSetting = await prisma.setting.findUnique({ where: { key: 'homepage_page_id' } });
      const pageId = parseInt(pageIdSetting?.value || '0');
      
      if (pageId && settings.md_endpoints_pages === 'true') {
        const page = await prisma.page.findUnique({ where: { id: pageId } });
        if (page && page.status === 'Published' && page.visibility === 'Public') {
          let markdown = `# ${page.title}\n\n`;
          if (page.metaDescription) markdown += `> ${page.metaDescription}\n\n`;
          if (page.contentHtml) markdown += turndownService.turndown(page.contentHtml);
          
          return new NextResponse(markdown, {
            status: 200,
            headers: {
              'Content-Type': 'text/markdown; charset=utf-8',
              'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
          });
        }
      }
    } else {
      // Latest posts mode
      if (settings.md_endpoints_posts === 'true') {
        const posts = await prisma.post.findMany({
          where: { status: 'Published', visibility: 'Public' },
          orderBy: { publishedAt: 'desc' },
          take: 10
        });
        
        let markdown = `# Latest Posts\n\n`;
        for (const post of posts) {
          markdown += `## [${post.title}](/${post.slug})\n`;
          if (post.metaDescription) markdown += `> ${post.metaDescription}\n`;
          markdown += `\n`;
        }
        
        return new NextResponse(markdown, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        });
      }
    }
    
    return new NextResponse('Not found', { status: 404 });
  }

  // Check if it's a page
  const page = await prisma.page.findUnique({
    where: { slug }
  });

  if (page) {
    if (page.status !== 'Published' || page.visibility !== 'Public') {
      return new NextResponse('Not found', { status: 404 });
    }
    if (settings.md_endpoints_pages !== 'true') {
      return new NextResponse('Not found', { status: 404 });
    }

    let markdown = `# ${page.title}\n\n`;
    if (page.metaDescription) {
      markdown += `> ${page.metaDescription}\n\n`;
    }
    if (page.contentHtml) {
      markdown += turndownService.turndown(page.contentHtml);
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  }

  // Check if it's a post
  const post = await prisma.post.findUnique({
    where: { slug }
  });

  if (post) {
    if (post.status !== 'Published' || post.visibility !== 'Public') {
      return new NextResponse('Not found', { status: 404 });
    }
    if (settings.md_endpoints_posts !== 'true') {
      return new NextResponse('Not found', { status: 404 });
    }

    let markdown = `# ${post.title}\n\n`;
    if (post.metaDescription) {
      markdown += `> ${post.metaDescription}\n\n`;
    }
    if (post.contentHtml) {
      markdown += turndownService.turndown(post.contentHtml);
    }

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  }

  return new NextResponse('Not found', { status: 404 });
}

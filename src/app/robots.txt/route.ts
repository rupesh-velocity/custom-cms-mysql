import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0; // Prevent caching if dynamic

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'seo_robots_txt' }
    });

    let content = setting?.value;
    
    if (!content) {
      // Default fallback
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      content = `User-agent: *\nAllow: /\n\nSitemap: ${appUrl}/sitemap_index.xml`;
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error serving robots.txt:', error);
    return new NextResponse('User-agent: *\nAllow: /', {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

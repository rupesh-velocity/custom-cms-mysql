import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const settings = await prisma.setting.findMany({
      where: {
        OR: [
          { key: { startsWith: 'seo_' } },
          { key: { startsWith: 'breadcrumbs_' } },
          { key: { startsWith: 'llms_txt_' } },
          { key: { startsWith: 'md_' } }
        ]
      }
    });

    // Convert array of {key, value} to an object
    const settingsObj = settings.reduce((acc: Record<string, string>, curr) => {
      acc[curr.key] = curr.value || '';
      return acc;
    }, {});

    return NextResponse.json(settingsObj, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error) {
    console.error('Error fetching SEO settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await request.json();
    
    // data is an object like { seo_nofollow_external: 'true', seo_robots_txt: '...' }
    // We will upsert each key
    
    const operations = Object.entries(data).map(([key, value]) => {
      return prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    });
    
    // Execute all upserts in parallel (using connection pool) to prevent transaction timeouts 
    // and make the save process significantly faster than sequential.
    await Promise.all(operations);

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error: any) {
    console.error('Error saving SEO settings:', error);
    
    return NextResponse.json({ 
      error: 'Failed to save settings', 
      details: error?.message || String(error),
      stack: error?.stack
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { getImageOptimizationStats } from '@/lib/media-optimization';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await getImageOptimizationStats(), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Image optimization stats failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not load image optimization statistics' },
      { status: 500 },
    );
  }
}

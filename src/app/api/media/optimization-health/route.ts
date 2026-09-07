import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { getImageOptimizationHealth } from '@/lib/media-optimization';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await getImageOptimizationHealth(), {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not inspect image files' }, { status: 500 });
  }
}

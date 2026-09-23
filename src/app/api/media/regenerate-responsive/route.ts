import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';

export async function POST() {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ error: 'Responsive image variants are no longer enabled.' }, { status: 410 });
}

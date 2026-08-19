import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.page.updateMany({ where: { authorId: null }, data: { authorId: user.id } });
      await prisma.post.updateMany({ where: { authorId: null }, data: { authorId: user.id } });
    }
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

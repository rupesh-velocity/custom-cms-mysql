import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'site_title' } });
    const siteTitle = String(row?.value || '').trim();
    return { title: siteTitle ? `Sign In – ${siteTitle}` : 'Sign In' };
  } catch {
    return { title: 'Sign In' };
  }
}

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userCount = 0;

  try {
    userCount = await prisma.user.count();
  } catch (error) {
    console.error('Error checking user count:', error);
  }

  if (userCount === 0) {
    redirect('/setup');
  }

  return <>{children}</>;
}
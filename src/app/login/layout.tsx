import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { RootHeadSettings, RootBodyScripts } from '@/components/RootSettings';

export const dynamic = 'force-dynamic';

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch (error) {
    console.error("Error checking user count:", error);
  }

  if (userCount === 0) {
    redirect('/setup');
  }

  return (
    <>
      <RootHeadSettings />
      <RootBodyScripts position="top" />
      {children}
      <RootBodyScripts position="bottom" />
    </>
  );
}

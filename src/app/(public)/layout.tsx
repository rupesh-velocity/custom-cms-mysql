import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { RootHeadSettings, RootBodyScripts } from '@/components/RootSettings';
import VideoFacadeHandler from '@/components/VideoFacadeHandler';
import { Metadata } from 'next';
import { generateFullMetadata } from '@/lib/seo-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return generateFullMetadata({
    type: 'website'
  });
}

export const dynamic = 'force-dynamic';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RootHeadSettings />
      <RootBodyScripts position="top" />
      <SiteHeader />
      {children}
      <SiteFooter />
      <VideoFacadeHandler />
      <RootBodyScripts position="bottom" />
    </>
  );
}

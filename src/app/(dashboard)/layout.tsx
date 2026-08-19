import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import VideoFacadeHandler from '@/components/VideoFacadeHandler';
import { RootHeadSettings, RootBodyScripts } from '@/components/RootSettings';

export default function DashboardLayout({
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
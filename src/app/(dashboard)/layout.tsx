import '../(public)/public-globals.css';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import VideoFacadeHandler from '@/components/VideoFacadeHandler';
import { RootHeadSettings, RootBodyScripts } from '@/components/RootSettings';
import MyAccountHeader from '@/components/MyAccountHeader';

async function getBrandingSettings() {
  const settingsRecords = await prisma.setting.findMany({
    where: {
      key: { in: ['site_title', 'site_icon', 'site_logo'] },
    },
  });

  const settings = settingsRecords.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  return {
    siteTitle: String(settings.site_title || '').trim() || 'Fitness Arts',
    siteLogo: settings.site_logo || null,
    siteIcon: settings.site_icon || null,
  };
}


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-cms-pathname') || '';
  const isMyAccount = pathname.startsWith('/my-account');
  const branding = isMyAccount ? await getBrandingSettings() : null;

  return (
    <>
      <RootHeadSettings />
      <RootBodyScripts position="top" />
      {isMyAccount && branding ? (
        <div className="flex min-h-screen flex-col bg-[#f6f8fb]">
          <MyAccountHeader {...branding} />
          <div className="flex-1 bg-[#f6f8fb]">{children}</div>
          <footer className="px-4 py-5 text-center text-sm font-semibold text-white" style={{ backgroundColor: '#161A29' }}>
            © {new Date().getFullYear()} Fitness Arts. All rights reserved.
          </footer>
        </div>
      ) : (
        <>
          <SiteHeader />
          {children}
          <SiteFooter />
        </>
      )}
      <VideoFacadeHandler />
      <RootBodyScripts position="bottom" />
    </>
  );
}

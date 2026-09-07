import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { RootHeadSettings, RootBodyScripts } from '@/components/RootSettings';
import VideoFacadeHandler from '@/components/VideoFacadeHandler';
import PopupRuntime from '@/components/PopupRuntime';
import CookieConsentRuntime from '@/components/CookieConsentRuntime';
import { Metadata } from 'next';
import { generateFullMetadata } from '@/lib/seo-metadata';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';

export async function generateMetadata(): Promise<Metadata> {
  return generateFullMetadata({ type:'website' });
}
export const dynamic='force-dynamic';

export default async function PublicLayout({children}:{children:React.ReactNode}) {
  const keys=[
    'addon_maintenance_enabled','maintenance_title','maintenance_message',
    'addon_cookie_consent_enabled','cookie_consent_message','cookie_accept_text','cookie_reject_text','cookie_privacy_url','cookie_position',
    'addon_popup_builder_enabled'
  ];
  let s:Record<string,string>={};
  try {
    const rows=await prisma.setting.findMany({where:{key:{in:keys}}});
    s=rows.reduce((a:Record<string,string>,r:any)=>{a[r.key]=r.value||'';return a;},{});
  } catch {}
  const adminSession=await isAdministratorSession();
  const maintenance=s.addon_maintenance_enabled==='true' && !adminSession;

  if(maintenance) return <>
    <RootHeadSettings/>
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{s.maintenance_title || 'We’ll be right back'}</h1>
        <p className="text-gray-600 mt-4 leading-7">{s.maintenance_message || 'We are performing scheduled maintenance. Please check back shortly.'}</p>
      </div>
    </main>
  </>;

  return <>
    <RootHeadSettings/>
    <RootBodyScripts position="top"/>
    <SiteHeader/>
    {children}
    <SiteFooter/>
    <VideoFacadeHandler/>
    {s.addon_popup_builder_enabled==='true' && <PopupRuntime/>}
    <CookieConsentRuntime
      enabled={s.addon_cookie_consent_enabled==='true'}
      message={s.cookie_consent_message||''}
      acceptText={s.cookie_accept_text||''}
      rejectText={s.cookie_reject_text||''}
      privacyUrl={s.cookie_privacy_url||''}
      position={s.cookie_position||'bottom'}
    />
    <RootBodyScripts position="bottom"/>
  </>;
}

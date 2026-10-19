import './public-globals.css';
import { cookies, headers } from 'next/headers';
import { jwtVerify } from 'jose';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import AccountPortalHeader from '@/components/AccountPortalHeader';
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

const JWT_FALLBACK = 'fallback_super_secret_key_change_in_production';

type BrandingSettings = {
  siteTitle: string;
  siteLogo: string | null;
  siteIcon: string | null;
};

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || JWT_FALLBACK);
}

function isAdminRole(role?: string | null) {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'admin' || normalized === 'administrator' || normalized === 'super_admin';
}

function subscriptionIsActive(status?: string | null) {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'ACTIVE' || normalized === 'TRIALING' || normalized === 'PAST_DUE' || normalized === 'UNPAID';
}

function getTimeValue(date?: Date | string | null) {
  if (!date) return 0;
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function accessIsActive(expiresAt?: Date | string | null) {
  if (!expiresAt) return true;
  return getTimeValue(expiresAt) >= Date.now();
}

function subscriptionGivesAccess(subscription: { status?: string | null; cancelAtPeriodEnd?: boolean | null; currentPeriodEnd?: Date | string | null }) {
  if (!subscriptionIsActive(subscription.status)) return false;

  // Active auto-renew must grant access even if UserCourseAccess.expiresAt is old.
  if (!subscription.cancelAtPeriodEnd) return true;

  // Cancelled-at-period-end subscriptions grant access until the current paid period ends.
  return getTimeValue(subscription.currentPeriodEnd) >= Date.now();
}

function getCourseSlugFromPath(pathname: string) {
  const match = pathname.match(/^\/courses\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function getBrandingSettings(): Promise<BrandingSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['site_title', 'site_logo', 'site_icon'] } },
  });

  const values = rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value || '';
    return acc;
  }, {});

  return {
    siteTitle: String(values.site_title || '').trim() || 'Fitness Arts',
    siteLogo: values.site_logo || null,
    siteIcon: values.site_icon || null,
  };
}

async function shouldUseCoursePortalLayout(pathname: string) {
  const slug = getCourseSlugFromPath(pathname);
  if (!slug) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get('cms_session')?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = Number(payload.id || 0);
    const userRole = String(payload.role || '');
    if (!userId && !isAdminRole(userRole)) return false;

    const course = await prisma.course.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!course) return false;
    if (isAdminRole(userRole)) return true;

    const [accessRecord, subscription] = await Promise.all([
      prisma.userCourseAccess.findFirst({
        where: { userId, courseId: course.id },
        orderBy: [{ expiresAt: 'desc' }, { updatedAt: 'desc' }],
      }),
      prisma.courseSubscription.findFirst({
        where: {
          userId,
          courseId: course.id,
          status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID'] },
        },
        orderBy: [{ currentPeriodEnd: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    return accessIsActive(accessRecord?.expiresAt) || subscriptionGivesAccess(subscription || {});
  } catch {
    return false;
  }
}

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

  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-cms-pathname') || '';
  const useCoursePortalLayout = await shouldUseCoursePortalLayout(pathname);
  const branding = useCoursePortalLayout ? await getBrandingSettings() : null;

  if (useCoursePortalLayout && branding) {
    return <>
      <RootHeadSettings/>
      <RootBodyScripts position="top"/>
      <div className="flex min-h-screen flex-col bg-[#f6f8fb]">
        <AccountPortalHeader {...branding}/>
        <main className="flex-1 bg-[#f6f8fb]">
          {children}
        </main>
        <footer className="px-4 py-5 text-center text-sm font-semibold text-white" style={{ backgroundColor: '#161A29' }}>
          © {new Date().getFullYear()} Fitness Arts. All rights reserved.
        </footer>
      </div>
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

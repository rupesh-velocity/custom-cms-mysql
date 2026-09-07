import type { Metadata } from 'next';
import './globals.css';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { BodyTrackingSnippet, JavaScriptSnippet } from '@/components/CodeSnippet';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ['site_title', 'site_tagline'] } } });
    const values = rows.reduce<Record<string, string>>((acc, row) => { acc[row.key] = row.value || ''; return acc; }, {});
    const siteTitle = String(values.site_title || '').trim() || 'Website';
    const description = String(values.site_tagline || '').trim();
    return { title: siteTitle, description: description || undefined };
  } catch {
    return { title: 'Website' };
  }
}

export const dynamic = 'force-dynamic';

type SettingsMap = Record<string, string>;

async function readRootSettings(): Promise<SettingsMap> {
  const keys = [
    'custom_css',
    'head_scripts',
    'body_scripts',
    'custom_js',
    'addon_analytics_enabled',
    'analytics_ga4_id',
    'analytics_gtm_id',
    'analytics_head_code',
    'analytics_body_code',
    'addon_cookie_consent_enabled',
  ];

  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    return rows.reduce<SettingsMap>((acc, row) => {
      acc[row.key] = row.value || '';
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function isFrontendPath(pathname: string) {
  if (!pathname) return true;
  return !(
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/_next')
  );
}

function stripDuplicateGtm(code: string | undefined, gtmId: string): string {
  const source = String(code || '');
  if (!source || !gtmId || !source.includes(gtmId)) return source;

  let cleaned = source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) =>
      block.includes(gtmId) && /googletagmanager\.com|gtm\.js/i.test(block) ? '' : block
    )
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, (block) =>
      block.includes(gtmId) && /googletagmanager\.com|ns\.html/i.test(block) ? '' : block
    );

  // The Custom JS editor also supports plain JavaScript without <script> tags.
  // If that entire plain snippet is the standard GTM loader, suppress it too.
  if (cleaned.includes(gtmId) && /googletagmanager\.com|gtm\.js/i.test(cleaned) && !/<script\b/i.test(cleaned)) {
    cleaned = '';
  }

  return cleaned.trim();
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-cms-pathname') || '';
  const frontend = isFrontendPath(pathname);

  // Custom website fonts belong to the public site, not the CMS admin shell.
  // Keeping this dynamic <style> out of /admin also avoids hydration conflicts
  // with browser/dev extensions that inject temporary <style> tags into <head>.
  let fontFamilies: { name: string; variations: { weight: string; style: string; woff2Url: string }[] }[] = [];
  if (frontend) {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: 'custom_fonts' } });
      if (setting?.value) fontFamilies = JSON.parse(setting.value);
    } catch {
      // Keep the public shell renderable if the DB is temporarily unavailable.
    }
  }

  const settings = frontend ? await readRootSettings() : {};

  let analyticsAllowed = settings.addon_analytics_enabled === 'true';
  if (analyticsAllowed && settings.addon_cookie_consent_enabled === 'true') {
    const cookieStore = await cookies();
    analyticsAllowed = cookieStore.get('cms_cookie_consent')?.value === 'accepted';
  }

  const ga4 = String(settings.analytics_ga4_id || '').trim();
  const gtm = String(settings.analytics_gtm_id || '').trim();

  // The dedicated GTM Container ID is the source of truth when populated.
  // If the same standard GTM snippet was also pasted into Custom JS/Tracking,
  // strip only those matching GTM blocks so the container executes once.
  const cleanHeadScripts = stripDuplicateGtm(settings.head_scripts, gtm);
  const cleanBodyScripts = stripDuplicateGtm(settings.body_scripts, gtm);
  const cleanFooterScripts = stripDuplicateGtm(settings.custom_js, gtm);
  const cleanTrackingHead = stripDuplicateGtm(settings.analytics_head_code, gtm);
  const cleanTrackingBody = stripDuplicateGtm(settings.analytics_body_code, gtm);
  const renderGeneratedGtm = Boolean(gtm);


  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head suppressHydrationWarning>
        {fontFamilies.length > 0 ? (
          <style
            id="cms-custom-fonts"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: fontFamilies
                .map((family) =>
                  family.variations
                    .map(
                      (variation) => `
@font-face {
  font-family: '${family.name}';
  src: url('${variation.woff2Url}') format('woff2');
  font-weight: ${variation.weight};
  font-style: ${variation.style};
  font-display: swap;
}`
                    )
                    .join('\n')
                )
                .join('\n'),
            }}
          />
        ) : null}

        {frontend && settings.custom_css ? (
          <style id="cms-custom-css" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: settings.custom_css }} />
        ) : null}

        {frontend ? <JavaScriptSnippet code={cleanHeadScripts} idPrefix="cms-custom-js-head" /> : null}

        {frontend && analyticsAllowed && ga4 ? (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`} />
            <script
              id="cms-ga4"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4.replace(/'/g, '')}');`,
              }}
            />
          </>
        ) : null}

        {frontend && analyticsAllowed && renderGeneratedGtm ? (
          <script
            id="cms-gtm"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm.replace(/'/g, '')}');`,
            }}
          />
        ) : null}

        {frontend && analyticsAllowed ? (
          <JavaScriptSnippet code={cleanTrackingHead} idPrefix="cms-tracking-head" />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {frontend ? <JavaScriptSnippet code={cleanBodyScripts} idPrefix="cms-custom-js-body" /> : null}

        {frontend && analyticsAllowed && renderGeneratedGtm ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtm)}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        ) : null}

        {frontend && analyticsAllowed ? (
          <BodyTrackingSnippet code={cleanTrackingBody} idPrefix="cms-tracking-body" />
        ) : null}

        {children}

        {frontend ? <JavaScriptSnippet code={cleanFooterScripts} idPrefix="cms-custom-js-footer" /> : null}
      </body>
    </html>
  );
}

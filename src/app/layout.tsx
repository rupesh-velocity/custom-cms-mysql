import type { Metadata } from 'next';
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

  // Analytics / tracking code is managed through the dedicated Head/Body fields.
  // GA4/GTM IDs are intentionally not auto-injected here; this prevents a
  // second GA4 implementation when GA4 is already configured inside GTM.
  const cleanHeadScripts = settings.head_scripts;
  const cleanBodyScripts = settings.body_scripts;
  const cleanFooterScripts = settings.custom_js;
  const cleanTrackingHead = settings.analytics_head_code;
  const cleanTrackingBody = settings.analytics_body_code;


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

        {frontend && analyticsAllowed ? (
          <JavaScriptSnippet code={cleanTrackingHead} idPrefix="cms-tracking-head" />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {frontend ? <JavaScriptSnippet code={cleanBodyScripts} idPrefix="cms-custom-js-body" /> : null}

        {frontend && analyticsAllowed ? (
          <BodyTrackingSnippet code={cleanTrackingBody} idPrefix="cms-tracking-body" />
        ) : null}

        {children}

        {frontend ? <JavaScriptSnippet code={cleanFooterScripts} idPrefix="cms-custom-js-footer" /> : null}
      </body>
    </html>
  );
}

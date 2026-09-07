import { prisma } from '@/lib/prisma';
import LocalSeoSchema from '@/components/seo/LocalSeoSchema';

async function getSeoSettings() {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['seo_norton_verify'] } },
    });
    return rows.reduce((acc: Record<string, string>, row: any) => {
      acc[row.key] = row.value || '';
      return acc;
    }, {});
  } catch {
    return {};
  }
}

/**
 * Page-level/global SEO additions that are safe to render with the public
 * layout. Custom CSS/JS and analytics are intentionally handled in the root
 * document layout so Head/Body/Footer placement is real and not duplicated.
 */
export async function RootHeadSettings() {
  const settings = await getSeoSettings();
  return (
    <>
      {settings.seo_norton_verify ? (
        <meta name="norton-safeweb-site-verification" content={settings.seo_norton_verify} />
      ) : null}
      <LocalSeoSchema />
    </>
  );
}

// Kept for layout compatibility. Code injection now happens in src/app/layout.tsx.
export async function RootBodyScripts({ position: _position }: { position: 'top' | 'bottom' }) {
  return null;
}

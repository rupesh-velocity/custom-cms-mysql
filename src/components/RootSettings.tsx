import { prisma } from '@/lib/prisma';
import LocalSeoSchema from '@/components/seo/LocalSeoSchema';
import Script from 'next/script';

async function getSettings() {
  if (process.env.npm_lifecycle_event === 'build') {
    try {
      const fs = require('fs');
      const path = require('path');
      const data = fs.readFileSync(path.join(process.cwd(), 'src/settings.json'), 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.warn('Could not read settings.json during build');
      return {};
    }
  }

  let settings: any[] = [];
  try {
    settings = await prisma.setting.findMany({
      where: {
        key: { in: ['custom_css', 'custom_js', 'head_scripts', 'body_scripts', 'seo_custom_webmaster_tags', 'seo_norton_verify'] }
      }
    });
  } catch (error) {
    console.warn("Could not fetch root layout settings (Prisma skipped)");
  }
  return settings.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
}

export async function RootHeadSettings() {
  const settingsObj = await getSettings();
  return (
    <>
      {settingsObj.custom_css && (
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: settingsObj.custom_css }} />
      )}
      {settingsObj.seo_norton_verify && (
        <meta name="norton-safeweb-site-verification" content={settingsObj.seo_norton_verify} />
      )}
      <LocalSeoSchema />
    </>
  );
}

export async function RootBodyScripts({ position }: { position: 'top' | 'bottom' }) {
  const settingsObj = await getSettings();
  if (position === 'top' && settingsObj.head_scripts) {
    return <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: settingsObj.head_scripts }} />;
  }
  if (position === 'bottom') {
    return (
      <>
        {settingsObj.body_scripts && (
          <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: settingsObj.body_scripts }} />
        )}
        {settingsObj.custom_js && (
          <Script id="global-custom-js" dangerouslySetInnerHTML={{ __html: settingsObj.custom_js }} strategy="lazyOnload" />
        )}
      </>
    );
  }
  return null;
}

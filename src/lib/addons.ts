import { prisma } from '@/lib/prisma';

export const ADDON_KEYS = {
  googleReviews: 'addon_google_reviews_enabled',
  maintenance: 'addon_maintenance_enabled',
  analytics: 'addon_analytics_enabled',
  cookieConsent: 'addon_cookie_consent_enabled',
  imageOptimization: 'addon_image_optimization_enabled',
  popupBuilder: 'addon_popup_builder_enabled',
  twilio: 'addon_twilio_enabled',
  importExport: 'addon_import_export_enabled',
  smtp: 'addon_smtp_enabled',
  searchReplace: 'addon_search_replace_enabled',
} as const;

export async function getSettingsMap(keys?: string[]) {
  const rows = await prisma.setting.findMany(keys?.length ? { where: { key: { in: keys } } } : undefined);
  return rows.reduce((acc: Record<string, string>, row: any) => {
    acc[row.key] = row.value || '';
    return acc;
  }, {});
}

export function settingEnabled(value: unknown, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true' || String(value) === '1';
}

export async function isAddonEnabled(key: string, defaultValue = false) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return settingEnabled(row?.value, defaultValue);
}

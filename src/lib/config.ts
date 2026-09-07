const configuredBasePath = String(process.env.NEXT_PUBLIC_BASE_PATH || '').trim();

function normalizeBasePath(value: string) {
  if (!value || value === '/') return '';
  if (/^https?:\/\//i.test(value)) return value.replace(/\/$/, '');
  return `/${value.replace(/^\/+|\/+$/g, '')}`;
}

export const BASE_PATH = normalizeBasePath(configuredBasePath);

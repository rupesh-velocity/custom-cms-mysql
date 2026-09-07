import { BASE_PATH } from '@/lib/config';

export function apiUrl(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${clean}`;
}

export async function fetchWithRetry(
  path: string,
  init: RequestInit = {},
  options: { attempts?: number; delayMs?: number } = {}
) {
  const attempts = Math.max(1, options.attempts ?? 3);
  const delayMs = Math.max(0, options.delayMs ?? 350);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(apiUrl(path), {
        credentials: 'include',
        cache: 'no-store',
        ...init,
      });

      // Retry transient dev-server/server failures, but not normal auth/validation errors.
      if (response.status >= 500 && attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network request failed.');
}

export async function fetchJsonWithRetry<T = any>(
  path: string,
  init: RequestInit = {},
  options: { attempts?: number; delayMs?: number } = {}
): Promise<T> {
  const response = await fetchWithRetry(path, init, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.details || payload?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

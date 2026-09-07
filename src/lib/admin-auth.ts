import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function readSessionPayload() {
  const store = await cookies();
  const token = store.get('cms_session')?.value;
  if (!token) return null;
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
  );
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

export async function getSessionUser() {
  try {
    const payload = await readSessionPayload();
    if (!payload?.id) return null;
    return {
      id: Number(payload.id),
      username: String(payload.username || ''),
      role: String(payload.role || ''),
    };
  } catch {
    return null;
  }
}

export async function isAdministratorSession() {
  const user = await getSessionUser();
  return String(user?.role || '').toLowerCase() === 'administrator';
}

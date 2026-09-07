export function normalizePhone(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  // Accept common human formatting, but store/use E.164 consistently.
  const compact = raw.replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) return '';
  return compact;
}

export function maskPhone(value: string): string {
  const phone = normalizePhone(value) || value;
  if (phone.length <= 4) return phone;
  const visible = phone.slice(-4);
  const prefix = phone.startsWith('+') ? '+' : '';
  const hiddenLength = Math.max(4, phone.length - visible.length - prefix.length);
  return `${prefix}${'•'.repeat(hiddenLength)}${visible}`;
}

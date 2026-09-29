export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== day) result.setDate(0);
  return result;
}

export function isCourseAccessActive(access: { expiresAt?: Date | string | null }) {
  if (!access.expiresAt) return true;
  return new Date(access.expiresAt).getTime() > Date.now();
}

export function courseAccessStatus(access: { expiresAt?: Date | string | null }) {
  return isCourseAccessActive(access) ? 'Active' : 'Expired';
}

export function daysUntil(date?: Date | string | null) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

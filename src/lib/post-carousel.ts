export type PostCarouselInput = {
  mediaId: number;
  caption?: string | null;
};

export type PostCarouselSettings = {
  heading: string | null;
  slidesPerView: 1 | 2 | 3;
  autoplay: boolean;
  autoplayDelay: number;
  pagination: boolean;
};

export function normalizePostCarouselImages(value: unknown): PostCarouselInput[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();
  const normalized: PostCarouselInput[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;

    const mediaId = Number((item as { mediaId?: unknown }).mediaId);
    if (!Number.isInteger(mediaId) || mediaId <= 0 || seen.has(mediaId)) continue;

    const rawCaption = (item as { caption?: unknown }).caption;
    const caption = typeof rawCaption === 'string' ? rawCaption.trim().slice(0, 2000) : '';

    seen.add(mediaId);
    normalized.push({
      mediaId,
      caption: caption || null,
    });

    if (normalized.length >= 50) break;
  }

  return normalized;
}

export function normalizeCarouselHeading(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const heading = value.trim().slice(0, 191);
  return heading || null;
}

export function normalizeCarouselSlidesPerView(value: unknown): 1 | 2 | 3 {
  const parsed = Number(value);
  if (parsed <= 1) return 1;
  if (parsed === 2) return 2;
  return 3;
}

export function normalizeCarouselAutoplay(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() !== 'false';
  return value !== 0;
}

export function normalizeCarouselPagination(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() !== 'false';
  return value !== 0;
}

export function normalizeCarouselAutoplayDelay(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3000;
  return Math.max(1500, Math.min(15000, Math.round(parsed)));
}

export function normalizePostCarouselSettings(value: {
  heading?: unknown;
  slidesPerView?: unknown;
  autoplay?: unknown;
  autoplayDelay?: unknown;
  pagination?: unknown;
}): PostCarouselSettings {
  return {
    heading: normalizeCarouselHeading(value.heading),
    slidesPerView: normalizeCarouselSlidesPerView(value.slidesPerView),
    autoplay: normalizeCarouselAutoplay(value.autoplay),
    autoplayDelay: normalizeCarouselAutoplayDelay(value.autoplayDelay),
    pagination: normalizeCarouselPagination(value.pagination),
  };
}

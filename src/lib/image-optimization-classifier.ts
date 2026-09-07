import { extname } from 'path';

export type OptimizationMediaRecord = {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  optimized: boolean;
  originalFilename?: string | null;
  originalMimeType?: string | null;
  originalSize?: number | null;
  originalUrl?: string | null;
};

function mimeFromExtension(filename: string) {
  const ext = extname(String(filename || '').split(/[?#]/, 1)[0]).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return '';
}

export function detectOptimizableImageFormat(
  media: Pick<OptimizationMediaRecord, 'filename' | 'url' | 'mimeType' | 'originalFilename' | 'originalMimeType'>,
) {
  // Prefer the current public filename/URL because legacy database MIME values are
  // often stale after imports or previous image conversions.
  for (const candidate of [media.filename, media.url]) {
    const mime = mimeFromExtension(candidate);
    if (mime) return mime;
  }

  for (const mime of [media.mimeType, media.originalMimeType || '']) {
    const normalized = String(mime || '').toLowerCase().trim();
    if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'image/jpeg';
    if (normalized === 'image/png') return 'image/png';
    if (normalized === 'image/webp') return 'image/webp';
  }

  // Last fallback: an original filename can identify an old/legacy image record
  // whose current filename field is incomplete.
  const originalMime = mimeFromExtension(media.originalFilename || '');
  return originalMime;
}

export function classifyOptimizationMediaRecord(media: OptimizationMediaRecord, webpEnabled: boolean) {
  const detectedMimeType = detectOptimizableImageFormat(media);
  const eligible = Boolean(detectedMimeType);
  const isWebp = detectedMimeType === 'image/webp';
  const needsOptimization = eligible && (!media.optimized || (webpEnabled && !isWebp));
  const fullyOptimized = eligible && Boolean(media.optimized) && !needsOptimization;
  const canReoptimize = eligible && Boolean(media.optimized && media.originalUrl);
  const originalBytes = Math.max(0, Number(media.originalSize || media.size || 0));
  const currentBytes = Math.max(0, Number(media.size || 0));
  const savedBytes = fullyOptimized ? Math.max(0, originalBytes - currentBytes) : 0;

  return {
    id: media.id,
    filename: media.filename,
    url: media.url,
    mimeType: media.mimeType,
    detectedMimeType,
    size: currentBytes,
    optimized: Boolean(media.optimized),
    originalSize: media.originalSize ?? null,
    originalUrl: media.originalUrl ?? null,
    eligible,
    fullyOptimized,
    needsOptimization,
    canReoptimize,
    savedBytes,
    originalBytes: fullyOptimized ? originalBytes : 0,
  };
}

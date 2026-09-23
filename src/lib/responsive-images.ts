import sharp, { type Sharp } from 'sharp';
import { basename, dirname, extname, join, resolve, sep } from 'path';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';

export const RESPONSIVE_IMAGE_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536, 1920] as const;

// Widths used by earlier versions of the optimizer. They are cleaned up when a
// media item is regenerated so old variants do not remain beside the new set.
const LEGACY_RESPONSIVE_IMAGE_WIDTHS = [96, 128, 160, 240] as const;

export type ResponsiveImageManifest = {
  sourceWidth: number;
  sourceHeight?: number;
  mimeType: string;
  variants: Array<{ width: number; relativePath: string }>;
};

function getUploadRoot() {
  return process.env.UPLOAD_ROOT?.trim() || join(process.cwd(), 'public', 'uploads');
}

function safePath(root: string, relativePath: string) {
  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, relativePath);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error('Invalid responsive image path.');
  }
  return target;
}

function manifestRelativePath(relativePath: string) {
  return join('.responsive', dirname(relativePath), `${basename(relativePath)}.json`).replace(/\\/g, '/');
}

function variantRelativePath(relativePath: string, width: number) {
  const extension = extname(relativePath);
  const name = basename(relativePath, extension);
  return join(dirname(relativePath), `${name}-${width}w${extension}`).replace(/\\/g, '/');
}

function encoder(pipe: Sharp, mimeType: string, quality: number) {
  if (mimeType === 'image/webp') {
    return pipe.webp({ quality, effort: 5, smartSubsample: true });
  }
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return pipe.jpeg({ quality, mozjpeg: true });
  }
  if (mimeType === 'image/png') {
    return pipe.png({ quality, compressionLevel: 9, effort: 8 });
  }
  return pipe;
}

export function removeResponsiveImageVariants(relativePath: string) {
  const uploadRoot = getUploadRoot();
  const manifestPath = safePath(uploadRoot, manifestRelativePath(relativePath));
  let paths = [...RESPONSIVE_IMAGE_WIDTHS, ...LEGACY_RESPONSIVE_IMAGE_WIDTHS].map(width => variantRelativePath(relativePath, width));

  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ResponsiveImageManifest;
      if (Array.isArray(manifest.variants)) {
        paths = [...new Set([...paths, ...manifest.variants.map(item => item.relativePath)])];
      }
    } catch {}
  }

  for (const relative of paths) {
    try {
      const file = safePath(uploadRoot, relative);
      if (existsSync(file)) unlinkSync(file);
    } catch {}
  }
  try {
    if (existsSync(manifestPath)) unlinkSync(manifestPath);
  } catch {}
}

export async function generateResponsiveImageVariants(
  buffer: Buffer,
  mimeType: string,
  relativePath: string,
  options: { enabled: boolean; quality: number },
) {
  removeResponsiveImageVariants(relativePath);
  if (!options.enabled) return null;

  const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
  const sourceWidth = Number(metadata.width || 0);
  if (!sourceWidth) return null;

  const sourceHeight = Number(metadata.height || 0) || undefined;
  const widths = RESPONSIVE_IMAGE_WIDTHS.filter(width => width < sourceWidth);
  const variants: ResponsiveImageManifest['variants'] = [];
  const uploadRoot = getUploadRoot();
  // Responsive delivery files can be a little more compressed than the master image.
  // This keeps PageSpeed transfer sizes down without changing the user's master quality setting.
  const variantQuality = Math.max(30, Math.min(Number(options.quality || 78), 78));

  for (const width of widths) {
    const relative = variantRelativePath(relativePath, width);
    const outputPath = safePath(uploadRoot, relative);
    mkdirSync(dirname(outputPath), { recursive: true });

    const pipe = sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true, fit: 'inside' });
    const output = await encoder(pipe, mimeType, variantQuality).toBuffer();
    writeFileSync(outputPath, output);
    variants.push({ width, relativePath: relative });
  }

  const manifest: ResponsiveImageManifest = { sourceWidth, sourceHeight, mimeType, variants };
  const manifestPath = safePath(uploadRoot, manifestRelativePath(relativePath));
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');
  return manifest;
}

function sourceParts(src: string) {
  const value = String(src || '');
  const marker = '/uploads/';
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return null;

  const prefix = value.slice(0, markerIndex);
  const after = value.slice(markerIndex + marker.length);
  const cleanRelativePath = after.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  if (!cleanRelativePath || cleanRelativePath.split('/').includes('..')) return null;
  return { prefix, relativePath: cleanRelativePath };
}

export function readResponsiveImageManifest(src: string): ResponsiveImageManifest | null {
  const parts = sourceParts(src);
  if (!parts) return null;
  try {
    const manifestPath = safePath(getUploadRoot(), manifestRelativePath(parts.relativePath));
    if (!existsSync(manifestPath)) return null;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ResponsiveImageManifest;
    if (!manifest || !Number(manifest.sourceWidth) || !Array.isArray(manifest.variants)) return null;
    // Only expose variants from the current responsive strategy. Older manifests may
    // still contain 96/128/160/240px files from previous versions of the add-on.
    // They are deliberately ignored here so legacy files can never leak into srcset.
    manifest.variants = manifest.variants.filter(item => {
      if (!item || !Number(item.width) || !item.relativePath) return false;
      const width = Number(item.width);
      if (!RESPONSIVE_IMAGE_WIDTHS.includes(width as typeof RESPONSIVE_IMAGE_WIDTHS[number])) return false;
      if (width >= Number(manifest.sourceWidth)) return false;
      try { return existsSync(safePath(getUploadRoot(), item.relativePath)); } catch { return false; }
    });
    return manifest;
  } catch {
    return null;
  }
}

export function buildResponsiveSrcSet(src: string) {
  const parts = sourceParts(src);
  const manifest = readResponsiveImageManifest(src);
  if (!parts || !manifest) return '';

  // Small assets such as icons, logos and UI graphics should not be turned into
  // viewport-sized responsive images. This is deliberately based on the source
  // dimensions recorded in the manifest, not on CSS, so a 120x120 asset can never
  // acquire a misleading 100vw sizes hint.
  if (manifest.sourceWidth <= 256) return '';

  const toUrl = (relativePath: string) => `${parts.prefix}/uploads/${relativePath.replace(/^\/+/, '')}`;
  const variants = manifest.variants
    .slice()
    .sort((a, b) => a.width - b.width);
  // If the source is too small to have a useful current variant, leave the
  // original <img> untouched instead of emitting a one-item srcset.
  if (!variants.length) return '';

  const candidates = variants.map(item => `${toUrl(item.relativePath)} ${item.width}w`);
  candidates.push(`${src} ${manifest.sourceWidth}w`);
  return [...new Set(candidates)].join(', ');
}

function fractionToVw(value: string) {
  const parts = value.split('/');
  if (parts.length !== 2) return null;
  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);
  if (!numerator || !denominator) return null;
  return `${Number(((numerator / denominator) * 100).toFixed(3))}vw`;
}

function breakpointMinWidth(prefix: string) {
  if (prefix === 'sm') return 640;
  if (prefix === 'md') return 768;
  if (prefix === 'lg') return 1024;
  if (prefix === 'xl') return 1280;
  if (prefix === '2xl') return 1536;
  return 0;
}

function inferLayoutSizes(attribs: string, ancestorAttributes: string[]) {
  const imageClass = attribs.match(/\bclass\s*=\s*["']([^"']+)["']/i)?.[1] || '';
  const allClasses = [imageClass, ...ancestorAttributes.map(value => value.match(/\bclass\s*=\s*["']([^"']+)["']/i)?.[1] || '')]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);

  // Fitnessarts has two fixed-width device images. Preserve their existing CSS
  // dimensions instead of replacing them with a generic viewport estimate.
  if (allClasses.includes('laptop')) return '(max-width: 767px) 82vw, 692px';
  if (allClasses.includes('phone')) return '(max-width: 767px) 22vw, 158px';

  const rules: Array<{ breakpoint: number; length: string }> = [];
  const seen = new Set<string>();
  const addRule = (breakpoint: number, length: string) => {
    const key = `${breakpoint}:${length}`;
    if (!seen.has(key)) { seen.add(key); rules.push({ breakpoint, length }); }
  };

  for (const token of allClasses) {
    const match = token.match(/^(sm|md|lg|xl|2xl):w-(full|1\/2|1\/3|2\/3|1\/4|3\/4|1\/5|2\/5|3\/5|4\/5)$/);
    if (match) {
      const bp = breakpointMinWidth(match[1]);
      const length = match[2] === 'full' ? '100vw' : fractionToVw(match[2]);
      if (bp && length) addRule(bp, length);
    }

    const bootstrap = token.match(/^col-(sm|md|lg|xl|xxl)-(\d{1,2})$/);
    if (bootstrap) {
      const bp = { sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 }[bootstrap[1]];
      const cols = Number(bootstrap[2]);
      if (bp && cols >= 1 && cols <= 12) addRule(bp, `${Number((cols / 12 * 100).toFixed(3))}vw`);
    }
  }

  if (!rules.length) return '';
  rules.sort((a, b) => a.breakpoint - b.breakpoint);

  // `sizes` conditions are evaluated from left to right, so emit larger
  // breakpoints first. Add a final fallback for small screens.
  const ordered = rules.sort((a, b) => b.breakpoint - a.breakpoint);
  const parts = ordered.map(rule => `(min-width: ${rule.breakpoint}px) ${rule.length}`);
  parts.push('100vw');
  return parts.join(', ');
}

export function responsiveSizesForAttributes(attribs: string, isLazy: boolean, ancestorAttributes: string[] = []) {
  const existing = attribs.match(/\bsizes\s*=\s*["']([^"']+)["']/i)?.[1]?.trim();
  if (existing && existing !== 'auto, 100vw' && existing !== '100vw') return existing;

  const widthAttr = Number(attribs.match(/\bwidth\s*=\s*["']?(\d+)["']?/i)?.[1] || 0);
  if (widthAttr > 0) return `(max-width: ${widthAttr}px) 100vw, ${widthAttr}px`;

  const style = attribs.match(/\bstyle\s*=\s*["']([^"']+)["']/i)?.[1] || '';
  const pxWidth = Number(style.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)px/i)?.[1] || 0);
  if (pxWidth > 0) return `(max-width: ${Math.round(pxWidth)}px) 100vw, ${Math.round(pxWidth)}px`;
  const percentWidth = Number(style.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)%/i)?.[1] || 0);
  if (percentWidth > 0 && percentWidth <= 100) return `${Math.round(percentWidth)}vw`;

  const layoutSize = inferLayoutSizes(attribs, ancestorAttributes);
  if (layoutSize) return layoutSize;

  // Do not use `auto, 100vw` as the default. Without width/height information,
  // that value can make Chromium select the full master image and defeat srcset.
  // 100vw is the safe fallback for unknown content; explicit layout classes above
  // provide tighter values where the CMS content tells us the real slot size.
  return '100vw';
}

export function responsiveImageProps(src: string, options: { lazy?: boolean; priority?: boolean; sizes?: string } = {}) {
  const srcSet = buildResponsiveSrcSet(src);
  const lazy = Boolean(options.lazy && !options.priority);
  return {
    ...(srcSet ? { srcSet, sizes: options.sizes || '100vw' } : {}),
    ...(options.priority ? { loading: 'eager' as const, fetchPriority: 'high' as const } : lazy ? { loading: 'lazy' as const } : {}),
    decoding: 'async' as const,
  };
}

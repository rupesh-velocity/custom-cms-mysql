import sharp from 'sharp';
import { removeResponsiveImageVariants } from './responsive-images';
import { dirname, extname, join, basename, resolve, sep } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { prisma } from '@/lib/prisma';
import { classifyOptimizationMediaRecord } from '@/lib/image-optimization-classifier';

export function getUploadRoot() {
  return process.env.UPLOAD_ROOT?.trim() || join(process.cwd(), 'public', 'uploads');
}

export function mediaRelativePath(url: string, filename: string) {
  const parts = String(url || '').split('/uploads/');
  const rel = (parts.length > 1 ? parts[1] : filename).replace(/^[/\\]+/, '');
  if (!rel || rel.split(/[\\/]+/).includes('..')) throw new Error('Invalid media path.');
  return rel;
}

function safeUploadPath(uploadRoot: string, relativePath: string) {
  const root = resolve(uploadRoot);
  const target = resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error('Invalid media path.');
  return target;
}

function publicUrlForRelativePath(existingUrl: string, relativePath: string) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const marker = '/uploads/';
  const source = String(existingUrl || '');
  const index = source.indexOf(marker);
  const prefix = index >= 0 ? source.slice(0, index) : '';
  return `${prefix}${marker}${normalized}` || `${marker}${normalized}`;
}

function uploadsPathFromUrl(value: string) {
  const marker = '/uploads/';
  const source = String(value || '');
  const index = source.indexOf(marker);
  return index >= 0 ? source.slice(index) : source;
}

function mimeFromExtension(filename: string) {
  const ext = extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return '';
}


export async function getImageOptimizationStats() {
  const [cfg, rows] = await Promise.all([
    getImageOptimizationSettings(),
    prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        url: true,
        mimeType: true,
        size: true,
        optimized: true,
        originalFilename: true,
        originalMimeType: true,
        originalSize: true,
        originalUrl: true,
      },
    }),
  ]);

  const classified = rows.map(row => classifyOptimizationMediaRecord(row, cfg.webp));
  const items = classified.filter(item => item.eligible);
  const optimizedItems = items.filter(item => item.fullyOptimized);
  const pendingItems = items.filter(item => item.needsOptimization);
  const reoptimizableItems = items.filter(item => item.canReoptimize);
  const unsupported = Math.max(0, rows.length - items.length);
  const originalBytes = optimizedItems.reduce((sum, item) => sum + item.originalBytes, 0);
  const savedBytes = optimizedItems.reduce((sum, item) => sum + item.savedBytes, 0);

  return {
    totalMedia: rows.length,
    total: items.length,
    optimized: optimizedItems.length,
    pending: pendingItems.length,
    unsupported,
    reoptimizable: reoptimizableItems.length,
    savedBytes,
    savedPercent: originalBytes > 0 ? Math.max(0, Math.round((savedBytes / originalBytes) * 100)) : 0,
    webpEnabled: cfg.webp,
    items,
  };
}

function webpRelativePath(relativePath: string) {
  return join(dirname(relativePath), `${basename(relativePath, extname(relativePath))}.webp`).replace(/\\/g, '/');
}

function originalPublicRelativePath(media: {
  url: string;
  filename: string;
  originalUrl?: string | null;
  originalFilename?: string | null;
}) {
  const currentRel = mediaRelativePath(media.url, media.filename);
  const backupRel = String(media.originalUrl || '').replace(/\\/g, '/').replace(/^\/+/, '');

  if (backupRel.startsWith('.originals/') && media.originalFilename && basename(backupRel) === media.originalFilename) {
    const rel = backupRel.slice('.originals/'.length);
    if (rel && !rel.split('/').includes('..')) return rel;
  }

  if (media.originalFilename) {
    const originalExt = extname(media.originalFilename) || extname(currentRel);
    const currentBase = basename(currentRel, extname(currentRel));
    return join(dirname(currentRel), `${currentBase}${originalExt}`).replace(/\\/g, '/');
  }

  return currentRel;
}

function replaceVariants(value: string | null | undefined, fromPath: string, toPath: string) {
  if (!value) return value || '';
  let next = String(value);
  const pairs = [
    [fromPath, toPath],
    [encodeURI(fromPath), encodeURI(toPath)],
  ];
  for (const [from, to] of pairs) {
    if (from && from !== to) next = next.split(from).join(to);
  }
  return next;
}

async function replaceMediaReferences(fromUrl: string, toUrl: string) {
  const fromPath = uploadsPathFromUrl(fromUrl);
  const toPath = uploadsPathFromUrl(toUrl);
  if (!fromPath || fromPath === toPath) return 0;

  let updates = 0;

  const pages = await prisma.page.findMany({
    where: { OR: [
      { contentHtml: { contains: fromPath } },
      { contentText: { contains: fromPath } },
      { featuredImage: { contains: fromPath } },
    ] },
    select: { id: true, contentHtml: true, contentText: true, featuredImage: true },
  });
  for (const item of pages) {
    await prisma.page.update({ where: { id: item.id }, data: {
      contentHtml: replaceVariants(item.contentHtml, fromPath, toPath),
      contentText: replaceVariants(item.contentText, fromPath, toPath),
      featuredImage: item.featuredImage ? replaceVariants(item.featuredImage, fromPath, toPath) : item.featuredImage,
    } });
    updates += 1;
  }

  const posts = await prisma.post.findMany({
    where: { OR: [
      { contentHtml: { contains: fromPath } },
      { contentText: { contains: fromPath } },
      { featuredImage: { contains: fromPath } },
    ] },
    select: { id: true, contentHtml: true, contentText: true, featuredImage: true },
  });
  for (const item of posts) {
    await prisma.post.update({ where: { id: item.id }, data: {
      contentHtml: replaceVariants(item.contentHtml, fromPath, toPath),
      contentText: replaceVariants(item.contentText, fromPath, toPath),
      featuredImage: item.featuredImage ? replaceVariants(item.featuredImage, fromPath, toPath) : item.featuredImage,
    } });
    updates += 1;
  }

  const courses = await prisma.course.findMany({
    where: { OR: [
      { contentHtml: { contains: fromPath } },
      { contentText: { contains: fromPath } },
      { featuredImage: { contains: fromPath } },
    ] },
    select: { id: true, contentHtml: true, contentText: true, featuredImage: true },
  });
  for (const item of courses) {
    await prisma.course.update({ where: { id: item.id }, data: {
      contentHtml: item.contentHtml ? replaceVariants(item.contentHtml, fromPath, toPath) : item.contentHtml,
      contentText: item.contentText ? replaceVariants(item.contentText, fromPath, toPath) : item.contentText,
      featuredImage: item.featuredImage ? replaceVariants(item.featuredImage, fromPath, toPath) : item.featuredImage,
    } });
    updates += 1;
  }

  const products = await prisma.product.findMany({
    where: { OR: [
      { description: { contains: fromPath } },
      { shortDescription: { contains: fromPath } },
      { featuredImage: { contains: fromPath } },
      { galleryImages: { contains: fromPath } },
    ] },
    select: { id: true, description: true, shortDescription: true, featuredImage: true, galleryImages: true },
  });
  for (const item of products) {
    await prisma.product.update({ where: { id: item.id }, data: {
      description: item.description ? replaceVariants(item.description, fromPath, toPath) : item.description,
      shortDescription: item.shortDescription ? replaceVariants(item.shortDescription, fromPath, toPath) : item.shortDescription,
      featuredImage: item.featuredImage ? replaceVariants(item.featuredImage, fromPath, toPath) : item.featuredImage,
      galleryImages: item.galleryImages ? replaceVariants(item.galleryImages, fromPath, toPath) : item.galleryImages,
    } });
    updates += 1;
  }

  const forms = await prisma.form.findMany({
    where: { OR: [{ fields: { contains: fromPath } }, { settings: { contains: fromPath } }] },
    select: { id: true, fields: true, settings: true },
  });
  for (const item of forms) {
    await prisma.form.update({ where: { id: item.id }, data: {
      fields: replaceVariants(item.fields, fromPath, toPath),
      settings: item.settings ? replaceVariants(item.settings, fromPath, toPath) : item.settings,
    } });
    updates += 1;
  }

  const popups = await prisma.popup.findMany({
    where: { contentHtml: { contains: fromPath } },
    select: { id: true, contentHtml: true },
  });
  for (const item of popups) {
    await prisma.popup.update({ where: { id: item.id }, data: {
      contentHtml: replaceVariants(item.contentHtml, fromPath, toPath),
    } });
    updates += 1;
  }

  const settings = await prisma.setting.findMany({
    where: { value: { contains: fromPath } },
    select: { key: true, value: true },
  });
  for (const item of settings) {
    await prisma.setting.update({ where: { key: item.key }, data: {
      value: replaceVariants(item.value, fromPath, toPath),
    } });
    updates += 1;
  }

  return updates;
}

export async function getImageOptimizationSettings() {
  const rows = await prisma.setting.findMany({ where: { key: { in: [
    'addon_image_optimization_enabled', 'image_optimize_new_uploads', 'image_convert_webp',
    'image_quality', 'image_max_width', 'image_keep_originals', 'image_lazy_load'
  ] } } });
  const map = rows.reduce((a: Record<string, string>, r: any) => { a[r.key] = r.value || ''; return a; }, {});
  return {
    enabled: map.addon_image_optimization_enabled === 'true',
    auto: map.image_optimize_new_uploads !== 'false',
    webp: map.image_convert_webp !== 'false',
    quality: Math.max(30, Math.min(100, Number(map.image_quality || 82))),
    maxWidth: Math.max(0, Number(map.image_max_width || 2560)),
    keepOriginals: map.image_keep_originals !== 'false',
    lazyLoad: map.image_lazy_load !== 'false',
  };
}

export async function optimizeBuffer(
  buffer: Buffer,
  mimeType: string,
  cfg: Awaited<ReturnType<typeof getImageOptimizationSettings>>,
  options: { preserveFormat?: boolean } = {},
) {
  let pipe = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await pipe.metadata();
  if (cfg.maxWidth && meta.width && meta.width > cfg.maxWidth) {
    pipe = pipe.resize({ width: cfg.maxWidth, withoutEnlargement: true });
  }

  if (!options.preserveFormat && cfg.webp && ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType)) {
    return { buffer: await pipe.webp({ quality: cfg.quality }).toBuffer(), mimeType: 'image/webp', extension: '.webp' };
  }
  if (mimeType === 'image/webp') return { buffer: await pipe.webp({ quality: cfg.quality }).toBuffer(), mimeType, extension: '.webp' };
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return { buffer: await pipe.jpeg({ quality: cfg.quality, mozjpeg: true }).toBuffer(), mimeType: 'image/jpeg', extension: '.jpg' };
  if (mimeType === 'image/png') return { buffer: await pipe.png({ quality: cfg.quality, compressionLevel: 9 }).toBuffer(), mimeType, extension: '.png' };
  return { buffer: await pipe.toBuffer(), mimeType, extension: extname(meta.format ? `x.${meta.format}` : '') };
}

export async function regenerateResponsiveVariants(id: number) {
  const media = await prisma.media.findUnique({
    where: { id },
    select: { id: true, filename: true, url: true, mimeType: true },
  });
  if (!media) throw new Error('Media not found');

  const cfg = await getImageOptimizationSettings();
  if (!cfg.enabled) throw new Error('Image Optimization add-on is disabled.');
  if (!cfg.responsive) throw new Error('Responsive image variants are disabled in Image Optimization settings.');

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(media.mimeType)) throw new Error('Only JPG, PNG and WebP images can generate responsive variants.');

  const relativePath = mediaRelativePath(media.url, media.filename);
  const filePath = safeUploadPath(getUploadRoot(), relativePath);
  if (!existsSync(filePath)) throw new Error('The current media file is missing from the uploads directory.');

  const buffer = readFileSync(filePath);
  const manifest = await generateResponsiveImageVariants(buffer, media.mimeType, relativePath, {
    enabled: true,
    quality: cfg.quality,
  });

  return { id: media.id, filename: media.filename, generated: manifest?.variants.length || 0 };
}

export async function optimizeExistingMedia(id: number) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new Error('Media not found');

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(media.mimeType) && !allowed.includes(media.originalMimeType || '')) {
    throw new Error('Only JPG, PNG and WebP images can be optimized.');
  }

  const cfg = await getImageOptimizationSettings();
  if (!cfg.enabled) throw new Error('Image Optimization add-on is disabled.');

  const uploadRoot = getUploadRoot();
  const currentRel = mediaRelativePath(media.url, media.filename);
  const currentPath = safeUploadPath(uploadRoot, currentRel);
  const canonicalOriginalRel = originalPublicRelativePath(media);
  const canonicalOriginalPath = safeUploadPath(uploadRoot, canonicalOriginalRel);
  const backupRel = String(media.originalUrl || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const backupPath = backupRel ? safeUploadPath(uploadRoot, backupRel) : null;

  const sourcePath = backupPath && existsSync(backupPath)
    ? backupPath
    : existsSync(canonicalOriginalPath)
      ? canonicalOriginalPath
      : existsSync(currentPath)
        ? currentPath
        : null;

  if (!sourcePath) {
    throw new Error(`Physical image file is missing. Checked uploads/${currentRel}, uploads/${canonicalOriginalRel}${backupRel ? ` and uploads/${backupRel}` : ''}.`);
  }

  const sourceBuffer = readFileSync(sourcePath);
  const sourceMimeType = media.originalMimeType || mimeFromExtension(canonicalOriginalRel) || media.mimeType;
  const originalFilename = media.originalFilename || basename(canonicalOriginalRel);
  const originalSize = media.originalSize || sourceBuffer.length;

  // Ensure the original public file continues to exist. Existing page HTML may still
  // reference it, and keeping it makes WebP conversion backward-compatible.
  if (!existsSync(canonicalOriginalPath)) {
    mkdirSync(dirname(canonicalOriginalPath), { recursive: true });
    writeFileSync(canonicalOriginalPath, sourceBuffer);
  }

  let originalBackupRel = backupRel;
  if (!originalBackupRel && cfg.keepOriginals) {
    originalBackupRel = join('.originals', canonicalOriginalRel).replace(/\\/g, '/');
    const newBackupPath = safeUploadPath(uploadRoot, originalBackupRel);
    if (!existsSync(newBackupPath)) {
      mkdirSync(dirname(newBackupPath), { recursive: true });
      writeFileSync(newBackupPath, sourceBuffer);
    }
  }

  let nextRel = canonicalOriginalRel;
  let outputMime = sourceMimeType === 'image/jpg' ? 'image/jpeg' : sourceMimeType;
  let outputBuffer: Buffer;

  if (cfg.webp) {
    const output = await optimizeBuffer(sourceBuffer, sourceMimeType, { ...cfg, webp: true }, { preserveFormat: false });
    const desiredRel = webpRelativePath(canonicalOriginalRel);
    const desiredName = basename(desiredRel);
    const conflict = await prisma.media.findFirst({
      where: { filename: desiredName, NOT: { id: media.id } },
      select: { id: true },
    });
    if (conflict) {
      const base = basename(desiredRel, '.webp');
      let counter = 1;
      while (true) {
        const candidateName = `${base}-${counter}.webp`;
        const exists = await prisma.media.findFirst({
          where: { filename: candidateName, NOT: { id: media.id } },
          select: { id: true },
        });
        if (!exists) {
          nextRel = join(dirname(desiredRel), candidateName).replace(/\\/g, '/');
          break;
        }
        counter += 1;
      }
    } else {
      nextRel = desiredRel;
    }
    const nextPath = safeUploadPath(uploadRoot, nextRel);
    mkdirSync(dirname(nextPath), { recursive: true });
    writeFileSync(nextPath, output.buffer);
    outputBuffer = output.buffer;
    outputMime = 'image/webp';
  } else {
    const output = await optimizeBuffer(sourceBuffer, sourceMimeType, cfg, { preserveFormat: true });
    mkdirSync(dirname(canonicalOriginalPath), { recursive: true });
    writeFileSync(canonicalOriginalPath, output.buffer);
    outputBuffer = output.buffer;
  }

  const nextUrl = publicUrlForRelativePath(media.url, nextRel);
  const previousUrl = media.url;

  // Update content to the generated WebP URL (or back to original format when WebP is
  // disabled), while leaving the old physical file in place as a safe fallback.
  const referencesUpdated = await replaceMediaReferences(previousUrl, nextUrl);

  const updated = await prisma.media.update({ where: { id }, data: {
    filename: basename(nextRel),
    url: nextUrl,
    mimeType: outputMime,
    size: outputBuffer.length,
    optimized: true,
    originalFilename,
    originalMimeType: media.originalMimeType || sourceMimeType,
    originalSize,
    originalUrl: originalBackupRel || media.originalUrl,
  } });
    removeResponsiveImageVariants(nextRel)

  return { ...updated, referencesUpdated, generatedWebp: outputMime === 'image/webp' };
}

export async function restoreExistingMedia(id: number) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new Error('Media not found');
  if (!media.originalFilename) throw new Error('No original image metadata is available for this image.');

  const uploadRoot = getUploadRoot();
  const currentRel = mediaRelativePath(media.url, media.filename);
  const originalRel = originalPublicRelativePath(media);
  const originalPath = safeUploadPath(uploadRoot, originalRel);
  const backupPath = media.originalUrl ? safeUploadPath(uploadRoot, media.originalUrl) : null;

  if (!existsSync(originalPath)) {
    if (!backupPath || !existsSync(backupPath)) throw new Error('Original image file and backup are both missing.');
    mkdirSync(dirname(originalPath), { recursive: true });
    writeFileSync(originalPath, readFileSync(backupPath));
  }

  const restoredBuffer = readFileSync(originalPath);
  const restoredUrl = publicUrlForRelativePath(media.url, originalRel);
  removeResponsiveImageVariants(currentRel);
  removeResponsiveImageVariants(originalRel);
  await replaceMediaReferences(media.url, restoredUrl);

  return prisma.media.update({ where: { id }, data: {
    filename: basename(originalRel),
    url: restoredUrl,
    mimeType: media.originalMimeType || mimeFromExtension(originalRel) || media.mimeType,
    size: media.originalSize || restoredBuffer.length,
    optimized: false,
  } });
}

export async function getImageOptimizationHealth() {
  const media = await prisma.media.findMany({
    where: {
      OR: [
        { mimeType: { in: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] } },
        { originalMimeType: { in: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] } },
      ],
    },
    select: {
      id: true, filename: true, url: true, optimized: true,
      originalUrl: true, originalFilename: true,
    },
  });

  const uploadRoot = getUploadRoot();
  const repairIds: number[] = [];
  const missingUnrepairableIds: number[] = [];

  for (const item of media) {
    let currentExists = false;
    let originalExists = false;
    let backupExists = false;
    try {
      const currentRel = mediaRelativePath(item.url, item.filename);
      currentExists = existsSync(safeUploadPath(uploadRoot, currentRel));
      const originalRel = originalPublicRelativePath(item);
      originalExists = existsSync(safeUploadPath(uploadRoot, originalRel));
      if (item.originalUrl) backupExists = existsSync(safeUploadPath(uploadRoot, item.originalUrl));
    } catch {
      // malformed paths are treated as missing
    }

    const needsRepair = Boolean(item.optimized && (!currentExists || !originalExists));
    if (needsRepair && (backupExists || currentExists || originalExists)) repairIds.push(item.id);
    if (!currentExists && !originalExists && !backupExists) missingUnrepairableIds.push(item.id);
  }

  return {
    total: media.length,
    repairNeeded: repairIds.length,
    repairIds,
    missingUnrepairable: missingUnrepairableIds.length,
    missingUnrepairableIds,
  };
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';
import { isAddonEnabled } from '@/lib/addons';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ScopeConfig = {
  label: string;
  model: string;
  fields: string[];
};

const scopeConfigs: Record<string, ScopeConfig[]> = {
  pages: [{
    label: 'Pages',
    model: 'page',
    fields: ['title', 'contentHtml', 'contentText', 'metaDescription', 'focusKeyword', 'seoTitle', 'redirectUrl', 'featuredImage', 'heroDescription'],
  }],
  posts: [{
    label: 'Posts',
    model: 'post',
    fields: ['title', 'contentHtml', 'contentText', 'metaDescription', 'focusKeyword', 'seoTitle', 'redirectUrl', 'featuredImage'],
  }],
  courses: [{
    label: 'Courses',
    model: 'course',
    fields: ['title', 'contentHtml', 'contentText', 'metaDescription', 'focusKeyword', 'featuredImage'],
  }],
  products: [{
    label: 'Products',
    model: 'product',
    fields: ['title', 'description', 'shortDescription', 'featuredImage', 'galleryImages'],
  }],
  menus: [{
    label: 'Menus',
    model: 'menuItem',
    fields: ['label', 'url'],
  }],
  taxonomies: [
    { label: 'Categories', model: 'category', fields: ['name', 'description'] },
    { label: 'Tags', model: 'tag', fields: ['name', 'description'] },
    { label: 'Product Categories', model: 'productCategory', fields: ['name', 'description'] },
  ],
  media: [{
    label: 'Media',
    model: 'media',
    fields: ['url', 'altText', 'originalUrl'],
  }],
  forms: [{
    label: 'Forms',
    model: 'form',
    fields: ['title', 'fields', 'settings', 'notificationEmail'],
  }],
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countOccurrences(value: string, search: string, caseSensitive: boolean) {
  if (!value || !search) return 0;
  if (caseSensitive) return value.split(search).length - 1;
  const matches = value.match(new RegExp(escapeRegExp(search), 'gi'));
  return matches?.length || 0;
}

function replaceOccurrences(value: string, search: string, replacement: string, caseSensitive: boolean) {
  if (!value || !search) return value;
  if (caseSensitive) return value.split(search).join(replacement);
  return value.replace(new RegExp(escapeRegExp(search), 'gi'), () => replacement);
}

function prismaModel(name: string) {
  return (prisma as any)[name];
}

export async function POST(request: Request) {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAddonEnabled('addon_search_replace_enabled'))) {
    return NextResponse.json({ error: 'Enable the Search & Replace add-on before using this tool.' }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = body?.action === 'replace' ? 'replace' : 'preview';
    const dryRun = body?.dryRun === true;
    const search = String(body?.search ?? '');
    const replacement = String(body?.replacement ?? '');
    const caseSensitive = body?.caseSensitive === true;
    const requestedScopes: string[] = Array.isArray(body.scopes) ? body.scopes.map((value) => String(value)) : [];
    const scopes: string[] = Array.from(new Set<string>(requestedScopes)).filter((scope) => Boolean(scopeConfigs[scope]));

    if (!search) {
      return NextResponse.json({ error: 'Search text is required.' }, { status: 400 });
    }
    if (search.length > 10000 || replacement.length > 10000) {
      return NextResponse.json({ error: 'Search and replacement values must each be 10,000 characters or less.' }, { status: 400 });
    }
    if (!scopes.length) {
      return NextResponse.json({ error: 'Select at least one content type.' }, { status: 400 });
    }

    const results: Array<{ scope: string; label: string; records: number; matches: number; fields: Record<string, number> }> = [];
    const updateOperations: any[] = [];
    let totalRecords = 0;
    let totalMatches = 0;

    for (const scope of scopes) {
      const configs = scopeConfigs[scope];
      let scopeRecords = 0;
      let scopeMatches = 0;
      const scopeFields: Record<string, number> = {};

      for (const config of configs) {
        const model = prismaModel(config.model);
        if (!model) continue;

        const select = config.fields.reduce((acc: Record<string, boolean>, field) => {
          acc[field] = true;
          return acc;
        }, { id: true });

        const rows = await model.findMany({ select });
        let configRecords = 0;
        let configMatches = 0;
        const configFields: Record<string, number> = {};

        for (const row of rows) {
          let rowMatches = 0;
          const updateData: Record<string, string> = {};

          for (const field of config.fields) {
            const raw = row[field];
            if (typeof raw !== 'string' || !raw) continue;
            const count = countOccurrences(raw, search, caseSensitive);
            if (!count) continue;

            rowMatches += count;
            configFields[field] = (configFields[field] || 0) + count;
            if (action === 'replace') {
              updateData[field] = replaceOccurrences(raw, search, replacement, caseSensitive);
            }
          }

          if (rowMatches > 0) {
            configRecords += 1;
            configMatches += rowMatches;
            if (action === 'replace' && Object.keys(updateData).length) {
              updateOperations.push(model.update({ where: { id: row.id }, data: updateData }));
            }
          }
        }

        scopeRecords += configRecords;
        scopeMatches += configMatches;
        Object.entries(configFields).forEach(([field, count]) => {
          const label = configs.length > 1 ? `${config.label}.${field}` : field;
          scopeFields[label] = (scopeFields[label] || 0) + count;
        });
      }

      totalRecords += scopeRecords;
      totalMatches += scopeMatches;
      results.push({
        scope,
        label: scope === 'taxonomies' ? 'Categories & Tags' : configs[0]?.label || scope,
        records: scopeRecords,
        matches: scopeMatches,
        fields: scopeFields,
      });
    }

    if (action === 'replace' && !dryRun && updateOperations.length) {
      // Keep transaction batches modest for shared-hosting/MySQL connection limits.
      const batchSize = 50;
      for (let index = 0; index < updateOperations.length; index += batchSize) {
        await prisma.$transaction(updateOperations.slice(index, index + batchSize));
      }
    }

    return NextResponse.json(
      { action: dryRun ? 'dry-run' : action, totalRecords, totalMatches, results, dryRun },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Search & Replace error:', error);
    return NextResponse.json({ error: 'Search & Replace failed. No further changes were attempted.' }, { status: 500 });
  }
}

export function normalizeBase(value:string|undefined|null) {
  const v=String(value||'').trim().replace(/^\/+|\/+$/g,'');
  return v;
}
export function buildPostUrl(slug:string, settings:Record<string,any>={}) {
  const base=normalizeBase(settings.permalink_post_base);
  const trail=settings.permalink_trailing_slash !== 'false';
  const path=`/${base?base+'/':''}${slug}`;
  return trail ? `${path}/` : path;
}
export function buildCategoryUrl(slug:string, settings:Record<string,any>={}) {
  const base=normalizeBase(settings.permalink_category_base)||'category';
  const trail=settings.permalink_trailing_slash !== 'false';
  const path=`/${base}/${slug}`;
  return trail ? `${path}/` : path;
}
export function buildTagUrl(slug:string, settings:Record<string,any>={}) {
  const base=normalizeBase(settings.permalink_tag_base)||'tag';
  const trail=settings.permalink_trailing_slash !== 'false';
  const path=`/${base}/${slug}`;
  return trail ? `${path}/` : path;
}

/**
 * Schema utilities for the public site.
 *
 * The CMS keeps two schema layers separate, similar to Rank Math:
 *  1. automatic site/page entities (Organization, WebSite, WebPage, etc.)
 *  2. optional schemas saved from the Schema Generator/importer.
 *
 * Both layers are merged into one JSON-LD @graph on the frontend.
 */

function cleanUrl(value: string | undefined | null, fallback = ''): string {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw.replace(/\/+$/, '');
}

export function resolveAbsoluteUrl(value: string | undefined | null, siteUrl: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    return new URL(raw, `${cleanUrl(siteUrl, 'http://localhost:3000')}/`).toString();
  } catch {
    return raw;
  }
}

function parseJson(value: any, fallback: any) {
  if (value === null || value === undefined || value === '') return fallback;
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return fallback; }
}

function sanitizeArticleSchema(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeArticleSchema);
  if (!value || typeof value !== 'object') return value;

  const result: any = {};
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();

    // Never emit the old generator's invalid Article property.
    if (normalizedKey === 'articletype') continue;

    result[key] = sanitizeArticleSchema(child);
  }

  const type = result['@type'];
  const types = Array.isArray(type) ? type : [type];
  const isArticle = types.includes('Article') || types.includes('BlogPosting') || types.includes('NewsArticle');

  if (isArticle) {
    // Schema.org Article-family types use headline. Convert legacy saved
    // `name` values so old records become valid without database editing.
    if (!result.headline && result.name) result.headline = result.name;
    delete result.name;
    delete result.articletype;
    delete result.articleType;
  }

  // The old Service generator created this placeholder automatically even
  // though the current Service UI has no availability field. Remove that
  // exact legacy placeholder; real offers containing price/currency/etc. stay.
  if (types.includes('Service') && result.offers && typeof result.offers === 'object' && !Array.isArray(result.offers)) {
    const offerKeys = Object.keys(result.offers).filter((k) => k !== '@type');
    if (result.offers['@type'] === 'Offer' && offerKeys.length === 1 && result.offers.availability === 'InStock') {
      delete result.offers;
    }
  }

  // Never keep an empty ImageObject produced by an older schema template.
  if (result.image && typeof result.image === 'object' && !Array.isArray(result.image)) {
    const imageKeys = Object.keys(result.image).filter((k) => k !== '@type');
    if (result.image['@type'] === 'ImageObject' && imageKeys.length === 0) delete result.image;
  }

  return result;
}

function removeEmptyFields(value: any): any {
  if (Array.isArray(value)) {
    const items = value.map(removeEmptyFields).filter((item) => item !== undefined && item !== null && item !== '');
    return items.length ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const result: any = {};
    for (const [key, child] of Object.entries(value)) {
      const cleaned = removeEmptyFields(child);
      if (cleaned !== undefined && cleaned !== null && cleaned !== '') result[key] = cleaned;
    }
    return Object.keys(result).length ? result : undefined;
  }
  return value;
}

/**
 * Recursively replaces schema variables with current page/site values.
 */
export function processSchemaVariables(schemaInput: any, postData: any, settings: Record<string, string> = {}): any {
  if (!schemaInput) return schemaInput;

  let schemas = schemaInput;
  if (typeof schemas === 'string') {
    try { schemas = JSON.parse(schemas); } catch { return null; }
  }

  const siteUrl = cleanUrl(settings.site_url || settings.seo_local_url, 'http://localhost:3000');
  const siteName = String(settings.site_title || settings.seo_local_website_name || settings.seo_local_org_name || '').trim();
  const siteDesc = String(settings.site_tagline || settings.seo_local_desc || '').trim();
  const excerpt = String(
    postData.metaDescription ||
    (postData.contentText || postData.contentHtml || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
  ).trim();
  const authorName = postData.author
    ? `${postData.author.firstName || ''} ${postData.author.lastName || ''}`.trim() || postData.author.username || ''
    : '';
  const pageUrl = resolveAbsoluteUrl(
    postData.__type === 'post' && postData.slug ? `/${postData.slug}` : postData.slug ? `/${postData.slug}` : '/',
    siteUrl
  );

  const variables: Record<string, string> = {
    '%seo_title%': String(postData.seoTitle || postData.title || ''),
    '%seo_description%': String(postData.metaDescription || excerpt || ''),
    '%title%': String(postData.title || ''),
    '%url%': pageUrl,
    '%keywords%': String(postData.focusKeyword || ''),
    '%date_published%': postData.publishedAt || postData.createdAt ? new Date(postData.publishedAt || postData.createdAt).toISOString() : '',
    '%date_modified%': postData.updatedAt ? new Date(postData.updatedAt).toISOString() : '',
    '%author_name%': authorName,
    '%sitename%': siteName,
    '%sitedesc%': siteDesc,
    '%sep%': String(settings.seo_separator || '-'),
    '%org_name%': String(settings.seo_local_org_name || settings.seo_local_website_name || siteName),
    '%org_url%': resolveAbsoluteUrl(settings.seo_local_url || siteUrl, siteUrl),
    '%org_logo%': resolveAbsoluteUrl(settings.seo_local_logo || '', siteUrl),
    '%post_thumbnail%': resolveAbsoluteUrl(postData.featuredImage || settings.seo_og_thumbnail || '', siteUrl),
    '%excerpt%': excerpt,
    '%currentyear%': String(new Date().getFullYear()),
    '%currentmonth%': new Date().toLocaleDateString('en-US', { month: 'long' }),
    '%currentday%': new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    '%currentdate%': new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };

  const replaceVars = (text: string) => {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), value);
    }
    return result;
  };

  const walk = (node: any): any => {
    if (typeof node === 'string') return replaceVars(node);
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out: any = {};
      for (const [key, value] of Object.entries(node)) out[key] = walk(value);
      return out;
    }
    return node;
  };

  return walk(schemas);
}

/**
 * Formats schemas into one Schema.org @graph and removes nested @context keys.
 */
export function formatSchemaGraph(parsedSchemas: any | any[]): any {
  if (!parsedSchemas) return null;
  const schemasArray = Array.isArray(parsedSchemas) ? parsedSchemas : [parsedSchemas];
  const graphItems: any[] = [];

  const add = (schema: any) => {
    if (!schema || typeof schema !== 'object') return;
    if (Array.isArray(schema)) {
      schema.forEach(add);
      return;
    }
    if (Array.isArray(schema['@graph'])) {
      schema['@graph'].forEach(add);
      return;
    }
    graphItems.push(schema);
  };
  schemasArray.forEach(add);

  const cleanContext = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(cleanContext);
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === '@context') continue;
        result[key] = cleanContext(value);
      }
      return result;
    }
    return obj;
  };

  if (!graphItems.length) return null;
  return {
    '@context': 'https://schema.org',
    '@graph': graphItems.map(cleanContext),
  };
}

/**
 * Automatic Rank-Math-style site/page graph.
 * `schemaJson` is intentionally handled separately by the caller so a saved
 * manual schema can override the configured default page schema without
 * removing the global Organization/WebSite/Page entities.
 */
export function generateAutomaticSchemaGraph(
  data: any,
  settings: Record<string, string>,
  options: { isHome?: boolean; slug?: string } = {}
): any {
  const siteUrl = cleanUrl(settings.site_url || settings.seo_local_url, 'http://localhost:3000');
  const isHome = !!options.isHome;
  const slug = isHome ? '' : String(options.slug || data?.slug || '').replace(/^\/+|\/+$/g, '');
  const pageUrl = isHome ? `${siteUrl}/` : `${siteUrl}/${slug}`;
  const pageId = `${pageUrl}#webpage`;
  const websiteId = `${siteUrl}/#website`;
  const orgType = settings.seo_local_type === 'person'
    ? 'Person'
    : (settings.seo_local_business_type || 'Organization');
  const orgId = `${siteUrl}/#organization`;
  const logoUrl = resolveAbsoluteUrl(settings.seo_local_logo || '', siteUrl);
  const featuredImage = resolveAbsoluteUrl(data?.featuredImage || '', siteUrl);
  const orgName = String(settings.seo_local_org_name || settings.seo_local_website_name || settings.site_title || '').trim();
  const websiteName = String(settings.seo_local_website_name || settings.site_title || orgName).trim();

  const graph: any[] = [];

  const address = parseJson(settings.seo_local_address, null);
  const hasAddress = address && (address.streetAddress || address.addressLocality || address.addressRegion || address.postalCode || address.addressCountry);
  const placeId = `${siteUrl}/#place`;

  if (hasAddress) {
    graph.push({
      '@type': 'Place',
      '@id': placeId,
      address: removeEmptyFields({
        '@type': 'PostalAddress',
        streetAddress: address.streetAddress,
        addressLocality: address.addressLocality,
        addressRegion: address.addressRegion,
        postalCode: address.postalCode,
        addressCountry: address.addressCountry,
      }),
    });
  }

  if (orgName || settings.seo_local_url || logoUrl) {
    const organization: any = {
      '@type': orgType,
      '@id': orgId,
      name: orgName,
      url: resolveAbsoluteUrl(settings.seo_local_url || siteUrl, siteUrl),
    };
    if (settings.seo_local_website_alt_name) organization.alternateName = settings.seo_local_website_alt_name;
    if (logoUrl) {
      organization.logo = {
        '@type': 'ImageObject',
        '@id': `${siteUrl}/#logo`,
        url: logoUrl,
        contentUrl: logoUrl,
        caption: orgName || websiteName,
      };
      organization.image = logoUrl;
    }
    if (settings.seo_local_email) organization.email = settings.seo_local_email;
    // priceRange is valid for LocalBusiness and its subtypes, not generic Organization.
    const priceRangeTypes = new Set([
      'LocalBusiness','AnimalShelter','ArchiveOrganization','AutomotiveBusiness','ChildCare',
      'Dentist','DryCleaningOrLaundry','EmergencyService','EmploymentAgency','EntertainmentBusiness',
      'FinancialService','FoodEstablishment','GovernmentOffice','HealthAndBeautyBusiness',
      'HomeAndConstructionBusiness','InternetCafe','LegalService','Library','LodgingBusiness',
      'MedicalBusiness','ProfessionalService','RadioStation','RealEstateAgent','RecyclingCenter',
      'SelfStorage','ShoppingCenter','SportsActivityLocation','Store','TelevisionStation',
      'TouristInformationCenter','TravelAgency','Restaurant','FastFoodRestaurant','CafeOrCoffeeShop',
      'BarOrPub','Bakery','BeautySalon','DaySpa','HealthClub','AutoDealer','AutoRepair','Electrician',
      'GeneralContractor','HVACBusiness','Locksmith','MovingCompany','Plumber','RoofingContractor',
      'Attorney','AccountingService','InsuranceAgency','Physician','VeterinaryCare','Hotel','Motel','Resort'
    ]);
    if (settings.seo_local_price_range && priceRangeTypes.has(orgType)) {
      organization.priceRange = settings.seo_local_price_range;
    }
    if (hasAddress) organization.address = graph[0].address;
    if (hasAddress) organization.location = { '@id': placeId };

    const phones = parseJson(settings.seo_local_phones, []);
    if (Array.isArray(phones) && phones.length) {
      organization.contactPoint = phones.filter((p: any) => p?.number).map((p: any) => ({
        '@type': 'ContactPoint',
        telephone: p.number,
        contactType: p.type || 'customer support',
      }));
    }

    const openingHours = parseJson(settings.seo_local_opening_hours, []);
    if (Array.isArray(openingHours) && openingHours.length) {
      organization.openingHoursSpecification = openingHours.filter((h: any) => h?.day && h?.timeStart && h?.timeEnd).map((h: any) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: h.day,
        opens: h.timeStart,
        closes: h.timeEnd,
      }));
    }

    const sameAs: string[] = [];
    if (settings.seo_social_fb_url) sameAs.push(settings.seo_social_fb_url);
    if (settings.seo_social_twitter_username) {
      const tw = settings.seo_social_twitter_username.trim();
      sameAs.push(/^https?:\/\//i.test(tw) ? tw : `https://twitter.com/${tw.replace(/^@/, '')}`);
    }
    const profiles = parseJson(settings.seo_social_additional_profiles, []);
    if (Array.isArray(profiles)) profiles.forEach((v: any) => { if (typeof v === 'string' && v.trim()) sameAs.push(v.trim()); });
    const additional = parseJson(settings.seo_local_additional_info, []);
    if (Array.isArray(additional)) additional.forEach((item: any) => {
      if (String(item?.key || '').toLowerCase() === 'sameas' && item?.value) sameAs.push(String(item.value).trim());
    });
    if (sameAs.length) organization.sameAs = Array.from(new Set(sameAs));
    graph.push(organization);
  }

  const website: any = {
    '@type': 'WebSite',
    '@id': websiteId,
    url: `${siteUrl}/`,
    name: websiteName,
    publisher: { '@id': orgId },
  };
  if (settings.seo_local_website_alt_name) website.alternateName = settings.seo_local_website_alt_name;
  website.potentialAction = {
    '@type': 'SearchAction',
    target: `${siteUrl}/?s={search_term_string}`,
    'query-input': 'required name=search_term_string',
  };
  graph.push(website);

  if (featuredImage) {
    graph.push({
      '@type': 'ImageObject',
      '@id': `${featuredImage}#image`,
      url: featuredImage,
    });
  }

  const aboutSlug = String(settings.seo_local_about_page || '').replace(/^\/+|\/+$/g, '');
  const contactSlug = String(settings.seo_local_contact_page || '').replace(/^\/+|\/+$/g, '');
  const currentSlug = slug;
  let pageType = data?.__type === 'post' ? 'WebPage' : 'WebPage';
  if (!isHome && currentSlug && aboutSlug && currentSlug === aboutSlug) pageType = 'AboutPage';
  if (!isHome && currentSlug && contactSlug && currentSlug === contactSlug) pageType = 'ContactPage';

  const pageEntity: any = {
    '@type': pageType,
    '@id': pageId,
    url: pageUrl,
    name: String(data?.seoTitle || data?.title || websiteName || '').trim(),
    isPartOf: { '@id': websiteId },
  };
  if (settings.seo_local_desc && isHome) pageEntity.description = settings.seo_local_desc;
  if (data?.publishedAt || data?.createdAt) pageEntity.datePublished = new Date(data.publishedAt || data.createdAt).toISOString();
  if (data?.updatedAt) pageEntity.dateModified = new Date(data.updatedAt).toISOString();
  if (featuredImage) pageEntity.primaryImageOfPage = { '@id': `${featuredImage}#image` };
  if (orgName) pageEntity.about = { '@id': orgId };
  graph.push(pageEntity);

  const breadcrumb = generateBreadcrumbSchema(slug ? `/${slug}` : '/', data?.title || websiteName || '', settings);
  if (breadcrumb) {
    const breadcrumbId = `${pageUrl}#breadcrumb`;
    breadcrumb['@id'] = breadcrumbId;
    graph.push(breadcrumb);
    pageEntity.breadcrumb = { '@id': breadcrumbId };
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}


/**
 * Builds the complete public-page graph. Automatic entities are always kept;
 * a saved manual schema replaces the configured generic default schema but is
 * appended to the same graph along with WebPage/AboutPage/ContactPage and
 * BreadcrumbList.
 */
export function generatePublicSchemaGraph(
  data: any,
  settings: Record<string, string>,
  options: { isHome?: boolean; slug?: string; manualSchema?: any } = {}
): any | null {
  const automatic = generateAutomaticSchemaGraph(data, settings, options);
  if (!automatic) return null;

  const graph = Array.isArray(automatic['@graph']) ? [...automatic['@graph']] : [];
  const isHome = !!options.isHome;
  const slug = String(options.slug || data?.slug || '').replace(/^\/+|\/+$/g, '');
  const aboutSlug = String(settings.seo_local_about_page || '').replace(/^\/+|\/+$/g, '');
  const contactSlug = String(settings.seo_local_contact_page || '').replace(/^\/+|\/+$/g, '');
  const specialPage = !isHome && (slug === aboutSlug || slug === contactSlug);

  const manual = options.manualSchema;
  const hasManual = !!manual && !(typeof manual === 'string' && !manual.trim());

  // A configured generic schema is the Rank-Math-style default. About/Contact
  // use their automatic page type instead, unless the user explicitly adds a
  // schema through the generator.
  if (!hasManual && !specialPage) {
    const configuredType = data?.__type === 'post'
      ? settings.seo_post_schema_type
      : settings.seo_page_schema_type;
    if (configuredType && configuredType !== 'None' && configuredType !== 'WebPage') {
      const type = configuredType === 'FAQ' ? 'FAQPage'
        : configuredType === 'Job Posting' ? 'JobPosting'
        : configuredType === 'Fact Check' ? 'ClaimReview'
        : configuredType === 'Podcast Episode' ? 'PodcastEpisode'
        : configuredType;
      graph.push(removeEmptyFields({
        '@type': type,
        '@id': `${isHome ? `${cleanUrl(settings.site_url || settings.seo_local_url, 'http://localhost:3000')}/` : `${cleanUrl(settings.site_url || settings.seo_local_url, 'http://localhost:3000')}/${slug}`}#${String(type).toLowerCase()}`,
        name: data?.seoTitle || data?.title || '',
        description: data?.metaDescription || '',
      }));
    }
  }

  if (hasManual) {
    const processed = processSchemaVariables(manual, data, settings);
    if (processed) {
      const cleaned = removeEmptyFields(sanitizeArticleSchema(processed));
      // Normalize every supported saved format, including nested arrays and
      // nested @graph objects, before merging into the automatic graph.
      const normalized = formatSchemaGraph(cleaned);
      if (normalized?.['@graph'] && Array.isArray(normalized['@graph'])) {
        graph.push(...normalized['@graph']);
      }
    }
  }

  return formatSchemaGraph(graph);
}

/** Generates a BreadcrumbList JSON-LD schema from breadcrumb settings. */
export function generateBreadcrumbSchema(slug: string, title: string, settings: Record<string, string>): any | null {
  if (settings['breadcrumbs_enabled'] !== 'true') return null;

  const siteUrl = cleanUrl(settings.site_url || settings.seo_local_url, 'http://localhost:3000');
  const showHome = settings['breadcrumbs_show_home'] !== 'false';
  const homeLabel = settings['breadcrumbs_home_label'] || 'Home';
  const homeLink = settings['breadcrumbs_home_link'] || '/';
  const paths = String(slug || '').split('/').filter(Boolean);
  const items: any[] = [];
  let position = 1;

  if (showHome) {
    const homeUrl = resolveAbsoluteUrl(homeLink, siteUrl);
    items.push({
      '@type': 'ListItem',
      position: position++,
      item: { '@id': homeUrl, name: homeLabel },
    });
  }

  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const isLast = index === paths.length - 1;
    if (isLast && settings['breadcrumbs_hide_title'] === 'true' && items.length > 0) return;
    const formattedPath = path.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const itemUrl = resolveAbsoluteUrl(currentPath, siteUrl);
    items.push({
      '@type': 'ListItem',
      position: position++,
      item: { '@id': itemUrl, name: isLast ? title : formattedPath },
    });
  });

  if (items.length <= 1 && !showHome) return null;
  return { '@type': 'BreadcrumbList', itemListElement: items };
}

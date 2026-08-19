/**
 * Schema Parser Utility
 * Recursively iterates through a JSON-LD schema object and replaces dynamic variables.
 */

export function processSchemaVariables(schemaInput: any, postData: any): any {
  if (!schemaInput) return schemaInput;

  // If it's a string, try to parse it first
  let schemas = schemaInput;
  if (typeof schemas === 'string') {
    try {
      schemas = JSON.parse(schemas);
    } catch {
      return null;
    }
  }

  // Define our available variables
  const variables = {
    '%seo_title%': postData.seoTitle || postData.title || '',
    '%seo_description%': postData.metaDescription || (postData.contentHtml ? postData.contentHtml.replace(/<[^>]*>?/gm, '').substring(0, 160) : ''),
    '%title%': postData.title || '',
    '%url%': `https://${process.env.NEXT_PUBLIC_SITE_DOMAIN || 'example.com'}/${postData.slug || ''}`,
    '%keywords%': postData.focusKeyword || '',
    '%date_published%': postData.publishedAt || postData.createdAt || '',
    '%date_modified%': postData.updatedAt || '',
    '%author_name%': postData.author ? `${postData.author.firstName || ''} ${postData.author.lastName || ''}`.trim() : 'Admin',
  };

  // Helper to replace variables in a string
  const replaceVarsInString = (str: string) => {
    let result = str;
    for (const [key, value] of Object.entries(variables)) {
      if (result.includes(key)) {
        // Ensure stringification of dates or handle empty values safely
        result = result.replace(new RegExp(key, 'g'), String(value || ''));
      }
    }
    return result;
  };

  // Recursive function to walk the schema object
  const walk = (node: any): any => {
    if (typeof node === 'string') {
      return replaceVarsInString(node);
    }
    
    if (Array.isArray(node)) {
      return node.map(item => walk(item));
    }
    
    if (node !== null && typeof node === 'object') {
      const newNode: any = {};
      for (const [key, value] of Object.entries(node)) {
        newNode[key] = walk(value);
      }
      return newNode;
    }
    
    return node;
  };

  return walk(schemas);
}

/**
 * Formats an array of schemas into a single @graph object with a root @context,
 * stripping out redundant @context declarations from nested entities.
 */
export function formatSchemaGraph(parsedSchemas: any | any[]): any {
  if (!parsedSchemas) return null;
  
  const schemasArray = Array.isArray(parsedSchemas) ? parsedSchemas : [parsedSchemas];
  if (schemasArray.length === 0) return null;
  
  let graphItems: any[] = [];
  
  schemasArray.forEach(schema => {
    if (schema && typeof schema === 'object' && schema['@graph'] && Array.isArray(schema['@graph'])) {
      // If the user already provided a graph object, extract its items
      graphItems = graphItems.concat(schema['@graph']);
    } else if (schema && typeof schema === 'object') {
      graphItems.push(schema);
    }
  });
  
  if (graphItems.length === 0) return null;
  
  // Recursively clean up @context from all child schemas
  const cleanContext = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(cleanContext);
    }
    if (obj !== null && typeof obj === 'object') {
      const newObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === '@context') continue;
        newObj[key] = cleanContext(value);
      }
      return newObj;
    }
    return obj;
  };
  
  return {
    "@context": "https://schema.org",
    "@graph": graphItems.map(cleanContext)
  };
}

/**
 * Generates a BreadcrumbList JSON-LD schema based on the site's breadcrumb settings
 */
export function generateBreadcrumbSchema(slug: string, title: string, settings: Record<string, string>): any | null {
  if (settings['breadcrumbs_enabled'] !== 'true') return null;

  const showHome = settings['breadcrumbs_show_home'] !== 'false';
  const homeLabel = settings['breadcrumbs_home_label'] || 'Home';
  const homeLink = settings['breadcrumbs_home_link'] || '/';
  
  const paths = slug.split('/').filter(p => p);
  const items: any[] = [];
  
  let position = 1;
  
  if (showHome) {
    items.push({
      "@type": "ListItem",
      "position": position++,
      "name": homeLabel,
      "item": `https://${process.env.NEXT_PUBLIC_SITE_DOMAIN || 'example.com'}${homeLink}`
    });
  }
  
  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const isLast = index === paths.length - 1;
    
    // If it's the last item and we hide the title, we skip adding it if there are other items
    if (isLast && settings['breadcrumbs_hide_title'] === 'true' && items.length > 0) {
      return;
    }
    
    const formattedPath = path.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    items.push({
      "@type": "ListItem",
      "position": position++,
      "name": isLast ? title : formattedPath,
      "item": `https://${process.env.NEXT_PUBLIC_SITE_DOMAIN || 'example.com'}${currentPath}`
    });
  });

  if (items.length <= 1 && !showHome) {
    return null;
  }

  return {
    "@type": "BreadcrumbList",
    "itemListElement": items
  };
}

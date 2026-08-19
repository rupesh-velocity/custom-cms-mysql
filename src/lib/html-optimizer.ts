export function optimizeHtmlImages(html: string | null, seoSettings?: Record<string, string>, contextTitle: string = ''): string {
  if (!html) return '';
  
  let isFirstImage = true;
  let imageCount = 1;
  
  let htmlWithOptimizedImages = html.replace(/<img([^>]*)>/gi, (match, attribs) => {
    let newAttribs = attribs;
    
    // 1. Optimize Cloudinary URLs (f_auto,q_auto)
    newAttribs = newAttribs.replace(
      /src="https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(v[0-9]+\/[^"]+)"/i,
      'src="https://res.cloudinary.com/$1/image/upload/f_auto,q_auto/$2"'
    );
    
    // 2. Fix LCP priority
    newAttribs = newAttribs.replace(/loading="[^"]*"/i, '');
    newAttribs = newAttribs.replace(/fetchpriority="[^"]*"/i, '');
    
    if (isFirstImage) {
      isFirstImage = false;
      newAttribs += ' loading="eager" fetchpriority="high"';
    } else {
      newAttribs += ' loading="lazy"';
    }

    // SEO: Add missing ALT
    if (seoSettings?.seo_add_missing_alt === 'true' && !/alt=/i.test(newAttribs)) {
      let altFormat = seoSettings?.seo_image_alt_format || '%title% %count(title)%';
      altFormat = altFormat.replace(/%title%/gi, contextTitle).replace(/%count\([^)]*\)%/gi, imageCount.toString()).trim() || 'Image';
      newAttribs += ` alt="${altFormat.replace(/"/g, '&quot;')}"`;
    }

    // SEO: Add missing TITLE
    if (seoSettings?.seo_add_missing_title === 'true' && !/title=/i.test(newAttribs)) {
      let titleFormat = seoSettings?.seo_image_title_format || '%title% %count(title)%';
      titleFormat = titleFormat.replace(/%title%/gi, contextTitle).replace(/%count\([^)]*\)%/gi, imageCount.toString()).trim() || 'Image';
      newAttribs += ` title="${titleFormat.replace(/"/g, '&quot;')}"`;
    }

    imageCount++;
    return `<img ${newAttribs}>`;
  });

  let optimized = htmlWithOptimizedImages;

  // SEO: Optimize Links
  if (seoSettings) {
    optimized = optimized.replace(/<a(\s[^>]*)?>/gi, (match, attribs) => {
      let newAttribs = attribs || '';
      
      const isExternal = /href="https?:\/\//i.test(newAttribs) && !newAttribs.includes(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      const isImageFile = /href="[^"]+\.(jpg|jpeg|png|gif|webp|svg)"/i.test(newAttribs);

      if (isExternal && seoSettings.seo_nofollow_external === 'true' && !/rel=/i.test(newAttribs)) {
        newAttribs += ' rel="nofollow"';
      }

      if (isImageFile && seoSettings.seo_nofollow_image === 'true' && !/rel=/i.test(newAttribs)) {
        newAttribs += ' rel="nofollow"';
      }

      if (isExternal && seoSettings.seo_open_external_new_tab === 'true' && !/target=/i.test(newAttribs)) {
        newAttribs += ' target="_blank"';
      }

      return `<a${newAttribs}>`;
    });
  }

  // 3. Optimize iframes (Video Facades)
  optimized = optimized.replace(/<iframe([^>]*)>[\s\S]*?<\/iframe>/gi, (match, attribs) => {
    // Check if it's a Vimeo iframe
    const vimeoMatch = attribs.match(/src="https:\/\/player\.vimeo\.com\/video\/([0-9]+)[^"]*"/i);
    
    if (vimeoMatch) {
      const vimeoId = vimeoMatch[1];
      const styleMatch = attribs.match(/style="([^"]+)"/i);
      
      // We must enforce an aspect ratio so the div doesn't collapse to 0 height 
      // when the absolute iframe replaces the img content.
      let inlineStyle = styleMatch ? styleMatch[1].trim() : '';
      if (inlineStyle && !inlineStyle.endsWith(';')) inlineStyle += ';';
      if (!inlineStyle.includes('aspect-ratio') && !inlineStyle.includes('height')) {
        inlineStyle += ' aspect-ratio: 16/9;';
      }
      if (!inlineStyle.includes('width')) {
        inlineStyle += ' width: 100%;';
      }
      
      // Ensure it never overflows on mobile even if a fixed width like 546px is provided
      if (!inlineStyle.includes('max-width')) {
        inlineStyle += ' max-width: 100%;';
      }
      
            // Clean up multiple spaces and semicolons to prevent html-react-parser crashes
      inlineStyle = inlineStyle.replace(/;+/g, ';').trim();
      if (inlineStyle.startsWith(';')) inlineStyle = inlineStyle.substring(1).trim();
      
      const styleAttr = inlineStyle ? `style="${inlineStyle}"` : '';
      
      return `
        <div class="video-facade vimeo-facade relative overflow-hidden rounded-xl cursor-pointer group my-6 bg-black" data-vimeo-id="${vimeoId}" ${styleAttr}>
          <img src="https://vumbnail.com/${vimeoId}.jpg" alt="Vimeo Video" loading="lazy" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-16 h-12 bg-[#00adef] rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M5 3l14 9-14 9V3z" /></svg>
            </div>
          </div>
        </div>
      `;
    }
    
    // For other iframes, just add lazy loading
    let newAttribs = attribs.replace(/loading="[^"]*"/i, '');
    return `<iframe ${newAttribs} loading="lazy"></iframe>`;
  });

  return optimized;
}

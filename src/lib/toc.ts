export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export function generateToc(html: string): { processedHtml: string; headings: TocHeading[] } {
  if (!html) return { processedHtml: '', headings: [] };

  const headings: TocHeading[] = [];
  let idCounter = 0;
  
  // Regex to match <h2> and <h3> tags and capture their inner content
  const processedHtml = html.replace(/<h([23])[^>]*>(.*?)<\/h\1>/gi, (match, levelStr, content) => {
    const level = parseInt(levelStr, 10);
    
    // Strip HTML tags to get pure text for the TOC
    const plainText = content.replace(/<[^>]+>/g, '').trim();
    if (!plainText) return match; // skip empty headings
    
    // Generate a URL-friendly ID
    let id = plainText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // Handle empty or duplicate IDs
    if (!id || headings.some(h => h.id === id)) {
      id = `${id ? id + '-' : 'heading-'}${++idCounter}`;
    }
    
    headings.push({ id, text: plainText, level });
    
    // Inject the ID into the heading tag
    return `<h${level} id="${id}">${content}</h${level}>`;
  });

  return { processedHtml, headings };
}

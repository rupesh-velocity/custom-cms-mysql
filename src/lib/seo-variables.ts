export interface SeoVariablesContext {
  title?: string;
  siteName?: string;
  separator?: string;
  excerpt?: string;
  siteDesc?: string;
  authorName?: string;
  authorId?: string;
  category?: string;
  postId?: string;
  postDate?: string;
  modifiedDate?: string;
  capitalizeTitles?: boolean;
}

export function resolveSeoVariables(text: string | undefined | null, context: SeoVariablesContext): string {
  if (!text) return '';
  
  const { 
    title = '', siteName = '', separator = '-', excerpt = '', siteDesc = '',
    authorName = '', authorId = '', category = '', postId = '', postDate = '', modifiedDate = ''
  } = context;

  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });
  const currentYear = now.getFullYear().toString();

  let template = text;
  if (!siteName) {
    // If Site Title is empty, remove the common separator + sitename pair
    // instead of inventing a CMS/agency brand fallback.
    template = template
      .replace(/\s*%sep%\s*%sitename%/gi, '')
      .replace(/%sitename%\s*%sep%\s*/gi, '');
  }

  let resolved = template
    .replace(/%title%/gi, title)
    .replace(/%sitename%/gi, siteName)
    .replace(/%sep%/gi, separator)
    .replace(/%excerpt%/gi, excerpt)
    .replace(/%sitedesc%/gi, siteDesc)
    .replace(/%currentdate%/gi, currentDate)
    .replace(/%currentday%/gi, currentDay)
    .replace(/%currentmonth%/gi, currentMonth)
    .replace(/%currentyear%/gi, currentYear)
    .replace(/%name%/gi, authorName)
    .replace(/%userid%/gi, authorId)
    .replace(/%category%/gi, category)
    .replace(/%id%/gi, postId)
    .replace(/%date%/gi, postDate)
    .replace(/%modified%/gi, modifiedDate);
    
  if (context.capitalizeTitles) {
    // Basic title case: capitalize first letter of each word
    resolved = resolved.replace(/\b\w/g, c => c.toUpperCase());
  }
  
  return resolved;
}

export function getResolvedLength(text: string | undefined | null, context: SeoVariablesContext): number {
  return resolveSeoVariables(text, context).length;
}

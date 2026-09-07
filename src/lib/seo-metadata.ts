import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { resolveSeoVariables } from '@/lib/seo-variables';

export interface PageSeoContext {
  title?: string | null;
  description?: string | null; // Raw description (could be %excerpt%)
  url?: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean; // Page specific override
  robots?: string | null; // Page/post-level robots override
  advancedRobots?: string | null; // Page/post-level advanced robots override
  
  // Provide raw data to resolve variables
  rawTitle?: string | null;
  rawContentText?: string | null;
  authorName?: string;
  authorId?: string;
  category?: string;
  postId?: string;
  postDate?: string;
  modifiedDate?: string;
  isPost?: boolean;
}

import { unstable_noStore as noStore } from 'next/cache';

export async function generateFullMetadata(context: PageSeoContext): Promise<Metadata> {
  noStore();
  let settingsRecords: any[] = [];
  
  if (process.env.npm_lifecycle_event === 'build' || process.env.IS_NEXT_BUILD === 'true') {
    try {
      const fs = require('fs');
      const path = require('path');
      const data = fs.readFileSync(path.join(process.cwd(), 'src/settings.json'), 'utf-8');
      const parsed = JSON.parse(data);
      settingsRecords = Object.keys(parsed).map(key => ({ key, value: parsed[key] }));
    } catch (e) {
      console.warn('Could not read settings.json during build');
    }
  } else {
    try {
      settingsRecords = await prisma.setting.findMany({
        where: {
          key: {
            in: [
              'site_title', 'site_tagline', 'site_icon', 'site_url',
              'seo_separator', 'seo_capitalize_titles', 
              'seo_page_title', 'seo_post_title', 'seo_page_desc', 'seo_post_desc',
              'seo_global_robots', 'seo_global_advanced_robots',
              'seo_global_adv_snippet', 'seo_global_adv_snippet_val', 'seo_global_adv_video', 'seo_global_adv_video_val', 'seo_global_adv_image', 'seo_global_adv_image_val',
              'seo_page_robots', 'seo_page_advanced_robots', 'seo_page_adv_snippet_val', 'seo_page_adv_video_val', 'seo_page_adv_image_val',
              'seo_post_robots', 'seo_post_advanced_robots', 'seo_post_adv_snippet_val', 'seo_post_adv_video_val', 'seo_post_adv_image_val',
              'seo_og_thumbnail', 'seo_twitter_card',
              'seo_social_fb_url', 'seo_social_twitter_username',
              'seo_google_verify', 'seo_bing_verify', 'seo_baidu_verify', 
              'seo_yandex_verify', 'seo_pinterest_verify',
              'seo_page_slack_enhanced', 'seo_post_slack_enhanced'
            ]
          }
        }
      });
    } catch (error) {
      console.warn("Could not fetch global SEO settings during runtime.");
    }
  }

  const settings = settingsRecords.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  const siteName = String(settings.site_title || '').trim();
  const siteUrl = settings.site_url || 'http://localhost:3000';
  const capitalizeTitles = settings.seo_capitalize_titles === 'true';

  // Construct context for variable replacement
  const varContext = {
    title: context.rawTitle || context.title || '',
    siteName,
    separator: settings.seo_separator || '-',
    excerpt: context.description || context.rawContentText?.substring(0, 160) || settings.site_tagline || '',
    siteDesc: settings.site_tagline || '',
    authorName: context.authorName || '',
    authorId: context.authorId || '',
    category: context.category || '',
    postId: context.postId || '',
    postDate: context.postDate || '',
    modifiedDate: context.modifiedDate || '',
    capitalizeTitles,
  };

  // Determine Title format
  let titleFormat = context.title || '%title% %sep% %sitename%';
  if (!context.title) {
    if (context.isPost && settings.seo_post_title) {
      titleFormat = settings.seo_post_title;
    } else if (!context.isPost && settings.seo_page_title) {
      titleFormat = settings.seo_page_title;
    }
  }

  const finalTitle = resolveSeoVariables(titleFormat, varContext);
  
  let descriptionFormat = context.description || '';
  if (!descriptionFormat) {
    descriptionFormat = context.isPost
      ? (settings.seo_post_desc || '%excerpt%')
      : (settings.seo_page_desc || '%excerpt%');
  }
  const rawDescription = resolveSeoVariables(descriptionFormat, varContext) || varContext.excerpt;
  const finalDescription = rawDescription?.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim() || '';

  // Images
  const ogImage = context.image || settings.seo_og_thumbnail;
  
  // Robots
  let isNoIndex = context.noIndex || false;
  let isNoFollow = false;
  let isNoArchive = false;
  let isNoImageIndex = false;
  let isNoSnippet = false;

  const makeAdvanced = (prefix: string, fallback = '') => {
    const values: string[] = [];
    const snippet = settings[`${prefix}_snippet_val`];
    const video = settings[`${prefix}_video_val`];
    const image = settings[`${prefix}_image_val`];
    const snippetEnabled = settings[`${prefix}_snippet`];
    const videoEnabled = settings[`${prefix}_video`];
    const imageEnabled = settings[`${prefix}_image`];
    if ((snippetEnabled === undefined || snippetEnabled === 'true') && snippet !== undefined && snippet !== '') values.push(`max-snippet:${snippet}`);
    if ((videoEnabled === undefined || videoEnabled === 'true') && video !== undefined && video !== '') values.push(`max-video-preview:${video}`);
    if ((imageEnabled === undefined || imageEnabled === 'true') && image !== undefined && image !== '') values.push(`max-image-preview:${String(image).toLowerCase()}`);
    const hasExplicitToggles = [snippetEnabled, videoEnabled, imageEnabled].some((value) => value !== undefined);
    if (hasExplicitToggles) return values.join(',');
    return values.length ? values.join(',') : fallback;
  };

  let robotsSetting = settings.seo_global_robots || 'index';
  let advancedRobotsSetting = makeAdvanced('seo_global_adv', settings.seo_global_advanced_robots || '');

  if (context.isPost && settings.seo_post_robots && settings.seo_post_robots !== 'default') {
    robotsSetting = settings.seo_post_robots;
    advancedRobotsSetting = makeAdvanced('seo_post_adv', settings.seo_post_advanced_robots === 'default' ? advancedRobotsSetting : (settings.seo_post_advanced_robots || advancedRobotsSetting));
  } else if (!context.isPost && settings.seo_page_robots && settings.seo_page_robots !== 'default') {
    robotsSetting = settings.seo_page_robots;
    advancedRobotsSetting = makeAdvanced('seo_page_adv', settings.seo_page_advanced_robots === 'default' ? advancedRobotsSetting : (settings.seo_page_advanced_robots || advancedRobotsSetting));
  }

  // A page/post override always wins over the global/type defaults. Null means
  // inherit; an empty string is an explicit index/follow style override.
  if (context.robots !== null && context.robots !== undefined) {
    robotsSetting = context.robots.trim() || 'index';
  }
  if (context.advancedRobots !== null && context.advancedRobots !== undefined) {
    advancedRobotsSetting = context.advancedRobots.trim();
  }

  const robotTokens = robotsSetting.split(',').map((s: string) => s.toLowerCase().replace(/\s+/g, ''));
  if (robotTokens.includes('noindex')) isNoIndex = true;
  if (robotTokens.includes('nofollow')) isNoFollow = true;
  if (robotTokens.includes('noarchive')) isNoArchive = true;
  if (robotTokens.includes('noimageindex')) isNoImageIndex = true;
  if (robotTokens.includes('nosnippet')) isNoSnippet = true;

  const robots: any = {
    index: !isNoIndex,
    follow: !isNoFollow,
    nocache: isNoArchive,
    noimageindex: isNoImageIndex,
    nosnippet: isNoSnippet,
  };

  if (advancedRobotsSetting && advancedRobotsSetting !== 'default') {
    // Supports both the legacy "snippet:-1" format and the editor's
    // "max-snippet:-1" format.
    const advParts = advancedRobotsSetting.split(',');
    advParts.forEach((part: string) => {
      const separatorIndex = part.indexOf(':');
      if (separatorIndex < 0) return;
      const k = part.slice(0, separatorIndex).trim().toLowerCase();
      const v = part.slice(separatorIndex + 1).trim().toLowerCase();
      if (k === 'snippet' || k === 'max-snippet') robots.maxSnippet = Number.isFinite(Number(v)) ? Number(v) : v;
      if (k === 'video' || k === 'max-video-preview') robots.maxVideoPreview = Number.isFinite(Number(v)) ? Number(v) : v;
      if (k === 'image' || k === 'max-image-preview') {
        if (['large', 'standard', 'none'].includes(v)) robots.maxImagePreview = v;
      }
    });
  }

  const metadata: Metadata & { other?: any } = {
    metadataBase: new URL(siteUrl),
    title: finalTitle,
    description: finalDescription,
    robots,
    alternates: context.url ? {
      canonical: context.url,
    } : undefined,
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      url: context.url || siteUrl,
      siteName: siteName,
      type: context.type || 'website',
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: (settings.seo_twitter_card as any) || 'summary_large_image',
      title: finalTitle,
      description: finalDescription,
      site: settings.seo_social_twitter_username || undefined,
      images: ogImage ? [ogImage] : [],
    },
    icons: settings.site_icon ? {
      icon: [{ url: settings.site_icon }],
      shortcut: [{ url: settings.site_icon }],
      apple: [{ url: settings.site_icon }],
    } : undefined,
    verification: {
      google: settings.seo_google_verify,
      yahoo: settings.seo_bing_verify,
      yandex: settings.seo_yandex_verify,
      other: {
        'msvalidate.01': settings.seo_bing_verify,
        'baidu-site-verification': settings.seo_baidu_verify,
        'p:domain_verify': settings.seo_pinterest_verify,
      },
    }
  };

  const slackEnhanced = context.isPost ? settings.seo_post_slack_enhanced === 'true' : settings.seo_page_slack_enhanced === 'true';
  if (slackEnhanced && context.rawContentText) {
    const wordCount = context.rawContentText.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    metadata.other = {
      ...(metadata.other || {}),
      'twitter:label1': 'Est. reading time',
      'twitter:data1': `${readingTime} minute${readingTime > 1 ? 's' : ''}`
    };
  }

  return metadata;
}

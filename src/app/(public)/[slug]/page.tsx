import { redirect, notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { optimizeHtmlImages } from '@/lib/html-optimizer';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { processSchemaVariables, formatSchemaGraph, generateBreadcrumbSchema } from '@/lib/schema-parser';
import { resolveSeoVariables } from '@/lib/seo-variables';
import PasswordProtectedForm from '@/components/PasswordProtectedForm';
import BlogSidebar from '@/components/BlogSidebar';
import CopyLinkButton from '@/components/CopyLinkButton';
import { Link as LinkIcon, User } from 'lucide-react';
import { generateToc } from '@/lib/toc';
import TableOfContents from '@/components/TableOfContents';
import ShopClient from '@/components/shop/ShopClient';
import ContentRenderer from '@/components/ContentRenderer';
import PageHeroBanner from '@/components/PageHeroBanner';
import BodyClassInjector from '@/components/BodyClassInjector';
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);


export const dynamic = 'force-dynamic';

async function getPageOrPost(slug: string) {
  let data: any = await prisma.page.findUnique({ where: { slug } });
  if (data) {
    return data.status !== 'Draft' ? { ...data, __type: 'page' } : null;
  }
  
  data = await prisma.post.findUnique({ 
    where: { slug },
    include: { author: true, categories: true }
  });
  if (data) {
    return data.status !== 'Draft' ? { ...data, __type: 'post' } : null;
  }
  
  return null;
}

import { generateFullMetadata } from '@/lib/seo-metadata';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPageOrPost(slug);
  
  if (!data) {
    return {
      title: 'Not Found',
      description: 'The page you are looking for does not exist.'
    };
  }

  const seoContext: any = {
    title: data.seoTitle,
    rawTitle: data.title,
    description: data.metaDescription,
    rawContentText: data.contentText,
    authorName: data.author ? `${data.author.firstName || ''} ${data.author.lastName || ''}`.trim() || data.author.username : '',
    authorId: data.authorId?.toString() || '',
    category: data.categories && data.categories.length > 0 ? data.categories[0].name : '',
    postId: data.id?.toString() || '',
    postDate: data.publishedAt ? new Date(data.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '',
    modifiedDate: data.updatedAt ? new Date(data.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '',
    isPost: data.__type === 'post',
    type: data.__type === 'post' ? 'article' : 'website',
    noIndex: data.noIndex,
    image: data.featuredImage,
    url: `/${slug}`,
  };

  return generateFullMetadata(seoContext);
}

export default async function PublicPage(props: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const slug = params.slug;
  
  const data = await getPageOrPost(slug);
  
  if (!data) {
    notFound();
  }

  const cookieStore = await cookies();

  if (data.visibility === 'Private') {
    if (!cookieStore.get('cms_session')) {
      notFound();
    }
  }

  // Check if this slug is actually the homepage
  const displayModeSetting = await prisma.setting.findUnique({ where: { key: 'homepage_displays' } });
  const homepageSetting = await prisma.setting.findUnique({ where: { key: 'homepage_page_id' } });
  const postsPageSetting = await prisma.setting.findUnique({ where: { key: 'posts_page_id' } });
  
  // If this page is currently set as the static homepage, redirect to root
  if (data.__type === 'page' && displayModeSetting?.value === 'static_page' && homepageSetting?.value === String(data.id)) {
    redirect('/');
  }

  const isPostsPage = data.__type === 'page' && displayModeSetting?.value === 'static_page' && postsPageSetting?.value === String(data.id);
  
  const shopPageSetting = await prisma.setting.findUnique({ where: { key: 'shop_page_id' } });
  const isShopPage = data.__type === 'page' && shopPageSetting?.value === String(data.id);
  
  const coursesPageSetting = await prisma.setting.findUnique({ where: { key: 'courses_page_id' } });
  const isCoursesPage = data.__type === 'page' && coursesPageSetting?.value === String(data.id);

  // Handle page/post level SEO redirect if configured
  if (data.redirectUrl) {
    if (data.redirectType === '301') {
      permanentRedirect(data.redirectUrl);
    } else {
      redirect(data.redirectUrl);
    }
  }

  // 2. Fetch SEO, Breadcrumbs, and Site global settings
  const settings = await prisma.setting.findMany({
    where: { 
      OR: [
        { key: { startsWith: 'seo_' } }, 
        { key: { startsWith: 'breadcrumbs_' } },
        { key: { in: ['site_title', 'site_tagline'] } }
      ] 
    }
  });
  
  const seoSettings = settings.reduce((acc: Record<string, string>, curr) => {
    acc[curr.key] = curr.value || '';
    return acc;
  }, {});

  const breadcrumbSettingsMap = settings.filter(s => s.key.startsWith('breadcrumbs_')).reduce((acc: any, curr) => { acc[curr.key] = curr.value; return acc; }, {});
  const initialBreadcrumbSettings = {
    enabled: breadcrumbSettingsMap.breadcrumbs_enabled === 'true',
    separator: breadcrumbSettingsMap.breadcrumbs_separator || '-',
    showHome: breadcrumbSettingsMap.breadcrumbs_show_home !== 'false',
    homeLabel: breadcrumbSettingsMap.breadcrumbs_home_label || 'Home',
    homeLink: breadcrumbSettingsMap.breadcrumbs_home_link || '/',
    prefix: breadcrumbSettingsMap.breadcrumbs_prefix || '',
    hideTitle: breadcrumbSettingsMap.breadcrumbs_hide_title === 'true'
  };

  // 3. Fetch blog settings if this is the posts page
  let posts: any[] = [];
  let feedInclude = 'full_text';
  let totalPages = 1;
  let currentPage = 1;
  
  const isLoggedIn = !!cookieStore.get('cms_session');

  if (isPostsPage) {
    const limitSetting = await prisma.setting.findUnique({ where: { key: 'blog_pages_at_most' } });
    const feedIncludeSetting = await prisma.setting.findUnique({ where: { key: 'feed_include' } });
    const limit = parseInt(limitSetting?.value || '10');
    feedInclude = feedIncludeSetting?.value || 'full_text';
    currentPage = parseInt((searchParams?.page as string) || '1') || 1;
    const skip = (currentPage - 1) * limit;

    const visibilityFilter = isLoggedIn ? {} : { visibility: { not: 'Private' } };

    posts = await prisma.post.findMany({
      where: { 
        status: 'Published',
        ...visibilityFilter
      },
      orderBy: { publishedAt: 'desc' },
      include: { author: true, categories: true },
      skip,
      take: limit,
    });
    
    const totalPosts = await prisma.post.count({
      where: { 
        status: 'Published',
        ...visibilityFilter
      }
    });
    totalPages = Math.ceil(totalPosts / limit);
  }

  const showAuthorBoxSetting = await prisma.setting.findUnique({ where: { key: 'show_author_box' } });
  const showAuthorBox = showAuthorBoxSetting?.value !== 'false';

  let shopItems: any[] = [];
  let shopMode: 'products' | 'courses' | 'all' = 'all';

  if (isShopPage || isCoursesPage) {
    let courses: any[] = [];
    let products: any[] = [];

    if (isCoursesPage) {
      shopMode = 'courses';
      courses = await prisma.course.findMany({
        where: { status: 'Published' },
        select: { id: true, title: true, slug: true, featuredImage: true, price: true, salePrice: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      shopMode = 'products';
      products = await prisma.product.findMany({
        where: { status: 'Published' },
        select: { id: true, title: true, slug: true, featuredImage: true, price: true, salePrice: true, type: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    const normalizedCourses = courses.map(c => ({
      id: `course-${c.id}`,
      originalId: c.id,
      type: 'course',
      title: c.title,
      slug: c.slug,
      image: c.featuredImage,
      price: c.price,
      salePrice: c.salePrice,
      url: `/courses/${c.slug}`
    }));

    const normalizedProducts = products.map(p => ({
      id: `product-${p.id}`,
      originalId: p.id,
      type: 'product',
      title: p.title,
      slug: p.slug,
      image: p.featuredImage,
      price: p.price,
      salePrice: p.salePrice,
      url: `/product/${p.slug || p.id}`
    }));

    shopItems = [...normalizedCourses, ...normalizedProducts].sort((a, b) => 
      a.title.localeCompare(b.title)
    );
  }

  // 4. Fetch HTML Sitemap data if enabled and this is the designated page
  let sitemapData = { posts: [] as any[], pages: [] as any[] };
  const isHtmlSitemapPage = data.__type === 'page' && seoSettings['seo_sitemap_html_enable'] === 'true' && seoSettings['seo_sitemap_html_format'] === 'page' && seoSettings['seo_sitemap_html_page'] === String(data.id);
  const hasShortcode = seoSettings['seo_sitemap_html_enable'] === 'true' && seoSettings['seo_sitemap_html_format'] === 'shortcode' && (data.contentHtml || '').includes('[html_sitemap]');

  let finalHtmlContent = data.contentHtml;

  if (isHtmlSitemapPage || hasShortcode) {
     const orderBy: any = seoSettings['seo_sitemap_html_sort'] === 'modified_date' ? { updatedAt: 'desc' } : 
                     seoSettings['seo_sitemap_html_sort'] === 'alphabetical' ? { title: 'asc' } :
                     seoSettings['seo_sitemap_html_sort'] === 'id' ? { id: 'asc' } :
                     { publishedAt: 'desc' };

     sitemapData.posts = await prisma.post.findMany({
       where: { status: 'Published', noIndex: false },
       orderBy: orderBy.publishedAt ? { createdAt: 'desc' } : orderBy, // Fallback for publishedAt if null
       select: { id: true, title: true, seoTitle: true, slug: true, publishedAt: true, updatedAt: true, createdAt: true }
     });
     
     sitemapData.pages = await prisma.page.findMany({
       where: { status: 'Published', noIndex: false },
       orderBy: orderBy.publishedAt ? { createdAt: 'desc' } : orderBy,
       select: { id: true, title: true, seoTitle: true, slug: true, publishedAt: true, updatedAt: true, createdAt: true }
     });
     
     // Correctly sort by publishedAt explicitly since it might be null and Prisma sorting with nulls can be tricky
     if (seoSettings['seo_sitemap_html_sort'] === 'published_date' || !seoSettings['seo_sitemap_html_sort']) {
       const sortByDateDesc = (a: any, b: any) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
       sitemapData.posts.sort(sortByDateDesc);
       sitemapData.pages.sort(sortByDateDesc);
     }

     const getResolvedTitle = (item: any, isPost: boolean) => {
       if (seoSettings['seo_sitemap_html_titles'] !== 'seo_titles') return item.title;
       let titleFormat = item.seoTitle || '';
       if (!titleFormat) {
         titleFormat = isPost ? (seoSettings['seo_post_title'] || '%title% %sep% %sitename%') : (seoSettings['seo_page_title'] || '%title% %sep% %sitename%');
       }
       return resolveSeoVariables(titleFormat, {
         title: item.title,
         siteName: seoSettings['site_title'] || 'Custom CMS',
         separator: seoSettings['seo_separator'] || '-',
         siteDesc: seoSettings['site_tagline'] || '',
         capitalizeTitles: seoSettings['seo_capitalize_titles'] === 'true'
       });
     };

     let pagesHtml = sitemapData.pages.map(p => `
       <li class="flex flex-col gap-1 mb-3">
         <a href="/${p.slug === 'home' ? '' : p.slug}" class="text-gray-700 hover:text-[#5e3fde] hover:underline font-medium decoration-[#5e3fde] underline-offset-2">
           ${getResolvedTitle(p, false)}
         </a>
         ${seoSettings['seo_sitemap_html_dates'] === 'true' ? `<span class="text-xs text-gray-400">${new Date(p.publishedAt || p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>` : ''}
       </li>
     `).join('');

     let postsHtml = sitemapData.posts.map(p => `
       <li class="flex flex-col gap-1 mb-3">
         <a href="/${p.slug}" class="text-gray-700 hover:text-[#5e3fde] hover:underline font-medium decoration-[#5e3fde] underline-offset-2">
           ${getResolvedTitle(p, true)}
         </a>
         ${seoSettings['seo_sitemap_html_dates'] === 'true' ? `<span class="text-xs text-gray-400">${new Date(p.publishedAt || p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>` : ''}
       </li>
     `).join('');

     const sitemapHtml = `
       <div class="html-sitemap-container bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 my-8 not-prose w-full">
         <h2 class="text-3xl font-bold font-outfit mb-8 text-gray-900 border-b border-gray-100 pb-4">HTML Sitemap</h2>
         <div class="grid md:grid-cols-2 gap-12">
           <div>
             <h3 class="text-xl font-bold text-[#5e3fde] mb-6 flex items-center gap-2">
               <span class="w-8 h-8 rounded-lg bg-[#5e3fde]/10 flex items-center justify-center text-sm">📄</span> Pages
             </h3>
             <ul class="space-y-3 m-0 p-0 list-none">${pagesHtml}</ul>
           </div>
           <div>
             <h3 class="text-xl font-bold text-[#5e3fde] mb-6 flex items-center gap-2">
               <span class="w-8 h-8 rounded-lg bg-[#5e3fde]/10 flex items-center justify-center text-sm">📝</span> Posts
             </h3>
             <ul class="space-y-3 m-0 p-0 list-none">${postsHtml}</ul>
           </div>
         </div>
       </div>
     `;

     if (hasShortcode) {
       finalHtmlContent = (finalHtmlContent || '').replace(/\<p\>\[html_sitemap\]\<\/p\>|\[html_sitemap\]/g, sitemapHtml);
     } else if (isHtmlSitemapPage) {
       finalHtmlContent = (finalHtmlContent || '') + sitemapHtml;
     }
  }

  return (
    <>
      <BodyClassInjector type={data.__type} id={data.id} />
      {(() => {
        let parsedSchemas: any[] = [];
        if (data.schemaJson) {
          let processed = processSchemaVariables(data.schemaJson, data);
          if (processed) {
            if (Array.isArray(processed)) {
              parsedSchemas = processed;
            } else if (processed['@graph']) {
              parsedSchemas = processed['@graph'];
            } else {
              parsedSchemas = [processed];
            }
          }
        }

        // Generate Breadcrumbs Schema
        const breadcrumbSchema = generateBreadcrumbSchema(slug, data.title || '', seoSettings);
        if (breadcrumbSchema) {
          parsedSchemas.push(breadcrumbSchema);
        }
        
        if (parsedSchemas.length === 0) return null;

        const graphSchema = formatSchemaGraph(parsedSchemas);
        if (!graphSchema) return null;
        
        return (
          <script 
            type="application/ld+json" 
            dangerouslySetInnerHTML={{ __html: JSON.stringify(graphSchema) }} 
          />
        );
      })()}
      
      {/* Webmaster Tools Verification tags are now handled globally in layout.tsx */}

      {data.visibility === 'Password Protected' && cookieStore.get(`post_pass_${data.id}`)?.value !== data.password ? (
        <PasswordProtectedForm id={data.id} type={data.__type} title={data.title} />
      ) : isPostsPage ? (
        <div className="min-h-screen w-full pb-16">
          <PageHeroBanner 
            title={data.title || 'Blog'} 
            description="Discover our latest news, articles, and insights."
            breadcrumbSettings={initialBreadcrumbSettings}
          />

          <div className="max-w-[1200px] mx-auto px-4 flex flex-col lg:flex-row gap-12 mt-12">
            <div className="flex-1 min-w-0">
              {posts.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-gray-100">
                  <p className="text-gray-500 text-lg">No posts published yet.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {posts.map((post: any) => (
                 <article key={post.id} className="blog-post-card">
                      {post.featuredImage && (
                        <Link href={`/${post.slug}`} className="blog-post-img-wrap">
                          <img src={post.featuredImage} alt={post.title} className="blog-post-img" />
                          <div className="blog-post-img-spacer"></div>
                        </Link>
                      )}
                      <div className="blog-post-content">
                        <div className="blog-post-category">
                          {post.categories?.map((cat: any, i: number) => (
                            <span key={cat.id}>
                              <Link href={`/category/${cat.slug}`}>{cat.name}</Link>
                            </span>
                          ))}
                        </div>
                        <Link href={`/${post.slug}`} className="block group">
                          <h2 className="blog-post-title">
                            {post.title}
                          </h2>
                        </Link>
                        <div className="blog-post-meta">
                          {post.author?.firstName && <span>By {post.author.firstName} {post.author.lastName}</span>}
                          {post.author?.firstName && <span>•</span>}
                          <span>
                            {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </span>
                        </div>
                        
                        {post.visibility === 'Password Protected' && cookieStore.get(`post_pass_${post.id}`)?.value !== post.password ? (
                          <div className="blog-post-excerpt">
                            <p>This content is password protected.</p>
                            <Link href={`/${post.slug}`} className="blog-post-read-more">
                              Enter Password &rarr;
                            </Link>
                          </div>
                        ) : (
                          <div className="blog-post-excerpt">
                            <p>{(post.contentText || '').substring(0, 180)}...</p>
                            <Link href={`/${post.slug}`} className="blog-post-read-more">
                              Read more &rarr;
                            </Link>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-8">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <Link
                          key={i}
                          href={`/${slug}?page=${i + 1}`}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-colors ${
                            currentPage === i + 1 
                              ? 'bg-[#5e3fde] text-white' 
                              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {i + 1}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <BlogSidebar />
          </div>
        </div>
      ) : data.__type === 'post' ? (
        <div className="min-h-screen w-full pb-16">
          <PageHeroBanner 
            title={data.title} 
            image={data.featuredImage}
            description={
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex justify-center flex-wrap items-center gap-2 text-sm text-[#a5b4fc] font-bold tracking-wide uppercase">
                  {data.categories?.map((cat: any, i: number) => (
                    <span key={cat.id}>
                      <Link href={`/category/${cat.slug}`} className="hover:text-white transition-colors">{cat.name}</Link>
                      {i < data.categories.length - 1 ? ' • ' : ''}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 text-sm text-white/80 font-medium mt-1">
                  {data.author?.firstName && <span>By <strong className="text-white">{data.author.firstName} {data.author.lastName}</strong></span>}
                  {data.author?.firstName && <span>•</span>}
                  <span>
                    {new Date(data.publishedAt || data.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            }
            breadcrumbSettings={initialBreadcrumbSettings}
          />

          <div className="max-w-[1200px] mx-auto px-4 flex flex-col lg:flex-row gap-12 mt-12">
            <main className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 md:p-12 lg:px-16 pt-12 md:pt-16">
                
                {(() => {
                  const optimizedHtml = optimizeHtmlImages(finalHtmlContent, seoSettings, data.title);
                  const { processedHtml, headings } = generateToc(optimizedHtml);
                  return (
                    <>
                      <TableOfContents headings={headings} />
                      <ContentRenderer html={processedHtml} className="prose prose-lg md:prose-xl prose-blue mx-auto text-gray-800" />
                    </>
                  );
                })()}
                
                {/* Share Buttons */}
                <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <h3 className="text-gray-900 font-bold font-outfit text-xl">Share this article</h3>
                  <div className="flex items-center gap-3">
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(data.title)}&url=YOUR_DOMAIN/${data.slug}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-[#1DA1F2] hover:text-white transition-colors">
                      <TwitterIcon className="w-5 h-5" />
                    </a>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=YOUR_DOMAIN/${data.slug}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-[#4267B2] hover:text-white transition-colors">
                      <FacebookIcon className="w-5 h-5" />
                    </a>
                    <a href={`https://www.linkedin.com/shareArticle?mini=true&url=YOUR_DOMAIN/${data.slug}&title=${encodeURIComponent(data.title)}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-[#0077B5] hover:text-white transition-colors">
                      <LinkedinIcon className="w-5 h-5" />
                    </a>
                    <CopyLinkButton url={`https://YOUR_DOMAIN/${data.slug}`} />
                  </div>
                </div>

                {/* Author Box */}
                {showAuthorBox && data.author && (
                  <div className="mt-12 bg-gray-50 rounded-2xl p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border border-gray-100">
                    <div className="w-24 h-24 bg-[#5e3fde] text-white rounded-full flex items-center justify-center shrink-0 shadow-lg">
                      <User className="w-10 h-10" />
                    </div>
                    <div className="text-center sm:text-left">
                      <h4 className="text-xl font-bold text-gray-900 font-outfit mb-2">{data.author.firstName} {data.author.lastName}</h4>
                      <p className="text-gray-600 leading-relaxed">
                        Author at this blog. Writing about technology, design, and modern web development.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </main>
            
            <BlogSidebar />
          </div>
        </div>
      ) : (isShopPage || isCoursesPage) ? (
        <main className="w-full bg-gray-50 min-h-screen">
          <PageHeroBanner 
            title={data.title} 
            description={
              finalHtmlContent && finalHtmlContent.trim() !== '<p></p>' ? (
                <ContentRenderer 
                  html={optimizeHtmlImages(finalHtmlContent, seoSettings, data.title)} 
                  className="text-xl text-gray-300 max-w-3xl mx-auto font-medium leading-relaxed prose prose-invert prose-p:mb-0 text-center w-full mt-4"
                />
              ) : undefined
            }
            breadcrumbSettings={initialBreadcrumbSettings}
          />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 pb-24">
             <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10">
               <ShopClient initialItems={shopItems} mode={shopMode} />
             </div>
          </div>
        </main>
      ) : (
        <main className="w-full min-h-screen">
          <PageHeroBanner 
            title={data.title} 
            image={data.featuredImage} 
            description={data.heroDescription} 
            hideTitle={data.hideTitle}
            breadcrumbSettings={initialBreadcrumbSettings}
          />
          
          <ContentRenderer html={optimizeHtmlImages(finalHtmlContent, seoSettings, data.title)} className="max-w-7xl mx-auto prose prose-lg max-w-none" />
        </main>
      )}
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ClassicEditor from '@/components/ClassicEditor';
import ClassicSidebar from '@/components/ClassicSidebar';
import LinkSuggestionsSidebar from '@/components/LinkSuggestionsSidebar';
import SeoAnalyzer from '@/components/SeoAnalyzer';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';
import RevisionHistory from '@/components/RevisionHistory';

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [contentText, setContentText] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  
  const [focusKeyword, setFocusKeyword] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [slug, setSlug] = useState('');

  const [status, setStatus] = useState('Draft');
  const [visibility, setVisibility] = useState('Public');
  const [password, setPassword] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [hideTitle, setHideTitle] = useState(false);
  
  const [seoTitle, setSeoTitle] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [redirectType, setRedirectType] = useState('301');
  const [noIndex, setNoIndex] = useState(false);

  const [seoRobots, setSeoRobots] = useState<string | null>(null);
  const [seoAdvancedRobots, setSeoAdvancedRobots] = useState<string | null>(null);
  const [schemaJson, setSchemaJson] = useState('');
  const [globalSettings, setGlobalSettings] = useState<any>({});
  
  const [seoScore, setSeoScore] = useState(0);
  const [isPillar, setIsPillar] = useState(false);
  const [isHomepage, setIsHomepage] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    
    fetch(`${BASE_PATH}/api/pages/${params?.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setIsLoading(false);
          toast.error(data.error || 'Page not found');
          router.push('/admin/pages');
          return;
        }
        setTitle(data.title || '');
        setSlug(data.slug || '');
        setContentHtml(data.contentHtml || '');
        setContentText(data.contentText || '');
        setMetaDescription(data.metaDescription || '');
        setFocusKeyword(data.focusKeyword || '');
        setStatus(data.status || 'Draft');
        setVisibility(data.visibility || 'Public');
        setPassword(data.password || '');
        setPublishDate(data.publishedAt || data.createdAt || '');
        setHideTitle(data.hideTitle || false);
        setSeoTitle(data.seoTitle || '');
        setRedirectUrl(data.redirectUrl || '');
        setRedirectType(data.redirectType || '301');
        setNoIndex(data.noIndex || false);
        setSeoRobots(data.seoRobots || null);
        setSeoAdvancedRobots(data.seoAdvancedRobots || null);
        setSchemaJson(data.schemaJson || '');
        setSeoScore(data.seoScore || 0);
        setIsPillar(data.isPillar || false);
        setFeaturedImage(data.featuredImage || null);
        setHeroDescription(data.heroDescription || '');
        
        // Page data is enough to render the editor. Do not block the editor
        // while the global settings request is still loading.
        setIsLoading(false);

        // Fetch global settings once, then use the same response for homepage
        // detection and SEO/editor settings.
        fetch(`${BASE_PATH}/api/settings`)
          .then(res => {
            if (!res.ok) throw new Error(`Settings request failed (${res.status})`);
            return res.json();
          })
          .then(settings => {
            if (!settings.error) {
              setGlobalSettings(settings);
              if (
                settings.homepage_displays === 'static_page' &&
                String(settings.homepage_page_id || '') === String(params?.id || '')
              ) {
                setIsHomepage(true);
              }
            }
          })
          .catch(err => {
            console.error('Failed to load page settings:', err);
          });
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [params?.id, router]);

  const handleUpdate = async (overrideStatus?: string) => {
    if (!title) {
      toast.error('Please enter a title');
      return;
    }
    
    setIsSaving(true);
    const finalStatus = overrideStatus || status;
    


    try {
      const res = await fetch(`${BASE_PATH}/api/pages/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          contentHtml,
          contentText,
          metaDescription,
          focusKeyword,
          seoTitle,
          redirectUrl,
          redirectType,
          noIndex,
          seoRobots,
          seoAdvancedRobots,
          status: finalStatus,
          visibility,
          password,
          publishedAt: publishDate,
          hideTitle,
          schemaJson,
          seoScore,
          isPillar,
          featuredImage,
          heroDescription
        }),
      });
      if (res.ok) {
        // Just refresh the data, don't navigate away
        toast.success('Page updated successfully!');
        router.refresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(`Failed to update page: ${errorData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading editor...</div>;
  }

  const trailingSlash = globalSettings?.permalink_trailing_slash !== 'false';
  const effectiveSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const previewPath = isHomepage ? '/' : `/${effectiveSlug}${trailingSlash ? '/' : ''}`;
  const previewUrl = `${BASE_PATH}${previewPath}` || '/';

  return (
    <div className="max-w-[1280px] mx-auto py-6 px-2">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div><h1 className="text-2xl font-semibold text-gray-900">Edit Page</h1><p className="text-sm text-gray-500 mt-1">Update page content, publishing and SEO settings.</p></div>
        <Link href="/admin/pages/new" className="border border-[#5e3fde] text-[#5e3fde] hover:bg-[#5e3fde]/5 px-3 py-2 text-sm rounded-lg font-medium transition-colors">
          Add Page
        </Link>
      </div>
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
        <ClassicEditor 
          title={title}
          setTitle={setTitle}
          slug={slug}
          setSlug={setSlug}
          contentHtml={contentHtml}
          setContentHtml={setContentHtml}
          setContentText={setContentText}
          heroDescription={heroDescription}
          setHeroDescription={setHeroDescription}
          isHomepage={isHomepage}
          permalinkBase=""
          trailingSlash={trailingSlash}
          modern={true}
        />
        
        {globalSettings?.seo_page_add_seo_controls !== 'false' && (
          <div>
            <SeoAnalyzer 
              title={title} setTitle={setTitle}
              slug={slug} setSlug={setSlug}
              metaDescription={metaDescription} setMetaDescription={setMetaDescription}
              content={contentHtml}
              focusKeyword={focusKeyword} setFocusKeyword={setFocusKeyword}
              seoTitle={seoTitle} setSeoTitle={setSeoTitle}
              redirectUrl={redirectUrl} setRedirectUrl={setRedirectUrl}
              redirectType={redirectType} setRedirectType={setRedirectType}
              noIndex={noIndex} setNoIndex={setNoIndex}
              seoRobots={seoRobots} setSeoRobots={setSeoRobots}
              seoAdvancedRobots={seoAdvancedRobots} setSeoAdvancedRobots={setSeoAdvancedRobots}
              globalSettings={globalSettings}
              schemaJson={schemaJson} setSchemaJson={setSchemaJson}
              onScoreChange={setSeoScore}
              featuredImage={featuredImage}
            />
          </div>
        )}

        <RevisionHistory type="page" id={String(params?.id || '')} enabled={true} />
      </div>

      <div className="w-[300px] shrink-0 flex flex-col gap-4">
        <ClassicSidebar 
          status={status}
          setStatus={setStatus}
          visibility={visibility}
          setVisibility={setVisibility}
          password={password}
          setPassword={setPassword}
          publishDate={publishDate}
          setPublishDate={setPublishDate}
          onPublish={handleUpdate}
          isSaving={isSaving}
          score={seoScore}
          hideTitle={hideTitle}
          setHideTitle={setHideTitle}
          featuredImage={featuredImage}
          setFeaturedImage={setFeaturedImage}
          isPost={false}
          previewUrl={previewUrl}
          modern={true}
        />
        <LinkSuggestionsSidebar 
          globalSettings={globalSettings} 
          isPost={false} 
          title={title} 
          slug={slug} 
          focusKeyword={focusKeyword} 
          isPillar={isPillar}
          setIsPillar={setIsPillar}
        />
      </div>
    </div>
    </div>
  );
}

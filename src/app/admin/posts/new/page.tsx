'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClassicEditor from '@/components/ClassicEditor';
import ClassicSidebar from '@/components/ClassicSidebar';
import LinkSuggestionsSidebar from '@/components/LinkSuggestionsSidebar';
import SeoAnalyzer from '@/components/SeoAnalyzer';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

export default function NewPost() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('<p>Start writing your post here...</p>');
  const [contentText, setContentText] = useState('Start writing your post here...');
  
  const [seoTitle, setSeoTitle] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [redirectType, setRedirectType] = useState('301');
  const [noIndex, setNoIndex] = useState(false);
  const [schemaJson, setSchemaJson] = useState('');
  
  const [focusKeyword, setFocusKeyword] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('Draft');
  const [visibility, setVisibility] = useState('Public');
  const [password, setPassword] = useState('');
  const [publishDate, setPublishDate] = useState('');
  
  const [seoScore, setSeoScore] = useState(0);
  const [isPillar, setIsPillar] = useState(false);
  
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState<any>({});

  useEffect(() => {
    fetch(`${BASE_PATH}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setGlobalSettings(data);
      })
      .catch(console.error);
  }, []);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);

  const handlePublish = async (overrideStatus?: string) => {
    if (!title) {
      toast.error('Please enter a title');
      return;
    }
    
    setIsSaving(true);
    const finalStatus = overrideStatus || status;
    try {
      const res = await fetch(`${BASE_PATH}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          contentHtml,
          contentText,
          metaDescription,
          focusKeyword,
          redirectUrl,
          redirectType,
          noIndex,
          status: finalStatus,
          visibility,
          password,
          publishedAt: publishDate ? publishDate : undefined,
          seoScore,
          isPillar,
          featuredImage,
          categoryIds,
          tagIds
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/posts/${data.id}`);
        router.refresh();
      } else {
        toast.error('Failed to save post.');
      }
    } catch (e) {
      console.error(e);
      toast.error('An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-4 max-w-[1200px] mx-auto pt-4">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <ClassicEditor 
          title={title}
          setTitle={setTitle}
          slug={slug}
          setSlug={setSlug}
          contentHtml={contentHtml}
          setContentHtml={setContentHtml}
          setContentText={setContentText}
        />
        
        {globalSettings?.seo_post_add_seo_controls !== 'false' && (
          <div className="mt-4">
            <SeoAnalyzer 
              title={title} setTitle={setTitle}
              slug={slug} setSlug={setSlug}
              metaDescription={metaDescription} setMetaDescription={setMetaDescription}
              content={contentText}
              focusKeyword={focusKeyword} setFocusKeyword={setFocusKeyword}
              redirectUrl={redirectUrl} setRedirectUrl={setRedirectUrl}
              redirectType={redirectType} setRedirectType={setRedirectType}
              noIndex={noIndex} setNoIndex={setNoIndex}
              schemaJson={schemaJson} setSchemaJson={setSchemaJson}
              onScoreChange={setSeoScore}
              isPost={true}
              featuredImage={featuredImage}
              globalSettings={globalSettings}
            />
          </div>
        )}
      </div>

      <div className="w-[280px] shrink-0">
        <ClassicSidebar 
          status={status}
          setStatus={setStatus}
          visibility={visibility}
          setVisibility={setVisibility}
          password={password}
          setPassword={setPassword}
          publishDate={publishDate}
          setPublishDate={setPublishDate}
          isNew={true}
          onPublish={handlePublish}
          isSaving={isSaving}
          score={seoScore}
          featuredImage={featuredImage}
          setFeaturedImage={setFeaturedImage}
          categoryIds={categoryIds}
          setCategoryIds={setCategoryIds}
          tagIds={tagIds}
          setTagIds={setTagIds}
          isPost={true}
        />
        <LinkSuggestionsSidebar 
          globalSettings={globalSettings} 
          isPost={true} 
          title={title} 
          slug={slug} 
          focusKeyword={focusKeyword} 
          isPillar={isPillar}
          setIsPillar={setIsPillar}
        />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ClassicEditor from '@/components/ClassicEditor';
import ClassicSidebar from '@/components/ClassicSidebar';
import SeoAnalyzer from '@/components/SeoAnalyzer';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

export default function NewCourse() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('<p>Start writing your course description here...</p>');
  const [contentText, setContentText] = useState('Start writing your course description here...');
  const [videos, setVideos] = useState<{title: string, url: string}[]>([{ title: '', url: '' }]);
  
  const [focusKeyword, setFocusKeyword] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('Draft');
  const [visibility, setVisibility] = useState('Public');
  const [password, setPassword] = useState('');
  const [publishDate, setPublishDate] = useState('');
  
  const [price, setPrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  
  const [seoScore, setSeoScore] = useState(0);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);

  const handlePublish = async (overrideStatus?: string) => {
    if (!title) {
      toast.error('Please enter a title');
      return;
    }
    
    setIsSaving(true);
    const finalStatus = overrideStatus || status;
    try {
      const res = await fetch(`${BASE_PATH}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          contentHtml,
          contentText,
          videos: videos.filter(v => v.title.trim() !== '' && v.url.trim() !== ''),
          metaDescription,
          focusKeyword,
          status: finalStatus,
          price: price ? Number(price) : 0,
          salePrice: salePrice ? Number(salePrice) : null,
          featuredImage,
          createdAt: publishDate ? publishDate : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Course created');
        router.push(`/admin/courses/${data.id}/edit`);
        router.refresh();
      } else {
        toast.error('Failed to save course.');
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
        
        <div className="bg-white border border-[#c3c4c7] mt-4">
          <div className="px-4 py-3 border-b border-[#c3c4c7] font-semibold text-[#1d2327] flex justify-between items-center">
            <span>Course Curriculum (Videos)</span>
            <button 
              type="button" 
              onClick={() => setVideos([...videos, { title: '', url: '' }])}
              className="text-[#5e3fde] text-sm hover:underline"
            >
              + Add Video
            </button>
          </div>
          <div className="p-4 space-y-4">
            {videos.map((video, index) => (
              <div key={index} className="flex gap-4 items-start border border-gray-200 p-3 rounded bg-gray-50 relative">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-700 mb-1">Video Title</label>
                    <input 
                      type="text" 
                      value={video.title}
                      onChange={(e) => {
                        const newVids = [...videos];
                        newVids[index].title = e.target.value;
                        setVideos(newVids);
                      }}
                      placeholder="e.g. Lesson 1: Introduction"
                      className="w-full border border-[#8c8f94] px-3 py-1.5 rounded-[3px] text-[13px] focus:outline-none focus:border-[#5e3fde]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-700 mb-1">Video Embed URL</label>
                    <input 
                      type="text" 
                      value={video.url}
                      onChange={(e) => {
                        const newVids = [...videos];
                        newVids[index].url = e.target.value;
                        setVideos(newVids);
                      }}
                      placeholder="e.g. https://www.youtube.com/embed/..."
                      className="w-full border border-[#8c8f94] px-3 py-1.5 rounded-[3px] text-[13px] focus:outline-none focus:border-[#5e3fde]"
                    />
                  </div>
                </div>
                {videos.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => setVideos(videos.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove Video"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
            ))}
            <p className="text-[12px] text-gray-500 mt-2">Enter the title and embed URLs for the course videos. The order here dictates the playlist order.</p>
          </div>
        </div>
        
        <div className="bg-white border border-[#c3c4c7] mt-4">
          <div className="px-4 py-3 border-b border-[#c3c4c7] font-semibold text-[#1d2327]">
            Course Pricing
          </div>
          <div className="p-4 flex gap-4">
            <div className="flex-1">
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Regular Price ($)</label>
              <input 
                type="number"
                step="0.01" 
                value={price}
                onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 99.00"
                className="w-full border border-[#8c8f94] px-3 py-1.5 rounded-[3px] text-[13px] focus:outline-none focus:border-[#5e3fde]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Sale Price ($) <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input 
                type="number"
                step="0.01" 
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="e.g. 49.00"
                className="w-full border border-[#8c8f94] px-3 py-1.5 rounded-[3px] text-[13px] focus:outline-none focus:border-[#5e3fde]"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <SeoAnalyzer 
            title={title}
            setTitle={setTitle}
            slug={slug}
            setSlug={setSlug}
            metaDescription={metaDescription}
            setMetaDescription={setMetaDescription}
            content={contentText}
            focusKeyword={focusKeyword}
            setFocusKeyword={setFocusKeyword}
            onScoreChange={setSeoScore}
          />
        </div>
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
          isPost={false}
        />
      </div>
    </div>
  );
}

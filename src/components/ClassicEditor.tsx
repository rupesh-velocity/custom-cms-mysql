'use client';

import { useState, useEffect, useRef } from 'react';
import TipTapEditor from './TipTapEditor';
import { Image as ImageIcon } from 'lucide-react';
import MediaModal from './MediaModal';
import { BASE_PATH } from '@/lib/config';

interface ClassicEditorProps {
  title: string;
  setTitle: (val: string) => void;
  slug: string;
  setSlug: (val: string) => void;
  contentHtml: string;
  setContentHtml: (val: string) => void;
  setContentText: (val: string) => void;
  heroDescription?: string;
  setHeroDescription?: (val: string) => void;
  isHomepage?: boolean;
  permalinkBase?: string;
  trailingSlash?: boolean;
  modern?: boolean;
}

export default function ClassicEditor({
  title,
  setTitle,
  slug,
  setSlug,
  contentHtml,
  setContentHtml,
  setContentText,
  heroDescription = '',
  setHeroDescription,
  isHomepage = false,
  permalinkBase = '',
  trailingSlash = true,
  modern = false
}: ClassicEditorProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [tempSlug, setTempSlug] = useState(slug);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const tipTapRef = useRef<{ insertImage: (url: string) => void }>(null);
  
  // Calculate word count
  const wordCount = contentHtml.replace(/<[^>]*>?/gm, '').split(/\s+/).filter(w => w.length > 0).length;
  const normalizedBase = permalinkBase.trim().replace(/^\/+|\/+$/g, '');
  const effectiveSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const basePrefix = normalizedBase ? `${normalizedBase}/` : '';
  const displayBase = origin ? `${origin}${BASE_PATH}` : (BASE_PATH || 'http://localhost:3000');
  const displayRoot = displayBase.replace(/\/+$/, '');
  const permalinkPath = isHomepage ? '/' : `/${basePrefix}${effectiveSlug}${trailingSlash ? '/' : ''}`;
  const permalinkHref = `${displayRoot}${permalinkPath}`;

  useEffect(() => {
    setTempSlug(slug);
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    setCurrentTime(new Date().toLocaleTimeString());
  }, [slug]);

  const handleSlugSave = () => {
    setSlug(tempSlug);
    setIsEditingSlug(false);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const html = e.target.value;
    setContentHtml(html);
    const textOnly = html.replace(/<[^>]*>?/gm, '');
    setContentText(textOnly);
  };

  return (
    <div className={`w-full font-sans ${modern ? 'bg-white border border-gray-200 rounded-xl p-5 shadow-sm' : ''}`}>
      {/* Title Input */}
      <input
        type="text"
        placeholder="Add title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={`w-full text-[1.7em] font-medium bg-white px-3 py-2 outline-none placeholder:text-gray-400 ${modern ? 'border border-gray-200 rounded-lg focus:border-[#5e3fde] focus:ring-2 focus:ring-[#5e3fde]/10 mb-3' : 'border border-[#c3c4c7] focus:border-[#0085ba] focus:shadow-[0_0_0_1px_#0085ba] mb-2'}`}
      />

      {/* Hero Description Input (Optional, for pages) */}
      {setHeroDescription && (
        <textarea
          placeholder="Hero Description (Optional Subtitle)"
          value={heroDescription}
          onChange={(e) => setHeroDescription(e.target.value)}
          rows={2}
          className={`w-full text-base bg-white px-3 py-2 outline-none mb-4 placeholder:text-gray-400 resize-y ${modern ? 'border border-gray-200 rounded-lg focus:border-[#5e3fde] focus:ring-2 focus:ring-[#5e3fde]/10' : 'border border-[#c3c4c7] focus:border-[#0085ba] focus:shadow-[0_0_0_1px_#0085ba]'}`}
        />
      )}

      {/* Permalink */}
      {title && (
        <div className={`flex flex-wrap items-center gap-1 text-[13px] mb-4 ${modern ? 'text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5' : 'text-[#50575e]'}`}>
          <span className="font-semibold">Permalink:</span>
          {isEditingSlug && !isHomepage ? (
            <span className={modern ? 'text-[#5e3fde]' : 'text-[#0073aa]'}>
              {displayRoot}/{basePrefix}
              <input 
                type="text" 
                value={tempSlug} 
                onChange={(e) => setTempSlug(e.target.value)}
                className="border border-gray-300 rounded-md px-2 h-[28px] bg-white ml-1 text-black outline-none focus:border-[#5e3fde]"
              />
              {trailingSlash && '/'}
            </span>
          ) : (
            <a href={permalinkHref} target="_blank" rel="noopener noreferrer" className={`${modern ? 'text-[#5e3fde]' : 'text-[#0073aa]'} hover:underline break-all`}>
              {permalinkHref}
            </a>
          )}
          {!isHomepage && (
            isEditingSlug ? (
              <div className="flex gap-1 ml-2">
                <button type="button" onClick={handleSlugSave} className="bg-white border border-[#5e3fde] text-[#5e3fde] px-2.5 py-1 rounded-md hover:bg-[#5e3fde]/5">OK</button>
                <button type="button" onClick={() => { setTempSlug(slug); setIsEditingSlug(false); }} className="text-gray-500 px-2 py-1 hover:text-gray-800">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setIsEditingSlug(true)} className="ml-2 bg-white border border-gray-300 text-[#5e3fde] px-2.5 py-1 rounded-md hover:bg-gray-50">Edit</button>
            )
          )}
        </div>
      )}

      {/* Editor Toolbar & Tabs */}
      <div className={`mt-4 bg-white flex flex-col overflow-hidden ${modern ? 'border border-gray-200 rounded-xl' : 'border border-[#c3c4c7] rounded-t-[3px]'}`}>
        {/* Top bar with Add Media and Tabs */}
        <div className={`flex items-center justify-between p-2 border-b ${modern ? 'bg-gray-50 border-gray-200' : 'bg-[#f1f1f1] border-[#c3c4c7]'}`}>
          <button 
            onClick={() => setIsMediaModalOpen(true)}
            className={`flex items-center gap-1.5 bg-white text-[13px] px-3 py-1.5 font-semibold transition-colors ${modern ? 'border border-gray-200 text-gray-700 rounded-lg hover:border-[#5e3fde] hover:text-[#5e3fde]' : 'border border-[#c3c4c7] text-[#50575e] rounded-[3px] hover:bg-[#f6f7f7] hover:border-[#8c8f94]'}`}
          >
            <ImageIcon className="w-4 h-4 text-[#8c8f94]" /> Add Media
          </button>
          
          <MediaModal 
            isOpen={isMediaModalOpen}
            onClose={() => setIsMediaModalOpen(false)}
            onInsert={(url) => {
              if (activeTab === 'visual' && tipTapRef.current) {
                tipTapRef.current.insertImage(url);
              } else {
                const imgTag = `<img src="${url}" alt="" style="max-width: 100%; height: auto;" />`;
                setContentHtml(contentHtml + imgTag);
              }
            }}
          />

          <div className="flex bg-[#f1f1f1] border border-[#c3c4c7] rounded-[3px] overflow-hidden -mb-[9px] z-10 border-b-0">
            <button 
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 text-[13px] ${activeTab === 'visual' ? 'bg-[#f1f1f1] text-[#32373c] font-semibold' : 'bg-[#e5e5e5] text-[#50575e] border-b border-[#c3c4c7] hover:text-[#32373c]'}`}
            >
              Visual
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 text-[13px] border-l border-[#c3c4c7] ${activeTab === 'code' ? 'bg-[#f1f1f1] text-[#32373c] font-semibold' : 'bg-[#e5e5e5] text-[#50575e] border-b border-[#c3c4c7] hover:text-[#32373c]'}`}
            >
              Code
            </button>
          </div>
        </div>
        
        {/* The Editor Area */}
        <div className="min-h-[400px] flex flex-col">
          {activeTab === 'visual' ? (
            <TipTapEditor 
              ref={tipTapRef}
              content={contentHtml} 
              onChange={(html, text) => {
                setContentHtml(html);
                setContentText(text);
              }} 
            />
          ) : (
            <textarea
              value={contentHtml}
              onChange={handleCodeChange}
              className="flex-1 w-full p-4 text-[14px] font-mono outline-none resize-y min-h-[400px] bg-white text-[#32373c]"
              placeholder="Write your raw HTML here..."
            />
          )}
        </div>

        {/* Footer Status Bar */}
        <div className={`flex items-center justify-between px-3 py-2 border-t text-[12px] ${modern ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-[#f1f1f1] border-[#c3c4c7] text-[#50575e]'}`}>
          <div>Word count: {wordCount}</div>
          <div>{currentTime ? `Draft saved at ${currentTime}` : 'Saving...'}</div>
        </div>
      </div>
    </div>
  );
}

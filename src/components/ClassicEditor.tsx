'use client';

import { useState, useEffect, useRef } from 'react';
import TipTapEditor from './TipTapEditor';
import { Image as ImageIcon, Code2 } from 'lucide-react';
import MediaModal from './MediaModal';

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
  isHomepage = false
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
    <div className="w-full font-sans">
      {/* Title Input */}
      <input
        type="text"
        placeholder="Add title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-[1.7em] font-medium border border-[#c3c4c7] bg-white px-3 py-2 outline-none focus:border-[#0085ba] focus:shadow-[0_0_0_1px_#0085ba] mb-2 placeholder:text-gray-400"
      />

      {/* Hero Description Input (Optional, for pages) */}
      {setHeroDescription && (
        <textarea
          placeholder="Hero Description (Optional Subtitle)"
          value={heroDescription}
          onChange={(e) => setHeroDescription(e.target.value)}
          rows={2}
          className="w-full text-base border border-[#c3c4c7] bg-white px-3 py-2 outline-none focus:border-[#0085ba] focus:shadow-[0_0_0_1px_#0085ba] mb-4 placeholder:text-gray-400 resize-y"
        />
      )}

      {/* Permalink */}
      {title && (
        <div className="flex items-center gap-1 text-[13px] text-[#50575e] mb-4">
          <span className="font-semibold">Permalink:</span>
          <span className="text-[#0073aa]">
            {origin ? origin : 'http://localhost:3000'}/
            {!isHomepage && (
              isEditingSlug ? (
                <input 
                  type="text" 
                  value={tempSlug} 
                  onChange={(e) => setTempSlug(e.target.value)}
                  className="border border-[#8c8f94] rounded-[3px] px-1 h-[22px] bg-white ml-1 text-black outline-none"
                />
              ) : (
                <span>{slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}</span>
              )
            )}
            {!isHomepage && '/'}
          </span>
          {!isHomepage && (
            isEditingSlug ? (
              <div className="flex gap-1 ml-2">
                <button onClick={handleSlugSave} className="bg-[#f3f5f6] border border-[#0071a1] text-[#0071a1] px-2 py-0.5 rounded-[3px] hover:bg-[#f1f1f1]">OK</button>
                <button onClick={() => setIsEditingSlug(false)} className="text-[#0071a1] underline px-2 py-0.5 hover:text-[#005a80]">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setIsEditingSlug(true)} className="ml-2 bg-[#f3f5f6] border border-[#0071a1] text-[#0071a1] px-2 py-0.5 rounded-[3px] hover:bg-[#f1f1f1]">Edit</button>
            )
          )}
        </div>
      )}

      {/* Editor Toolbar & Tabs */}
      <div className="mt-4 border border-[#c3c4c7] bg-white flex flex-col rounded-t-[3px]">
        {/* Top bar with Add Media and Tabs */}
        <div className="flex items-center justify-between p-2 bg-[#f1f1f1] border-b border-[#c3c4c7]">
          <button 
            onClick={() => setIsMediaModalOpen(true)}
            className="flex items-center gap-1.5 bg-white border border-[#c3c4c7] text-[#50575e] text-[13px] px-2.5 py-1 rounded-[3px] hover:bg-[#f6f7f7] hover:border-[#8c8f94] font-semibold"
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
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#f1f1f1] border-t border-[#c3c4c7] text-[12px] text-[#50575e]">
          <div>Word count: {wordCount}</div>
          <div>{currentTime ? `Draft saved at ${currentTime}` : 'Saving...'}</div>
        </div>
      </div>
    </div>
  );
}

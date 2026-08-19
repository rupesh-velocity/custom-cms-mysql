'use client';

import { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy } from 'lucide-react';
import { Accordion } from './ClassicSidebar';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

interface LinkSuggestionsSidebarProps {
  globalSettings: any;
  isPost?: boolean;
  title: string;
  slug: string;
  focusKeyword: string;
  isPillar?: boolean;
  setIsPillar?: (val: boolean) => void;
}

export default function LinkSuggestionsSidebar({ globalSettings, isPost = false, title, slug, focusKeyword, isPillar, setIsPillar }: LinkSuggestionsSidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const [linkSuggestions, setLinkSuggestions] = useState<any[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const showLinkSuggestions = isPost ? globalSettings?.seo_post_link_suggestions === 'true' : globalSettings?.seo_page_link_suggestions === 'true';
  const suggestionTitles = isPost ? globalSettings?.seo_post_link_suggestion_titles : globalSettings?.seo_page_link_suggestion_titles;
  const keywordsArray = (focusKeyword || '').split(',').map(k => k.trim()).filter(Boolean);
  const suggestionTarget = suggestionTitles === 'Focus Keywords' ? (keywordsArray[0] || '') : (title || '');

  useEffect(() => {
    if (!showLinkSuggestions || !suggestionTarget || suggestionTarget.trim() === '') {
      setLinkSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsFetchingSuggestions(true);
      fetch(`${BASE_PATH}/api/seo/link-suggestions?keyword=${encodeURIComponent(suggestionTarget)}&slug=${encodeURIComponent(slug || '')}`)
        .then(res => res.json())
        .then(data => {
          if (data.suggestions) setLinkSuggestions(data.suggestions);
        })
        .catch(console.error)
        .finally(() => setIsFetchingSuggestions(false));
    }, 1000);
    return () => clearTimeout(timer);
  }, [showLinkSuggestions, suggestionTarget, slug]);

  if (!showLinkSuggestions) return null;

  return (
    <div className="w-full max-w-[280px] font-sans mt-4">
      <Accordion id="linkSuggestions" title="Link Suggestions" expanded={expanded} toggleAccordion={() => setExpanded(!expanded)}>
        {setIsPillar && (
          <div className="mb-4 pb-3 border-b border-[#e2e4e7]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isPillar || false} 
                onChange={(e) => setIsPillar(e.target.checked)}
                className="w-4 h-4 text-[#00b8e6] rounded border-gray-300 focus:ring-[#00b8e6]"
              />
              <span className="text-[13px] font-semibold text-[#1d2327]">This post is Pillar Content</span>
            </label>
            <p className="text-[11px] text-gray-500 mt-1 ml-6">
              Pillar content should be comprehensive, evergreen, and serve as a hub for related topics.
            </p>
          </div>
        )}
        
        <div className="mb-2 flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-[#0085ba]" />
          <span className="text-[12px] text-gray-500 italic">Pillar Content Recommendations</span>
        </div>
        
        {isFetchingSuggestions ? (
          <div className="text-[12px] text-gray-500 italic">Finding pillar content...</div>
        ) : linkSuggestions.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {linkSuggestions.map((s, i) => (
              <div key={i} className="flex flex-col gap-1 p-2 bg-[#f9f9f9] border border-[#e2e4e7] rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#1d2327] truncate pr-2" title={s.title}>{s.title}</span>
                  <span className="text-[10px] uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold shrink-0">{s.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 truncate pr-2">/{s.slug}</span>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${s.slug}`); toast.success('Link Copied!'); }} className="text-[#0085ba] hover:underline text-[11px] font-medium flex items-center gap-1 shrink-0"><Copy className="w-3 h-3" /> Copy Link</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-gray-500">No suggestions found for "{suggestionTarget}". Try adding more focus keywords or updating the title.</div>
        )}
      </Accordion>
    </div>
  );
}

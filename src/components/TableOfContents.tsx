'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, List } from 'lucide-react';
import type { TocHeading } from '@/lib/toc';

export default function TableOfContents({ headings }: { headings: TocHeading[] }) {
  // Hidden by default, as requested
  const [isExpanded, setIsExpanded] = useState(false); 
  
  if (!headings || headings.length === 0) return null;

  return (
    <div className="mb-10 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-gray-50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center shrink-0">
            <List className="w-5 h-5" />
          </div>
          <span className="font-bold text-gray-900 font-outfit text-lg">Table of Contents</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#5e3fde] font-semibold bg-[#5e3fde]/5 px-3 py-1.5 rounded-full">
          {isExpanded ? 'Hide' : 'Show'}
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-5 md:p-6 border-t border-gray-100">
          <ul className="space-y-3">
            {headings.map((heading, i) => (
              <li key={i} className={`${heading.level === 3 ? 'ml-6' : ''}`}>
                <a 
                  href={`#${heading.id}`}
                  className="text-gray-700 hover:text-[#5e3fde] transition-colors text-[15px] hover:underline flex items-start gap-2.5 leading-relaxed"
                  onClick={(e) => {
                    e.preventDefault();
                    // Optional offset for sticky header if there is one
                    const el = document.getElementById(heading.id);
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 100;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                >
                  <span className="text-[#5e3fde]/40 shrink-0 mt-0.5">•</span>
                  <span>{heading.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

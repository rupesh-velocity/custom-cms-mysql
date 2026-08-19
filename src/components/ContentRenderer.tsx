import React from 'react';
import parse, { DOMNode } from 'html-react-parser';
import FrontendForm from './FrontendForm';
import Breadcrumbs from './Breadcrumbs';

export default function ContentRenderer({ html, className = '' }: { html: string, className?: string }) {
  // Clean up wrapping <p> tags around shortcodes if they are the only content in the paragraph, and fix fetchPriority casing for React
  const cleanHtml = html
    .replace(/<p>\s*(\[form id="\d+"\]|\[breadcrumbs\])\s*<\/p>/g, '$1')
    .replace(/fetchpriority/gi, 'fetchPriority');

  const options = {
    replace: (domNode: DOMNode) => {
      if (domNode.type === 'text' && domNode.data) {
        const text = domNode.data;
        if (text.match(/\[form id="\d+"\]/) || text.includes('[breadcrumbs]')) {
          const parts = text.split(/(\[form id="\d+"\]|\[breadcrumbs\])/g);
          return (
            <>
              {parts.map((part, index) => {
                if (!part) return null;
                if (part === '[breadcrumbs]') return <Breadcrumbs key={index} />;
                const formMatch = part.match(/\[form id="(\d+)"\]/);
                if (formMatch) return <FrontendForm key={index} id={formMatch[1]} />;
                return <React.Fragment key={index}>{part}</React.Fragment>;
              })}
            </>
          );
        }
      }
    }
  };

  return (
    <div className={className}>
      {parse(cleanHtml, options)}
    </div>
  );
}

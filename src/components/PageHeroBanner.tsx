import React from 'react';
import Breadcrumbs from './Breadcrumbs';

export default function PageHeroBanner({ 
  title, 
  image, 
  description,
  hideTitle,
  breadcrumbSettings
}: { 
  title: string; 
  image?: string | null;
  description?: string | React.ReactNode | null;
  hideTitle?: boolean;
  breadcrumbSettings?: any;
}) {
  // Split title to style the last word
  const words = title.trim().split(' ');
  const lastWord = words.length > 1 ? words.pop() : null;
  const firstPart = words.join(' ');

  return (
    <div className="relative w-full min-h-[320px] flex flex-col items-center justify-center text-center overflow-hidden py-10">
      {/* Background Image with Dark Overlay */}
      {image ? (
        <div 
          className="absolute inset-0 z-0 inner-page-hero-bg"
          style={{ backgroundImage: `url('${image}')` }}
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-[#1a103c]" />
      )}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#1a103c]/90 via-[#1a103c]/70 to-[#1a103c]/90" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center">
        {!hideTitle && (
          <h1 className="inner-hero-title mb-4">
            {lastWord ? (
              <>
                <span className="text-white">{firstPart} </span>
                <span className="inner-hero-title-accent">{lastWord}</span>
              </>
            ) : (
              <span className="text-white">{title}</span>
            )}
          </h1>
        )}
        
        {/* Decorative Line */}
        <div className="w-[180px] h-1 bg-gradient-to-r from-[#215E91] to-[#E81A7B] mb-6" />

        {/* Description Field under Title */}
        {description && (
          <div className="inner-hero-subtitle max-w-2xl mb-2">
            {description}
          </div>
        )}

        {/* Breadcrumbs under Description */}
        <div className="mt-0">
          <Breadcrumbs theme="dark" initialSettings={breadcrumbSettings} />
        </div>
      </div>
    </div>
  );
}

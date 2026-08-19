'use client';

import { useEffect } from 'react';

export default function VideoFacadeHandler() {
  useEffect(() => {
    const handleFacadeClick = (e: MouseEvent) => {
      // Find the closest facade element if clicked inside it
      const target = e.target as HTMLElement;
      const facade = target.closest('.video-facade') as HTMLElement;
      
      if (!facade) return;
      
      const vimeoId = facade.getAttribute('data-vimeo-id');
      if (vimeoId) {
        // Replace facade content with actual iframe, autoplay=1
        facade.innerHTML = `
          <iframe 
            src="https://player.vimeo.com/video/${vimeoId}?autoplay=1&dnt=1" 
            class="w-full h-full border-0 absolute inset-0" 
            frameborder="0" 
            allow="autoplay; fullscreen; picture-in-picture" 
            allowfullscreen
            title="Vimeo Video">
          </iframe>
        `;
        // Remove the cursor-pointer class so it behaves normally
        facade.classList.remove('cursor-pointer', 'group');
      }
    };

    document.addEventListener('click', handleFacadeClick);
    return () => {
      document.removeEventListener('click', handleFacadeClick);
    };
  }, []);

  return null; // This component just attaches the global event listener
}

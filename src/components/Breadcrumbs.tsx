'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BASE_PATH } from '@/lib/config';

export default function Breadcrumbs({ theme = 'light', initialSettings }: { theme?: 'light' | 'dark', initialSettings?: any }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState<any>(initialSettings || null);
  
  useEffect(() => {
    if (initialSettings) return; // Skip network request if server already provided the data!
    fetch(`${BASE_PATH}/api/settings`)
      .then(res => res.json())
      .then(data => {
        setSettings({
          enabled: data.breadcrumbs_enabled === 'true',
          separator: data.breadcrumbs_separator || '-',
          showHome: data.breadcrumbs_show_home !== 'false',
          homeLabel: data.breadcrumbs_home_label || 'Home',
          homeLink: data.breadcrumbs_home_link || '/',
          prefix: data.breadcrumbs_prefix || '',
          hideTitle: data.breadcrumbs_hide_title === 'true'
        });
      })
      .catch(() => {});
  }, []);

  if (!settings || !settings.enabled || !pathname) return null;

  const paths = pathname.split('/').filter(p => p);
  
  const breadcrumbItems: { label: any; url: string; isCurrent: boolean }[] = [];
  
  if (settings.showHome) {
    breadcrumbItems.push({
      label: settings.homeLabel,
      url: settings.homeLink,
      isCurrent: paths.length === 0
    });
  }
  
  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const isLast = index === paths.length - 1;
    
    // Capitalize and format path segment
    const formattedPath = path.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // If it's the last item and hideTitle is true, we don't add it (unless it's the only item besides home)
    if (isLast && settings.hideTitle) {
      return;
    }
    
    breadcrumbItems.push({
      label: formattedPath,
      url: currentPath,
      isCurrent: isLast
    });
  });

  if (breadcrumbItems.length <= 1 && !settings.showHome) {
    return null;
  }

  // Theme-based colors
  const containerClass = theme === 'dark' ? 'text-white/80' : 'text-gray-600';
  const currentTextClass = theme === 'dark' ? 'text-white font-bold' : 'text-gray-900 font-medium';
  const linkHoverClass = theme === 'dark' ? 'hover:text-white transition-colors' : 'hover:text-[#0085ba] transition-colors';
  const separatorClass = theme === 'dark' ? 'text-white/50 select-none' : 'text-gray-400 select-none';

  return (
    <nav aria-label="breadcrumb" className={`innerpage-breadcrumb text-sm my-4 flex items-center flex-wrap gap-2 ${containerClass}`}>
      {settings.prefix && <span className="mr-1">{settings.prefix}</span>}
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        
        return (
          <span key={item.url} className="flex items-center gap-2">
            {isLast || item.isCurrent ? (
              <span className={currentTextClass} aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link href={item.url} className={linkHoverClass}>
                {item.label}
              </Link>
            )}
            {!isLast && (
              <span className={separatorClass}>
                {settings.separator}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

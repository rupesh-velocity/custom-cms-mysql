'use client';

import { useEffect } from 'react';
import { BASE_PATH } from '@/lib/config';

export default function NotFoundLogger() {
  useEffect(() => {
    // Log the 404 to the API
    const url = window.location.pathname + window.location.search;
    
    fetch(`${BASE_PATH}/api/seo/404-logs/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    }).catch(() => {
      // Ignore errors so we don't break the UI
    });
  }, []);

  return null;
}

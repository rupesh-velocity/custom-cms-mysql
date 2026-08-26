'use client';

import { useEffect } from 'react';
import { BASE_PATH } from '@/lib/config';

export default function NotFoundTracker() {
  useEffect(() => {
    const url = window.location.pathname + window.location.search;
    fetch(`${BASE_PATH}/api/seo/not-found-logs/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }).catch(() => {});
  }, []);

  return null;
}

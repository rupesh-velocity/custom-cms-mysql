'use client';

import { useEffect } from 'react';
import { BASE_PATH } from '@/lib/config';
import BodyClassInjector from '@/components/BodyClassInjector';
import PageHeroBanner from '@/components/PageHeroBanner';

export default function NotFound() {
  useEffect(() => {
    const url = window.location.pathname + window.location.search;
    fetch(`${BASE_PATH}/api/seo/not-found-logs/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }).catch(() => {});
  }, []);

  return (
    <>
      <BodyClassInjector type="error404" />
      <PageHeroBanner title="Page Not Found" />
      <div className="w-full bg-white text-center flex flex-col items-center justify-center" style={{ padding: '100px 20px', minHeight: '50vh' }}>
        <h2 className="font-bold text-gray-900 font-outfit" style={{ fontSize: '140px', lineHeight: '1', marginBottom: '30px' }}>404</h2>
        <p className="text-gray-600 text-xl max-w-lg mx-auto leading-relaxed" style={{ marginBottom: '40px' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-10 py-4 font-semibold rounded-xl text-white bg-[#5e3fde] hover:bg-[#4b32b2] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-lg"
        >
          Return Home
        </a>
      </div>
    </>
  );
}

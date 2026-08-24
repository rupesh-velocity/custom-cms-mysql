'use client';

import { useEffect } from 'react';
import { BASE_PATH } from '@/lib/config';
import BodyClassInjector from '@/components/BodyClassInjector';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
      <div className="bg-white p-12 rounded-2xl shadow-xl max-w-lg w-full">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">404</h2>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Page Not Found</h3>
        <p className="text-gray-600 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#5e3fde] hover:bg-[#4b32b2] transition-colors"
        >
          Return Home
        </a>
      </div>
      </div>
    </>
  );
}

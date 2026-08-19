'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Runtime Error Caught:", error);
  }, [error]);

  const isDbError = error.message.includes('Prisma') || error.message.includes('database') || error.message.includes('connect');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border-t-4 border-red-500">
        <div className="flex items-center gap-3 text-red-600 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold">Application Error</h2>
        </div>
        
        {isDbError ? (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Database Connection Failed</h3>
            <p className="text-gray-600 mb-4">
              The application could not connect to the database. This usually happens for one of the following reasons:
            </p>
            <ul className="list-disc pl-5 text-gray-600 mb-4 space-y-1">
              <li><strong>DATABASE_URL</strong> is missing in Vercel Environment Variables.</li>
              <li>The database server is offline or blocking connections.</li>
              <li>The database schema hasn't been synced (try running <code>npx prisma db push</code>).</li>
            </ul>
          </div>
        ) : (
          <p className="text-gray-600 mb-6">An unexpected error occurred while loading this page.</p>
        )}

        <div className="bg-red-50 p-4 rounded-lg overflow-x-auto mb-6">
          <p className="text-sm font-mono text-red-800 whitespace-pre-wrap">{error.message}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

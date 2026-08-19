'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, BookOpen, Code } from 'lucide-react';
import clsx from 'clsx';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BASE_PATH } from '@/lib/config';

type AccountTab = 'dashboard' | 'courses' | 'subscriptions' | 'payments' | 'profile' | 'password';

const ACCOUNT_TABS: { key: AccountTab; label: string; href: string }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/my-account' },
  { key: 'courses', label: 'My Courses', href: '/my-account?tab=courses' },
  { key: 'subscriptions', label: 'Subscriptions', href: '/my-account?tab=subscriptions' },
  { key: 'payments', label: 'Payments', href: '/my-account?tab=payments' },
  { key: 'profile', label: 'Profile', href: '/my-account?tab=profile' },
  { key: 'password', label: 'Password', href: '/my-account?tab=password' },
];

function normalizeTab(value?: string | null): AccountTab {
  if (value === 'courses' || value === 'subscriptions' || value === 'payments' || value === 'profile' || value === 'password') return value;
  return 'dashboard';
}

function getCurrentTab(): AccountTab {
  if (typeof window === 'undefined') return 'dashboard';
  const params = new URLSearchParams(window.location.search);
  return normalizeTab(params.get('tab'));
}

function optimizeImageUrl(url?: string | null) {
  if (!url) return '';
  return url.replace(
    /https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(v[0-9]+\/.+)/i,
    'https://res.cloudinary.com/$1/image/upload/f_auto,q_auto,h_100/$2'
  );
}

export default function MyAccountHeader({
  siteTitle,
  siteLogo,
  siteIcon,
}: {
  siteTitle: string;
  siteLogo?: string | null;
  siteIcon?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<AccountTab>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const syncActiveTab = () => setActiveTab(getCurrentTab());
    syncActiveTab();
    window.addEventListener('popstate', syncActiveTab);
    return () => window.removeEventListener('popstate', syncActiveTab);
  }, []);

  const logoUrl = optimizeImageUrl(siteLogo || siteIcon || '');

  const renderNavLink = (tab: { key: AccountTab; label: string; href: string }, mobile = false) => {
    const active = tab.key === activeTab;
    return (
      <Link
        key={tab.key}
        href={tab.href}
        onClick={() => {
          setActiveTab(tab.key);
          setMenuOpen(false);
        }}
        className={mobile
          ? `block rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-[#5e3fde] text-white' : 'text-slate-700 hover:bg-[#5e3fde]/10 hover:text-[#5e3fde]'}`
          : `inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${active ? 'bg-[#5e3fde] text-white shadow-md shadow-[#5e3fde]/20' : 'text-slate-700 hover:bg-[#5e3fde]/10 hover:text-[#5e3fde]'}`
        }
      >
        {tab.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4 lg:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
            {logoUrl ? (
              <img src={logoUrl} alt={siteTitle} className="max-h-12 w-auto object-contain" loading="eager" />
            ) : (
              <span className="font-heading text-xl font-bold text-gray-950">{siteTitle}</span>
            )}
          </Link>

          <nav className="hidden items-center gap-4 lg:flex">
            {ACCOUNT_TABS.map((tab) => renderNavLink(tab))}
            <form action={`${BASE_PATH}/api/users/logout`} method="POST" className="m-0">
              <button
                type="submit"
                className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-600"
              >
                Logout
              </button>
            </form>
          </nav>

          <button
            type="button"
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:border-[#5e3fde]/30 hover:text-[#5e3fde] lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="my-account-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="flex h-5 w-5 flex-col justify-center gap-1.5" aria-hidden="true">
              <span className="block h-0.5 w-5 rounded bg-current" />
              <span className="block h-0.5 w-5 rounded bg-current" />
              <span className="block h-0.5 w-5 rounded bg-current" />
            </span>
            Menu
          </button>
        </div>

        {menuOpen ? (
          <div id="my-account-mobile-menu" className="mt-4 rounded-3xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/70 lg:hidden">
            <nav className="space-y-1">
              {ACCOUNT_TABS.map((tab) => renderNavLink(tab, true))}
              <form action={`${BASE_PATH}/api/users/logout`} method="POST" className="m-0 pt-1">
                <button
                  type="submit"
                  className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
                >
                  Logout
                </button>
              </form>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}

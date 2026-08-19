'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

export default function ReadingSettings() {
  const [settings, setSettings] = useState({
    homepage_displays: 'latest_posts',
    homepage_page_id: '',
    posts_page_id: '',
    shop_page_id: '',
    courses_page_id: '',
    blog_pages_at_most: '10',
    syndication_feeds_at_most: '10',
    feed_include: 'full_text',
    show_author_box: 'true',
  });
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_PATH}/api/settings`).then(res => res.json()),
      fetch(`${BASE_PATH}/api/pages`).then(res => res.json())
    ]).then(([settingsData, pagesData]) => {
      setSettings({
        homepage_displays: settingsData.homepage_displays || 'latest_posts',
        homepage_page_id: settingsData.homepage_page_id || '',
        posts_page_id: settingsData.posts_page_id || '',
        shop_page_id: settingsData.shop_page_id || '',
        courses_page_id: settingsData.courses_page_id || '',
        blog_pages_at_most: settingsData.blog_pages_at_most || '10',
        syndication_feeds_at_most: settingsData.syndication_feeds_at_most || '10',
        feed_include: settingsData.feed_include || 'full_text',
        show_author_box: settingsData.show_author_box !== undefined ? String(settingsData.show_author_box) : 'true',
      });
      setPages(Array.isArray(pagesData) ? pagesData : []);
      setIsLoading(false);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
        <label className="text-sm font-medium text-gray-900 pt-1">Your homepage displays</label>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="homepage_displays"
              value="latest_posts"
              checked={settings.homepage_displays === 'latest_posts'}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700">Your latest posts</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="homepage_displays"
              value="static_page"
              checked={settings.homepage_displays === 'static_page'}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700">A static page (select below)</span>
          </label>
          
          <div className="pl-7 space-y-3 mt-3">
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm text-gray-600">Homepage:</label>
              <select
                name="homepage_page_id"
                value={settings.homepage_page_id}
                onChange={handleChange}
                disabled={settings.homepage_displays !== 'static_page'}
                className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— Select —</option>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>{page.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm text-gray-600">Posts page:</label>
              <select
                name="posts_page_id"
                value={settings.posts_page_id}
                onChange={handleChange}
                disabled={settings.homepage_displays !== 'static_page'}
                className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— Select —</option>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>{page.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm text-gray-600">Shop page:</label>
              <select
                name="shop_page_id"
                value={settings.shop_page_id}
                onChange={handleChange}
                disabled={settings.homepage_displays !== 'static_page'}
                className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— Select —</option>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>{page.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm text-gray-600">Courses page:</label>
              <select
                name="courses_page_id"
                value={settings.courses_page_id}
                onChange={handleChange}
                disabled={settings.homepage_displays !== 'static_page'}
                className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— Select —</option>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>{page.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6 items-center">
        <label className="text-sm font-medium text-gray-900">Blog pages show at most</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="blog_pages_at_most"
            value={settings.blog_pages_at_most}
            onChange={handleChange}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <span className="text-sm text-gray-600">posts</span>
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6 items-center">
        <label className="text-sm font-medium text-gray-900">Syndication feeds show the most recent</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="syndication_feeds_at_most"
            value={settings.syndication_feeds_at_most}
            onChange={handleChange}
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <span className="text-sm text-gray-600">items</span>
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
        <label className="text-sm font-medium text-gray-900 pt-1">For each post in a feed, include</label>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="feed_include"
              value="full_text"
              checked={settings.feed_include === 'full_text'}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700">Full text</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="feed_include"
              value="excerpt"
              checked={settings.feed_include === 'excerpt'}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700">Excerpt</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6 items-center">
        <label className="text-sm font-medium text-gray-900">Author Box</label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="show_author_box"
              checked={settings.show_author_box === 'true'}
              onChange={(e) => setSettings(prev => ({ ...prev, show_author_box: e.target.checked ? 'true' : 'false' }))}
              className="w-4 h-4 border-[#8c8f94] rounded-[2px] text-[#5e3fde] focus:ring-[#5e3fde]"
            />
            <span className="text-sm text-gray-700">Show Author Box on Single Posts</span>
          </label>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>
    </form>
  );
}

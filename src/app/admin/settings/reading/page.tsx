'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Home, Rss, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

export default function ReadingSettings() {
  const [settings, setSettings] = useState({
    homepage_displays: 'latest_posts', homepage_page_id: '', posts_page_id: '', shop_page_id: '', courses_page_id: '',
    blog_pages_at_most: '10', syndication_feeds_at_most: '10', feed_include: 'full_text', show_author_box: 'true',
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
        homepage_page_id: settingsData.homepage_page_id || '', posts_page_id: settingsData.posts_page_id || '',
        shop_page_id: settingsData.shop_page_id || '', courses_page_id: settingsData.courses_page_id || '',
        blog_pages_at_most: settingsData.blog_pages_at_most || '10', syndication_feeds_at_most: settingsData.syndication_feeds_at_most || '10',
        feed_include: settingsData.feed_include || 'full_text', show_author_box: settingsData.show_author_box !== undefined ? String(settingsData.show_author_box) : 'true',
      });
      setPages(Array.isArray(pagesData) ? pagesData : []); setIsLoading(false);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target; setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/settings`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(settings) });
      res.ok ? toast.success('Reading settings saved') : toast.error('Failed to save settings');
    } catch { toast.error('An error occurred'); } finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>;

  const SelectPage = ({ label, name }: { label:string; name:'homepage_page_id'|'posts_page_id'|'shop_page_id'|'courses_page_id' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <select name={name} value={settings[name]} onChange={handleChange} disabled={settings.homepage_displays !== 'static_page'} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[#5e3fde]/15 focus:border-[#5e3fde] disabled:bg-gray-50 disabled:text-gray-400">
        <option value="">— Select —</option>{pages.map(page => <option key={page.id} value={page.id}>{page.title}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-[980px] space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div><h2 className="text-xl font-semibold text-gray-900">Reading</h2><p className="text-sm text-gray-500 mt-1">Control homepage content, archive size and feed behavior.</p></div>
        <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5e3fde] text-white rounded-lg hover:bg-[#4b32b2] disabled:opacity-50 text-sm font-semibold shadow-sm">{isSaving ? <Loader2 size={17} className="animate-spin"/> : <Save size={17}/>} Save Changes</button>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center"><Home size={18}/></span><div><h3 className="text-sm font-semibold text-gray-900">Homepage & Content Pages</h3><p className="text-xs text-gray-500 mt-0.5">Choose what the homepage displays and assign important content pages.</p></div></div>
        <div className="p-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-3">
            <label className={`border rounded-xl p-4 cursor-pointer transition-colors ${settings.homepage_displays==='latest_posts' ? 'border-[#5e3fde] bg-[#5e3fde]/5' : 'border-gray-200 hover:border-gray-300'}`}><div className="flex items-start gap-3"><input type="radio" name="homepage_displays" value="latest_posts" checked={settings.homepage_displays==='latest_posts'} onChange={handleChange} className="mt-1 accent-[#5e3fde]"/><div><span className="text-sm font-semibold text-gray-900">Latest posts</span><p className="text-xs text-gray-500 mt-1">Use the latest published posts as the homepage feed.</p></div></div></label>
            <label className={`border rounded-xl p-4 cursor-pointer transition-colors ${settings.homepage_displays==='static_page' ? 'border-[#5e3fde] bg-[#5e3fde]/5' : 'border-gray-200 hover:border-gray-300'}`}><div className="flex items-start gap-3"><input type="radio" name="homepage_displays" value="static_page" checked={settings.homepage_displays==='static_page'} onChange={handleChange} className="mt-1 accent-[#5e3fde]"/><div><span className="text-sm font-semibold text-gray-900">Static page</span><p className="text-xs text-gray-500 mt-1">Use selected CMS pages for the homepage and related sections.</p></div></div></label>
          </div>
          <div className="grid md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4"><SelectPage label="Homepage" name="homepage_page_id"/><SelectPage label="Posts page" name="posts_page_id"/><SelectPage label="Shop page" name="shop_page_id"/><SelectPage label="Courses page" name="courses_page_id"/></div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center"><Rss size={18}/></span><div><h3 className="text-sm font-semibold text-gray-900">Archives & Feeds</h3><p className="text-xs text-gray-500 mt-0.5">Set list sizes and what RSS-style feeds include.</p></div></div>
        <div className="p-5 grid md:grid-cols-2 gap-5">
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Blog pages show at most</label><div className="flex items-center gap-2"><input type="number" min="1" name="blog_pages_at_most" value={settings.blog_pages_at_most} onChange={handleChange} className="w-24 border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5e3fde]"/><span className="text-sm text-gray-500">posts</span></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Feed shows the most recent</label><div className="flex items-center gap-2"><input type="number" min="1" name="syndication_feeds_at_most" value={settings.syndication_feeds_at_most} onChange={handleChange} className="w-24 border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5e3fde]"/><span className="text-sm text-gray-500">items</span></div></div>
          <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">For each post in a feed, include</label><div className="flex flex-wrap gap-3"><label className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer"><input type="radio" name="feed_include" value="full_text" checked={settings.feed_include==='full_text'} onChange={handleChange} className="accent-[#5e3fde]"/><span className="text-sm">Full text</span></label><label className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer"><input type="radio" name="feed_include" value="excerpt" checked={settings.feed_include==='excerpt'} onChange={handleChange} className="accent-[#5e3fde]"/><span className="text-sm">Excerpt</span></label></div></div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center"><UserRound size={18}/></span><div><h3 className="text-sm font-semibold text-gray-900">Post Author Display</h3><p className="text-xs text-gray-500 mt-0.5">Control author information shown on single post pages.</p></div></div>
        <div className="p-5"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={settings.show_author_box==='true'} onChange={(e)=>setSettings(prev=>({...prev,show_author_box:e.target.checked?'true':'false'}))} className="mt-1 accent-[#5e3fde]"/><span><span className="block text-sm font-semibold text-gray-900">Show Author Box on Single Posts</span><span className="block text-xs text-gray-500 mt-1">Display the post author's profile information beneath supported post templates.</span></span></label></div>
      </section>
    </form>
  );
}

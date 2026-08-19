'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Image as ImageIcon, Link as LinkIcon, Settings, Globe, FileText, Code } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

export default function SeoGeneralSettings() {
  const [activeTab, setActiveTab] = useState('links');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      setActiveTab(window.location.hash.replace('#', ''));
    }
  }, []);

  const changeTab = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  };

  const [settings, setSettings] = useState<Record<string, string>>({
    seo_nofollow_external: 'false',
    seo_nofollow_image: 'false',
    seo_open_external_new_tab: 'false',
    seo_add_missing_alt: 'false',
    seo_add_missing_title: 'false',
    seo_image_alt_format: '%title% %count(title)%',
    seo_image_title_format: '%title% %count(title)%',
    seo_google_verify: '',
    seo_bing_verify: '',
    seo_baidu_verify: '',
    seo_yandex_verify: '',
    seo_pinterest_verify: '',
    seo_norton_verify: '',
    seo_custom_webmaster_tags: '',
    seo_robots_txt: '',
    seo_sitemap_links_per_page: '200',
    seo_sitemap_images: 'true',
    seo_sitemap_featured_images: 'false',
    seo_sitemap_include_posts: 'true',
    seo_html_sitemap_include_posts: 'true',
    seo_sitemap_include_pages: 'true',
    seo_html_sitemap_include_pages: 'true',
    breadcrumbs_enabled: 'false',
    breadcrumbs_separator: '-',
    breadcrumbs_show_home: 'true',
    breadcrumbs_home_label: 'Home',
    breadcrumbs_home_link: '/',
    breadcrumbs_prefix: '',
    breadcrumbs_hide_title: 'false',
    llms_txt_enabled: 'true',
    llms_txt_post_types_posts: 'true',
    llms_txt_post_types_pages: 'true',
    llms_txt_post_types_products: 'false',
    llms_txt_post_types_courses: 'false',
    llms_txt_taxonomies_categories: 'false',
    llms_txt_limit: '50',
    llms_txt_additional_content: '',
    md_endpoints_enabled: 'true',
    md_endpoints_posts: 'true',
    md_endpoints_pages: 'true',
  });

  useEffect(() => {
    fetch(`${BASE_PATH}/api/settings/seo`)
      .then((res) => res.json())
      .then((data) => {
        setSettings((prev) => ({ ...prev, ...data }));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings', err);
        toast.error('Failed to load settings');
        setIsLoading(false);
      });
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleBoolean = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to save: ${errorData.details || res.statusText}`);
      }
      toast.success('SEO Settings saved successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'links', label: 'Links', group: 'general', icon: LinkIcon, desc: 'Configure site-wide behavior for external links.' },
    { id: 'images', label: 'Images', group: 'general', icon: ImageIcon, desc: 'Automate image alt and title attributes.' },
    { id: 'breadcrumbs', label: 'Breadcrumbs', group: 'general', icon: Globe, desc: 'Enable and configure site-wide breadcrumbs.' },
    { id: 'llms', label: 'Edit llms.txt', group: 'advanced', icon: FileText, desc: 'Configure how LLMs read your content.' },
    { id: 'md', label: 'MD Endpoints', group: 'advanced', icon: Code, desc: 'Allow AI agents to fetch raw markdown.' },
    { id: 'webmaster', label: 'Webmaster Tools', group: 'advanced', icon: Settings, desc: 'Enter verification codes for third-party webmaster tools.' },
    { id: 'robots', label: 'Edit robots.txt', group: 'advanced', icon: FileText, desc: 'Control what search engine bots see.' },
  ];
  
  const separators = ['-', '–', '—', '»', '|', '•', '/'];

  if (isLoading) {
    return <div className="p-8 flex justify-center text-gray-500">Loading settings...</div>;
  }

  const activeTabInfo = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-4 font-semibold">
        Dashboard / General SEO Settings
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-200 flex flex-col min-h-[700px]">
        {/* Full-width Tab Header */}
        <div className="text-center py-10 border-b border-gray-200 bg-white z-10">
          <h2 className="text-[28px] font-medium text-gray-800">{activeTabInfo.label}</h2>
          <p className="text-[13px] text-gray-500 mt-2">{activeTabInfo.desc}</p>
        </div>

        {/* Split Body */}
        <div className="flex flex-1">
          {/* Vertical Tabs Sidebar */}
          <div className="w-64 bg-[#f8f9fa] border-r border-gray-200 flex-shrink-0 flex flex-col">
            <div className="space-y-0 pb-4">
              <div className="bg-[#f1f3f5] px-4 py-2 text-[12px] text-gray-600 border-b border-gray-200 shadow-inner font-semibold mb-2">General</div>
              {tabs.filter(t => t.group === 'general').map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => changeTab(tab.id)}
                  className={`w-full text-left px-4 py-3 text-[13px] transition-colors border-b border-gray-200 relative flex items-center gap-3 ${
                    activeTab === tab.id
                      ? 'bg-white text-[#0085ba] border-l-4 border-l-[#0085ba] font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-l-transparent'
                  }`}
                  style={activeTab === tab.id ? { width: 'calc(100% + 1px)', borderRight: '1px solid white', zIndex: 10 } : {}}
                >
                  <tab.icon size={16} className={activeTab === tab.id ? "text-[#0085ba]" : "text-gray-400"} />
                  {tab.label}
                </button>
              ))}

              <div className="bg-[#f1f3f5] px-4 py-2 text-[12px] text-gray-600 border-y border-gray-200 shadow-inner mt-4 mb-2 font-semibold">Advanced</div>
              {tabs.filter(t => t.group === 'advanced').map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => changeTab(tab.id)}
                  className={`w-full text-left px-4 py-3 text-[13px] transition-colors border-b border-gray-200 relative flex items-center gap-3 ${
                    activeTab === tab.id
                      ? 'bg-white text-[#0085ba] border-l-4 border-l-[#0085ba] font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-l-transparent'
                  }`}
                  style={activeTab === tab.id ? { width: 'calc(100% + 1px)', borderRight: '1px solid white', zIndex: 10 } : {}}
                >
                  <tab.icon size={16} className={activeTab === tab.id ? "text-[#0085ba]" : "text-gray-400"} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 bg-white relative flex flex-col">
            <div className="flex-1 p-8 pb-24 overflow-y-auto">

          {activeTab === 'links' && (
            <div className="divide-y divide-gray-100">
              <div className="grid grid-cols-12 gap-8 py-6 px-6">
                <div className="col-span-4">
                  <label className="text-[14px] font-bold text-gray-700">Nofollow External Links</label>
                </div>
                <div className="col-span-8">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.seo_nofollow_external === 'true'}
                    onClick={() => toggleBoolean('seo_nofollow_external')}
                    className={`${
                      settings.seo_nofollow_external === 'true' ? 'bg-[#0085ba]' : 'bg-gray-200'
                    } relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                  >
                    <span className={`${
                      settings.seo_nofollow_external === 'true' ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                  <p className="text-[12px] text-gray-500 mt-2">
                    Automatically add rel="nofollow" attribute for external links appearing in your posts, pages, and other post types. The attribute is dynamically applied when the content is displayed, and the stored content is not changed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-8 py-6 px-6">
                <div className="col-span-4">
                  <label className="text-[14px] font-bold text-gray-700">Nofollow Image File Links</label>
                </div>
                <div className="col-span-8">
                  <button
                    type="button"
                    role="switch"
                    onClick={() => toggleBoolean('seo_nofollow_image')}
                    className={`${
                      settings.seo_nofollow_image === 'true' ? 'bg-[#0085ba]' : 'bg-gray-200'
                    } relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                  >
                    <span className={`${
                      settings.seo_nofollow_image === 'true' ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                  <p className="text-[12px] text-gray-500 mt-2">
                    Automatically add rel="nofollow" attribute for links pointing to external image files. The attribute is dynamically applied when the content is displayed, and the stored content is not changed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-8 py-6 px-6">
                <div className="col-span-4">
                  <label className="text-[14px] font-bold text-gray-700">Open External Links in New Tab/Window</label>
                </div>
                <div className="col-span-8">
                  <button
                    type="button"
                    role="switch"
                    onClick={() => toggleBoolean('seo_open_external_new_tab')}
                    className={`${
                      settings.seo_open_external_new_tab === 'true' ? 'bg-[#0085ba]' : 'bg-gray-200'
                    } relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                  >
                    <span className={`${
                      settings.seo_open_external_new_tab === 'true' ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                  <p className="text-[12px] text-gray-500 mt-2">
                    Automatically add target="_blank" attribute for external links appearing in your posts, pages, and other post types to make them open in a new browser tab or window. The attribute is dynamically applied when the content is displayed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="divide-y divide-gray-100">
              <div className="grid grid-cols-12 gap-8 py-6 px-6">
                <div className="col-span-4">
                  <label className="text-[14px] font-bold text-gray-700">Add missing ALT attributes</label>
                </div>
                <div className="col-span-8">
                  <button
                    type="button"
                    role="switch"
                    onClick={() => toggleBoolean('seo_add_missing_alt')}
                    className={`${
                      settings.seo_add_missing_alt === 'true' ? 'bg-[#0085ba]' : 'bg-gray-200'
                    } relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                  >
                    <span className={`${
                      settings.seo_add_missing_alt === 'true' ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                  <p className="text-[12px] text-gray-500 mt-2">
                    Add alt attributes for images without alt attributes automatically. The attribute is dynamically applied when the content is displayed, and the stored content is not changed.
                  </p>
                </div>
              </div>

              {settings.seo_add_missing_alt === 'true' && (
                <div className="grid grid-cols-12 gap-8 py-6 px-6 bg-gray-50 border-t border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Alt attribute format</label>
                  </div>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={settings.seo_image_alt_format}
                      onChange={(e) => handleChange('seo_image_alt_format', e.target.value)}
                      placeholder="%title% %count(title)%"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-[12px] text-gray-500 mt-2">
                      Format used for the new <code>alt</code> attribute values.
                      Available variables: <code>%title%</code>, <code>%count(title)%</code>
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-12 gap-8 py-6 px-6">
                <div className="col-span-4">
                  <label className="text-[14px] font-bold text-gray-700">Add missing TITLE attributes</label>
                </div>
                <div className="col-span-8">
                  <button
                    type="button"
                    role="switch"
                    onClick={() => toggleBoolean('seo_add_missing_title')}
                    className={`${
                      settings.seo_add_missing_title === 'true' ? 'bg-[#0085ba]' : 'bg-gray-200'
                    } relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                  >
                    <span className={`${
                      settings.seo_add_missing_title === 'true' ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                  <p className="text-[12px] text-gray-500 mt-2">
                    Add TITLE attribute for all images without a TITLE attribute automatically. The attribute is dynamically applied when the content is displayed, and the stored content is not changed.
                  </p>
                </div>
              </div>

              {settings.seo_add_missing_title === 'true' && (
                <div className="grid grid-cols-12 gap-8 py-6 px-6 bg-gray-50 border-t border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Title attribute format</label>
                  </div>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={settings.seo_image_title_format}
                      onChange={(e) => handleChange('seo_image_title_format', e.target.value)}
                      placeholder="%title% %count(title)%"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-[12px] text-gray-500 mt-2">
                      Format used for the new <code>title</code> attribute values.
                      Available variables: <code>%title%</code>, <code>%count(title)%</code>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'breadcrumbs' && (
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-6 pb-2">
                <div className="bg-[#fff9e6] border border-gray-200 border-l-4 border-l-[#ffb900] p-4 text-[13px] text-gray-700 rounded-r-sm shadow-sm">
                  <p className="mb-2">
                    Use the following code in your TSX template or page editor files to display breadcrumbs.
                  </p>
                  <div className="inline-block bg-white px-2 py-1 rounded text-[13px] font-mono text-gray-800 border border-gray-200">
                    {'<Breadcrumbs />'}
                  </div>
                  <span className="mx-3 text-gray-600">OR</span>
                  <div className="inline-block bg-white px-2 py-1 rounded text-[13px] font-mono text-gray-800 border border-gray-200 mt-2 sm:mt-0">
                    [rank_math_breadcrumb]
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-8 py-6 px-6">
                <div className="col-span-4">
                  <label className="text-[14px] font-bold text-gray-700">Enable Breadcrumbs</label>
                </div>
                <div className="col-span-8">
                  <button
                    type="button"
                    role="switch"
                    onClick={() => toggleBoolean('breadcrumbs_enabled')}
                    className={`${
                      settings.breadcrumbs_enabled === 'true' ? 'bg-[#0085ba]' : 'bg-gray-200'
                    } relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                  >
                    <span className={`${
                      settings.breadcrumbs_enabled === 'true' ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                  <p className="text-[12px] text-gray-500 mt-2">Enable the breadcrumbs feature site-wide.</p>
                </div>
              </div>

              {settings.breadcrumbs_enabled === 'true' && (
                <>
                  <div className="grid grid-cols-12 gap-8 py-6 px-6 bg-gray-50 border-t border-gray-100">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Separator Character</label>
                    </div>
                    <div className="col-span-8">
                      <select
                        value={settings.breadcrumbs_separator}
                        onChange={(e) => handleChange('breadcrumbs_separator', e.target.value)}
                        className="w-48 border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none bg-white"
                      >
                        {separators.map(sep => (
                          <option key={sep} value={sep}>{sep}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-8 py-6 px-6 border-t border-gray-100">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Show Homepage Link</label>
                    </div>
                    <div className="col-span-8">
                      <button
                        type="button"
                        role="switch"
                        onClick={() => toggleBoolean('breadcrumbs_show_home')}
                        className={`${
                          settings.breadcrumbs_show_home === 'true' ? 'bg-[#0085ba]' : 'bg-gray-200'
                        } relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                      >
                        <span className={`${
                          settings.breadcrumbs_show_home === 'true' ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-8 py-6 px-6 border-t border-gray-100">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Homepage label</label>
                    </div>
                    <div className="col-span-8">
                      <input
                        type="text"
                        value={settings.breadcrumbs_home_label || ''}
                        onChange={(e) => handleChange('breadcrumbs_home_label', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-8 py-6 px-6 border-t border-gray-100">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Homepage Link</label>
                    </div>
                    <div className="col-span-8">
                      <input
                        type="text"
                        value={settings.breadcrumbs_home_link || ''}
                        onChange={(e) => handleChange('breadcrumbs_home_link', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-8 py-6 px-6 border-t border-gray-100">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Prefix Breadcrumb</label>
                    </div>
                    <div className="col-span-8">
                      <input
                        type="text"
                        value={settings.breadcrumbs_prefix || ''}
                        onChange={(e) => handleChange('breadcrumbs_prefix', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-8 py-6 px-6 border-t border-gray-100">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Hide Post Title</label>
                    </div>
                    <div className="col-span-8">
                      <button
                        type="button"
                        role="switch"
                        onClick={() => toggleBoolean('breadcrumbs_hide_title')}
                        className={`${
                          settings.breadcrumbs_hide_title === 'true' ? 'bg-[#0085ba]' : 'bg-gray-200'
                        } relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                      >
                        <span className={`${
                          settings.breadcrumbs_hide_title === 'true' ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                      </button>
                      <p className="text-[12px] text-gray-500 mt-2">Hide the post title from the breadcrumb trail.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'llms' && (
            <div className="divide-y divide-gray-100">
              <div className="px-6 pt-6 pb-0">
                <div className="bg-[#f0f6fc] border-l-4 border-[#2271b1] p-4 text-[14px] text-gray-700 rounded-r-sm">
                  Your llms.txt file is available at: <a href="/llms.txt" target="_blank" className="text-[#2271b1] hover:underline">{typeof window !== 'undefined' ? window.location.origin : ''}/llms.txt</a>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-8 py-6 px-6">
                <div className="col-span-4">
                  <label className="text-[14px] font-bold text-gray-700">Enable llms.txt</label>
                </div>
                <div className="col-span-8">
                  <button
                    type="button"
                    role="switch"
                    onClick={() => toggleBoolean('llms_txt_enabled')}
                    className={`${
                      settings.llms_txt_enabled === 'true' ? 'bg-[#0085ba]' : 'bg-gray-200'
                    } relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                  >
                    <span className={`${
                      settings.llms_txt_enabled === 'true' ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                  <p className="text-[12px] text-gray-500 mt-2">Generate an llms.txt file to guide AI models.</p>
                </div>
              </div>

              {settings.llms_txt_enabled === 'true' && (
                <>
                  <div className="grid grid-cols-12 gap-8 py-6 px-6">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Post Types to Include</label>
                    </div>
                    <div className="col-span-8 space-y-3">
                      {['posts', 'pages', 'products', 'courses'].map((pt) => (
                        <label key={pt} className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={settings[`llms_txt_post_types_${pt}`] === 'true'} 
                            onChange={(e) => handleChange(`llms_txt_post_types_${pt}`, e.target.checked ? 'true' : 'false')} 
                            className="w-4 h-4 text-[#0085ba] rounded border-gray-300" 
                          />
                          {pt.charAt(0).toUpperCase() + pt.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-8 py-6 px-6">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Taxonomies to Include</label>
                    </div>
                    <div className="col-span-8 space-y-3">
                      <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.llms_txt_taxonomies_categories === 'true'} 
                          onChange={(e) => handleChange('llms_txt_taxonomies_categories', e.target.checked ? 'true' : 'false')} 
                          className="w-4 h-4 text-[#0085ba] rounded border-gray-300" 
                        />
                        Categories
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-8 py-6 px-6">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Post Limit</label>
                    </div>
                    <div className="col-span-8">
                      <input
                        type="number"
                        value={settings.llms_txt_limit || ''}
                        onChange={(e) => handleChange('llms_txt_limit', e.target.value)}
                        className="w-32 border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                      />
                      <p className="text-[12px] text-gray-500 mt-2">Maximum number of posts to include in the file.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-8 py-6 px-6">
                    <div className="col-span-4">
                      <label className="text-[14px] font-bold text-gray-700">Additional Content</label>
                    </div>
                    <div className="col-span-8">
                      <textarea
                        rows={6}
                        value={settings.llms_txt_additional_content || ''}
                        onChange={(e) => handleChange('llms_txt_additional_content', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none font-mono"
                        placeholder="Add any additional markdown content you want appended..."
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'md' && (
            <div className="divide-y divide-gray-100">
              <div className="grid grid-cols-12 gap-8 py-6 px-6">
                <div className="col-span-4">
                  <label className="text-[14px] font-bold text-gray-700">Markdown (.md) Endpoints</label>
                  <p className="text-[12px] text-gray-500 mt-1">Allow AI agents to fetch the raw text of pages by appending .md to the URL.</p>
                </div>
                <div className="col-span-8">
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[14px] text-gray-900 font-medium cursor-pointer">
                      <input type="checkbox" name="md_endpoints_enabled" checked={settings.md_endpoints_enabled === 'true'} onChange={(e) => handleChange('md_endpoints_enabled', e.target.checked ? 'true' : 'false')} className="w-4 h-4 text-[#0085ba] rounded border-gray-300" />
                      Enable .md Endpoints Global Feature
                    </label>
                    <div className="pl-6 space-y-3">
                      <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
                        <input type="checkbox" name="md_endpoints_pages" checked={settings.md_endpoints_pages === 'true'} onChange={(e) => handleChange('md_endpoints_pages', e.target.checked ? 'true' : 'false')} className="w-4 h-4 text-[#0085ba] rounded border-gray-300" disabled={settings.md_endpoints_enabled !== 'true'} />
                        Allow for Pages
                      </label>
                      <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
                        <input type="checkbox" name="md_endpoints_posts" checked={settings.md_endpoints_posts === 'true'} onChange={(e) => handleChange('md_endpoints_posts', e.target.checked ? 'true' : 'false')} className="w-4 h-4 text-[#0085ba] rounded border-gray-300" disabled={settings.md_endpoints_enabled !== 'true'} />
                        Allow for Posts
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'webmaster' && (
            <div className="divide-y divide-gray-100">
                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Google Search Console</label>
                  </div>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={settings.seo_google_verify}
                      onChange={(e) => handleChange('seo_google_verify', e.target.value)}
                      placeholder="Enter your Google Search Console verification HTML code or ID"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Bing Webmaster Tools</label>
                  </div>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={settings.seo_bing_verify}
                      onChange={(e) => handleChange('seo_bing_verify', e.target.value)}
                      placeholder="Enter your Bing Webmaster Tools verification HTML code or ID"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Baidu Webmaster Tools</label>
                  </div>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={settings.seo_baidu_verify}
                      onChange={(e) => handleChange('seo_baidu_verify', e.target.value)}
                      placeholder="Enter your Baidu Webmaster Tools verification HTML code or ID"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Yandex Verification ID</label>
                  </div>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={settings.seo_yandex_verify}
                      onChange={(e) => handleChange('seo_yandex_verify', e.target.value)}
                      placeholder="Enter your Yandex verification HTML code or ID"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Pinterest Verification ID</label>
                  </div>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={settings.seo_pinterest_verify}
                      onChange={(e) => handleChange('seo_pinterest_verify', e.target.value)}
                      placeholder="Enter your Pinterest verification HTML code or ID"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Norton Safe Web Verification ID</label>
                  </div>
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={settings.seo_norton_verify}
                      onChange={(e) => handleChange('seo_norton_verify', e.target.value)}
                      placeholder="Enter your Norton Safe Web verification HTML code or ID"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Custom Webmaster Tags</label>
                  </div>
                  <div className="col-span-8">
                    <textarea
                      rows={4}
                      value={settings.seo_custom_webmaster_tags}
                      onChange={(e) => handleChange('seo_custom_webmaster_tags', e.target.value)}
                      placeholder="Enter your custom webmaster tags. Only <meta> tags are allowed."
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] focus:border-[#0085ba] outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
          )}

          {activeTab === 'robots' && (
            <div className="divide-y divide-gray-100">
                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Edit robots.txt</label>
                  </div>
                  <div className="col-span-8">
                    <textarea
                      rows={15}
                      value={settings.seo_robots_txt}
                      onChange={(e) => handleChange('seo_robots_txt', e.target.value)}
                      placeholder="User-agent: *&#10;Disallow: /wp-admin/&#10;Allow: /wp-admin/admin-ajax.php"
                      className="w-full border border-gray-300 bg-gray-900 text-gray-100 rounded px-4 py-4 focus:border-[#0085ba] outline-none font-mono text-[13px]"
                    />
                  </div>
                </div>
              </div>
          )}


            </div>
            
            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 flex justify-between items-center z-10">
              <button className="px-5 py-2 border border-gray-300 text-gray-600 rounded bg-white hover:bg-gray-50 text-[13px] font-medium shadow-sm transition-colors">
                Reset Options
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[#0085ba] text-white rounded hover:bg-[#0073a1] text-[13px] font-medium shadow-sm transition-colors disabled:opacity-70"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

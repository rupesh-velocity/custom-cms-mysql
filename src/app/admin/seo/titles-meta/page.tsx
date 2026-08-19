'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Image as ImageIcon, Plus, X, Globe, MapPin, Share2, Home, Users, Settings, FileText, File, Paperclip, Briefcase, Folder, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import MediaModal from '@/components/MediaModal';
import LocalSeoTab from '@/components/seo/LocalSeoTab';
import SeoVariableInput from '@/components/seo/SeoVariableInput';
import SearchableSelect from '@/components/SearchableSelect';
import { BASE_PATH } from '@/lib/config';

const schemaOptions = [
  { value: "", label: "None (Click here to set one)" },
  { value: "Article", label: "Article" },
  { value: "Book", label: "Book" },
  { value: "Course", label: "Course" },
  { value: "Dataset", label: "DataSet" },
  { value: "Event", label: "Event" },
  { value: "Fact Check", label: "Fact Check" },
  { value: "Job Posting", label: "Job Posting" },
  { value: "Movie", label: "Movie" },
  { value: "Music", label: "Music" },
  { value: "Person", label: "Person" },
  { value: "Product", label: "Product" },
  { value: "Recipe", label: "Recipe" },
  { value: "Restaurant", label: "Restaurant" },
  { value: "Service", label: "Service" },
  { value: "Software", label: "Software Application" },
  { value: "Video", label: "Video" }
];

export default function TitlesAndMetaSettings() {
  const [activeTab, setActiveTab] = useState('global');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);


  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [currentMediaField, setCurrentMediaField] = useState<string>('');

  const [settings, setSettings] = useState<Record<string, string>>({
    // Global Meta
    seo_global_robots: 'index',
    seo_global_advanced_robots: 'snippet:-1,video:-1,image:large',
    seo_noindex_empty_archives: 'false',
    seo_separator: '-',
    seo_capitalize_titles: 'false',
    seo_og_thumbnail: '',
    seo_twitter_card: 'summary_large_image',
    // Local SEO
    seo_local_type: 'organization',
    seo_local_website_name: '',
    seo_local_website_alt_name: '',
    seo_local_org_name: '',
    seo_local_desc: '',
    seo_local_logo: '',
    seo_local_url: '',
    seo_local_multiple_locations: 'false',
    seo_local_email: '',
    seo_local_address: '',
    seo_local_address_format: '{address} {locality}, {region} {postalcode}',
    seo_local_business_type: 'Organization',
    seo_local_opening_hours: '[]',
    seo_local_opening_hours_format: '24',
    seo_local_phones: '[]',
    seo_local_price_range: '$$$',
    seo_local_additional_info: '[]',
    seo_local_google_maps_key: '',
    seo_local_geo_coords: '',
    seo_local_about_page: '',
    seo_local_contact_page: '',
    // Social Meta
    seo_social_fb_url: '',
    seo_social_fb_authorship: '',
    seo_social_fb_admin: '',
    seo_social_fb_app: '',
    seo_social_fb_secret: '',
    seo_social_twitter_username: '',
    seo_social_additional_profiles: '[]',
    // Posts
    seo_post_title: '%title% %sep% %sitename%',
    seo_post_desc: '%excerpt%',
    seo_post_schema_type: 'Article',
    seo_post_headline: '%seo_title%',
    seo_post_schema_desc: '%seo_description%',
    seo_post_article_type: 'Blog Post',
    seo_post_autodetect_video: 'false',
    seo_post_autogen_image: 'false',
    seo_post_robots: 'default',
    seo_post_advanced_robots: 'default',
    seo_post_link_suggestions: 'false',
    seo_post_link_suggestion_titles: 'false',
    seo_post_primary_tax: 'categories',
    seo_post_slack_enhanced: 'false',
    seo_post_add_seo_controls: 'true',
    seo_post_bulk_editing: 'false',
    seo_post_custom_fields: '',
    seo_post_default_watermark: '',
    // Pages
    seo_page_title: '%title% %sep% %sitename%',
    seo_page_desc: '%excerpt%',
    seo_page_schema_type: 'Service',
    seo_page_headline: '%seo_title%',
    seo_page_schema_desc: '%seo_description%',
    seo_page_autodetect_video: 'false',
    seo_page_robots: 'default',
    seo_page_advanced_robots: 'default',
    seo_page_link_suggestions: 'false',
    seo_page_link_suggestion_titles: 'false',
    seo_page_slack_enhanced: 'false',
    seo_page_add_seo_controls: 'true',
    seo_page_bulk_editing: 'false',
    seo_page_custom_fields: '',
    seo_page_default_watermark: '',
    // Portfolios
    seo_portfolio_title: '%title% %sep% %sitename%',
    seo_portfolio_desc: '%excerpt%',
    seo_portfolio_schema_type: 'Article',
    seo_portfolio_headline: '%seo_title%',
    seo_portfolio_schema_desc: '%seo_description%',
    seo_portfolio_autodetect_video: 'false',
    seo_portfolio_robots: 'default',
    seo_portfolio_advanced_robots: 'default',
    seo_portfolio_link_suggestions: 'false',
    seo_portfolio_link_suggestion_titles: 'false',
    seo_portfolio_slack_enhanced: 'false',
    seo_portfolio_add_seo_controls: 'true',
    seo_portfolio_bulk_editing: 'false',
    seo_portfolio_custom_fields: '',
    seo_portfolio_default_watermark: '',
    // Attachments
    seo_attachment_title: '%title% %page% %sep% %sitename%',
    seo_attachment_desc: '%excerpt%',
    seo_attachment_schema_type: '',
    seo_attachment_autodetect_video: 'false',
    seo_attachment_autogen_image: 'false',
    seo_attachment_robots: 'default',
    seo_attachment_advanced_robots: 'default',
    seo_attachment_bulk_editing: 'Disabled',
    seo_attachment_default_watermark: 'Off',
  });

  const [initialSettings, setInitialSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      setActiveTab(window.location.hash.replace('#', ''));
    }
    fetch(`${BASE_PATH}/api/settings/seo`)
      .then((res) => res.json())
      .then((data) => {
        setSettings((prev) => ({ ...prev, ...data }));
        setInitialSettings((prev) => ({ ...prev, ...data }));
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
      // Find which settings actually changed
      const changedSettings: Record<string, string> = {};
      Object.keys(settings).forEach(key => {
        if (settings[key] !== initialSettings[key]) {
          changedSettings[key] = settings[key];
        }
      });

      // If nothing changed, we don't need to make an API call
      if (Object.keys(changedSettings).length === 0) {
        toast.success('Titles & Meta Settings saved successfully');
        setIsSaving(false);
        return;
      }

      const res = await fetch(`${BASE_PATH}/api/settings/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changedSettings)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to save settings: ${errorData.details || errorData.error || res.statusText}`);
      }
      
      // Update initialSettings so subsequent saves only check for new changes
      setInitialSettings((prev) => ({ ...prev, ...changedSettings }));
      
      toast.success('Titles & Meta Settings saved successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const openMediaModal = (field: string) => {
    setCurrentMediaField(field);
    setIsMediaModalOpen(true);
  };

  const handleMediaSelect = (url: string) => {
    handleChange(currentMediaField, url);
    setIsMediaModalOpen(false);
  };

  const tabs = [
    { id: 'global', label: 'Global Meta', group: 'general', icon: Settings, desc: 'Change Global meta settings that take effect across your website. Learn more.' },
    { id: 'local', label: 'Local SEO', group: 'general', icon: MapPin, desc: 'Configure Local SEO settings for your business. Learn more.' },
    { id: 'social', label: 'Social Meta', group: 'general', icon: Share2, desc: 'Configure default OpenGraph and Twitter card settings.' },
    { id: 'posts', label: 'Posts', group: 'post_types', icon: FileText, desc: 'Default title tag and description for single Post pages. This can be changed on a per-post basis on the post editor screen.' },
    { id: 'pages', label: 'Pages', group: 'post_types', icon: File, desc: 'Default title tag and description for single Page pages.' },
    { id: 'attachments', label: 'Attachments', group: 'post_types', icon: Paperclip, desc: 'Change Global SEO, Schema, and other settings for media attachment. Learn more.' },
    { id: 'portfolios', label: 'Portfolios', group: 'post_types', icon: Briefcase, desc: 'Default title tag and description for single Portfolio pages.' },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  };

  const activeTabInfo = tabs.find(t => t.id === activeTab) || tabs[0];

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-4 font-semibold">
        Dashboard / SEO Titles & Meta
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
              {tabs.filter(t => t.group === 'general').map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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

              <div className="bg-[#f1f3f5] px-4 py-2 text-[12px] text-gray-600 border-b border-gray-200 shadow-inner mt-4 font-semibold">Post Types:</div>
              
              {tabs.filter(t => t.group === 'post_types').map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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

          {activeTab === 'global' && (
            <div className="divide-y divide-gray-100">
                
                {/* Robots Meta */}
                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Robots Meta</label>
                  </div>
                  <div className="col-span-8">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-2">
                      {['Index', 'No Index', 'No Follow', 'No Archive', 'No Image Index', 'No Snippet'].map(robot => {
                        const val = robot.toLowerCase().replace(' ', '');
                        const currentRobots = (settings.seo_global_robots || '').split(',').filter(Boolean);
                        const isChecked = currentRobots.includes(val);
                        
                        return (
                          <label key={robot} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                let newRobots = [...currentRobots];
                                if (e.target.checked) {
                                  newRobots.push(val);
                                  // Mutually exclusive logic for Index / No Index
                                  if (val === 'index') newRobots = newRobots.filter(r => r !== 'noindex');
                                  if (val === 'noindex') newRobots = newRobots.filter(r => r !== 'index');
                                } else {
                                  newRobots = newRobots.filter(r => r !== val);
                                }
                                // Remove duplicates just in case
                                newRobots = Array.from(new Set(newRobots));
                                handleChange('seo_global_robots', newRobots.join(','));
                              }}
                              className="w-4 h-4 text-[#00b8e6] rounded border-gray-300 focus:ring-[#00b8e6]" 
                            />
                            <span className="text-[13px] text-gray-700">{robot}</span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[12px] text-gray-500">Default values for robots meta tag. These can be changed for individual posts, taxonomies, etc.</p>
                  </div>
                </div>

                {/* Advanced Robots Meta */}
                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Advanced Robots Meta</label>
                  </div>
                  <div className="col-span-8">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-[12px] font-medium text-gray-600 block mb-2 flex items-center gap-1">
                          <input type="checkbox" checked={settings.seo_global_adv_snippet === 'true'} onChange={() => toggleBoolean('seo_global_adv_snippet')} className="rounded border-gray-300" /> Snippet
                        </span>
                        <input type="text" value={settings.seo_global_adv_snippet_val || ''} onChange={(e) => handleChange('seo_global_adv_snippet_val', e.target.value)} disabled={settings.seo_global_adv_snippet !== 'true'} placeholder="-1" className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                      </div>
                      <div>
                        <span className="text-[12px] font-medium text-gray-600 block mb-2 flex items-center gap-1">
                          <input type="checkbox" checked={settings.seo_global_adv_video === 'true'} onChange={() => toggleBoolean('seo_global_adv_video')} className="rounded border-gray-300" /> Video Preview
                        </span>
                        <input type="text" value={settings.seo_global_adv_video_val || ''} onChange={(e) => handleChange('seo_global_adv_video_val', e.target.value)} disabled={settings.seo_global_adv_video !== 'true'} placeholder="-1" className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                      </div>
                      <div>
                        <span className="text-[12px] font-medium text-gray-600 block mb-2 flex items-center gap-1">
                          <input type="checkbox" checked={settings.seo_global_adv_image === 'true'} onChange={() => toggleBoolean('seo_global_adv_image')} className="rounded border-gray-300" /> Image Preview
                        </span>
                        <select value={settings.seo_global_adv_image_val || 'Large'} onChange={(e) => handleChange('seo_global_adv_image_val', e.target.value)} disabled={settings.seo_global_adv_image !== 'true'} className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400">
                          <option value="Large">Large</option>
                          <option value="Standard">Standard</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Noindex Empty Category */}
                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700 leading-tight block">Noindex Empty Category and Tag Archives</label>
                  </div>
                  <div className="col-span-8">
                    <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
  <input type="checkbox" checked={settings.seo_noindex_empty_archives === 'true'} onChange={() => toggleBoolean('seo_noindex_empty_archives')} className="sr-only peer" />
  <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
</label>
                    <p className="text-[12px] text-gray-500 mt-1">Setting empty archives to <code>noindex</code> is useful for avoiding indexation of thin content pages and dilution of page rank. As soon as a post is added, the page is updated to <code>index</code>.</p>
                  </div>
                </div>

                {/* Separator Character */}
                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Separator Character</label>
                  </div>
                  <div className="col-span-8">
                    <div className="flex border border-gray-200 rounded-md w-max overflow-hidden mb-2">
                      {['-', '–', '—', '•', '|', '⋆'].map(char => (
                        <button
                          key={char}
                          onClick={() => handleChange('seo_separator', char)}
                          className={`w-12 h-10 flex items-center justify-center text-lg border-r border-gray-200 last:border-0 ${settings.seo_separator === char ? 'bg-[#00b8e6] text-white font-bold shadow-inner' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    <p className="text-[12px] text-gray-500">You can use the separator character in titles by inserting <code>%separator%</code> or <code>%sep%</code> in the title fields.</p>
                  </div>
                </div>

                {/* Capitalize Titles */}
                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Capitalize Titles</label>
                  </div>
                  <div className="col-span-8">
                    <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
  <input type="checkbox" checked={settings.seo_capitalize_titles === 'true'} onChange={() => toggleBoolean('seo_capitalize_titles')} className="sr-only peer" />
  <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
</label>
                    <p className="text-[12px] text-gray-500 mt-1">Automatically capitalize the first character of each word in the titles.</p>
                  </div>
                </div>

                {/* OpenGraph Thumbnail */}
                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">OpenGraph Thumbnail</label>
                  </div>
                  <div className="col-span-8">
                    <button onClick={() => openMediaModal('seo_og_thumbnail')} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-[13px] font-medium hover:bg-gray-50 mb-2 shadow-sm">
                      Add or Upload File
                    </button>
                    {settings.seo_og_thumbnail && (
                      <div className="mt-2 mb-3">
                        <img src={settings.seo_og_thumbnail} alt="OG Thumbnail" className="max-w-[200px] border rounded" />
                      </div>
                    )}
                    <p className="text-[12px] text-gray-500 leading-relaxed">When a featured image or an OpenGraph Image is not set for individual posts/pages/CPTs, this image will be used as a fallback thumbnail when your post is shared on Facebook. The recommended image size is 1200 x 630 pixels.</p>
                  </div>
                </div>

                {/* Twitter Card Type */}
                <div className="grid grid-cols-12 gap-8 py-6 px-6">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Twitter Card Type</label>
                  </div>
                  <div className="col-span-8">
                    <select 
                      value={settings.seo_twitter_card || 'summary_large_image'} 
                      onChange={(e) => handleChange('seo_twitter_card', e.target.value)}
                      className="w-full max-w-md border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#00b8e6] mb-2"
                    >
                      <option value="summary_large_image">Summary Card with Large Image</option>
                      <option value="summary">Summary Card</option>
                    </select>
                    <p className="text-[12px] text-gray-500">Card type selected when creating a new post. This will also be applied for posts without a card type selected.</p>
                  </div>
                </div>
              </div>
          )}

          {activeTab === 'local' && (
            <LocalSeoTab 
              settings={settings} 
              handleChange={handleChange} 
              toggleBoolean={toggleBoolean} 
              openMediaModal={openMediaModal} 
            />
          )}
          
          {activeTab === 'social' && (
            <div className="divide-y divide-gray-100">
                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Facebook Page URL</label>
                  </div>
                  <div className="col-span-8">
                    <input type="text" value={settings.seo_social_fb_url || ''} onChange={(e) => handleChange('seo_social_fb_url', e.target.value)} placeholder="https://www.facebook.com/RankMath/" className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#5e3fde]" />
                    <p className="text-[12px] text-gray-500 mt-2">Enter your complete Facebook page URL here.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Facebook Authorship</label>
                  </div>
                  <div className="col-span-8">
                    <input type="text" value={settings.seo_social_fb_authorship || ''} onChange={(e) => handleChange('seo_social_fb_authorship', e.target.value)} placeholder="https://www.facebook.com/zuck" className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#5e3fde]" />
                    <p className="text-[12px] text-gray-500 mt-2">Insert personal Facebook profile URL to show Facebook Authorship.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Facebook App ID</label>
                  </div>
                  <div className="col-span-8">
                    <input type="text" value={settings.seo_social_fb_app || ''} onChange={(e) => handleChange('seo_social_fb_app', e.target.value)} placeholder="manage_vcmnsite_vc" className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#5e3fde]" />
                    <p className="text-[12px] text-gray-500 mt-2">Enter numeric app ID. Alternatively, you can enter a user ID below.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Facebook Admin</label>
                  </div>
                  <div className="col-span-8">
                    <input type="text" value={settings.seo_social_fb_admin || ''} onChange={(e) => handleChange('seo_social_fb_admin', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#5e3fde]" />
                    <p className="text-[12px] text-gray-500 mt-2">Enter numeric user ID. Use a comma to separate multiple IDs.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Facebook Secret</label>
                  </div>
                  <div className="col-span-8">
                    <input type="text" value={settings.seo_social_fb_secret || ''} onChange={(e) => handleChange('seo_social_fb_secret', e.target.value)} placeholder=".................." className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#5e3fde]" />
                    <p className="text-[12px] text-gray-500 mt-2">Enter alphanumeric secret ID.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Twitter Username</label>
                  </div>
                  <div className="col-span-8">
                    <input type="text" value={settings.seo_social_twitter_username || ''} onChange={(e) => handleChange('seo_social_twitter_username', e.target.value)} placeholder="RankMathSEO" className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#5e3fde]" />
                    <p className="text-[12px] text-gray-500 mt-2">Enter the Twitter username of the author to add twitter:creator tag.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100 last:border-0">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Additional Profiles</label>
                  </div>
                  <div className="col-span-8">
                    <textarea value={settings.seo_social_additional_profiles ? (typeof settings.seo_social_additional_profiles === 'string' ? JSON.parse(settings.seo_social_additional_profiles).join('\n') : settings.seo_social_additional_profiles) : ''} onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim() !== '');
                      handleChange('seo_social_additional_profiles', JSON.stringify(lines));
                    }} rows={4} className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] outline-none focus:border-[#5e3fde] resize-none" />
                    <p className="text-[12px] text-gray-500 mt-2">Add other social profiles (one per line) to be used in the Schema output.</p>
                  </div>
                </div>
              </div>
          )}

                    {activeTab === 'posts' && (
            <div className="divide-y divide-gray-100">
                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Single Post Title</label>
                  </div>
                  <div className="col-span-8">
                    <SeoVariableInput
                      value={settings.seo_post_title || ''}
                      onChange={(val) => handleChange('seo_post_title', val)}
                    />
                    <div className="mt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Example</span>
                      <p className="text-[14px] font-semibold text-[#1a0dab] mt-1">What Is AI Digital Marketing? A Complete Guide for Businesse...</p>
                      <p className="text-[12px] text-gray-500 mt-1">Default title tag for single Post pages. This can be changed on a per-post basis on the post editor screen.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Single Post Description</label>
                  </div>
                  <div className="col-span-8">
                    <SeoVariableInput
                      value={settings.seo_post_desc || ''}
                      onChange={(val) => handleChange('seo_post_desc', val)}
                      multiline={true}
                      rows={3}
                    />
                    <div className="mt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Example</span>
                      <p className="text-[13px] text-gray-600 mt-1">AI digital marketing combines artificial intelligence technologies with digital marketing strategies to automate tasks, analyze customer behavior, and deliver...</p>
                      <p className="text-[12px] text-gray-500 mt-1">Default description for single Post pages. This can be changed on a per-post basis on the post editor screen.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Schema Type</label>
                  </div>
                  <div className="col-span-8">
                    <SearchableSelect 
                      value={settings.seo_post_schema_type || 'Article'} 
                      onChange={(val) => handleChange('seo_post_schema_type', val)}
                      options={schemaOptions}
                    />
                    <p className="text-[12px] text-gray-500 mt-2">Default rich snippet selected when creating a new post of this type. If <code className="bg-gray-100 text-[#d44179] px-1 py-0.5 rounded text-[11px]">Article</code> is selected, it will be applied for all existing posts with no Schema selected.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Headline</label>
                  </div>
                  <div className="col-span-8">
                    <SeoVariableInput
                      value={settings.seo_post_headline || ''}
                      onChange={(val) => handleChange('seo_post_headline', val)}
                      placeholder="%seo_title%"
                    />
                    <div className="mt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Example</span>
                      <p className="text-[14px] font-semibold text-[#1a0dab] mt-1">What Is AI Digital Marketing? A Complete Guide for Businesse...</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Description</label>
                  </div>
                  <div className="col-span-8">
                    <SeoVariableInput
                      value={settings.seo_post_schema_desc || ''}
                      onChange={(val) => handleChange('seo_post_schema_desc', val)}
                      placeholder="%seo_description%"
                    />
                    <div className="mt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Example</span>
                      <p className="text-[13px] text-gray-600 mt-1">AI digital marketing combines artificial intelligence technologies with digital marketing strategies to automate tasks, analyze customer behavior, and deliver...</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Article Type</label>
                  </div>
                  <div className="col-span-8">
                    <select 
                      value={settings.seo_post_article_type || 'Blog Post'} 
                      onChange={(e) => handleChange('seo_post_article_type', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-[14px] outline-none focus:border-[#5e3fde]"
                    >
                      <option value="Blog Post">Blog Post</option>
                      <option value="News Article">News Article</option>
                      <option value="Article">Article</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Autodetect Video & Generate Image</label>
                  </div>
                  <div className="col-span-8">
                    <div className="space-y-4">
                      <div>
                        <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
  <input type="checkbox" checked={settings.seo_post_autodetect_video === 'true'} onChange={() => toggleBoolean('seo_post_autodetect_video')} className="sr-only peer" />
  <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
</label>
                        <p className="text-[12px] text-gray-500 mt-1">Populate automatic Video Schema by auto-detecting any video in the content.</p>
                      </div>
                      <div>
                        <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
  <input type="checkbox" checked={settings.seo_post_autogen_image === 'true'} onChange={() => toggleBoolean('seo_post_autogen_image')} className="sr-only peer" />
  <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
</label>
                        <p className="text-[12px] text-gray-500 mt-1">Auto-generate image for the auto detected video.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Post Robots Meta</label>
                  </div>
                  <div className="col-span-8">
                    <div className="flex items-center gap-3 mb-2">
                      <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
  <input type="checkbox" checked={settings.seo_post_robots !== 'default'} onChange={(e) => {
                          if (e.target.checked) handleChange('seo_post_robots', 'index');
                          else handleChange('seo_post_robots', 'default');
                        }} className="sr-only peer" />
  <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
</label>
                    </div>
                    <p className="text-[12px] text-gray-500 mb-3">Select custom robots meta, such as <code className="bg-gray-100 px-1 py-0.5 rounded">noarchive</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">nosnippet</code>, etc. for single Post pages. Otherwise the default meta will be used, as set in the Global Meta tab.</p>

                    {settings.seo_post_robots !== 'default' && (
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-2">
                        {['Index', 'No Index', 'No Follow', 'No Archive', 'No Image Index', 'No Snippet'].map(robot => {
                          const val = robot.toLowerCase().replace(' ', '');
                          const currentRobots = (settings.seo_post_robots || '').split(',').filter(Boolean);
                          const isChecked = currentRobots.includes(val);
                          return (
                            <label key={robot} className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={(e) => {
                                  let newRobots = [...currentRobots];
                                  if (e.target.checked) {
                                    newRobots.push(val);
                                    if (val === 'index') newRobots = newRobots.filter(r => r !== 'noindex');
                                    if (val === 'noindex') newRobots = newRobots.filter(r => r !== 'index');
                                  } else {
                                    newRobots = newRobots.filter(r => r !== val);
                                  }
                                  newRobots = Array.from(new Set(newRobots));
                                  handleChange('seo_post_robots', newRobots.join(','));
                                }}
                                className="w-4 h-4 text-[#00b8e6] rounded border-gray-300 focus:ring-[#00b8e6]" 
                              />
                              <span className="text-[13px] text-gray-700 flex items-center gap-1">{robot} <span className="inline-flex items-center justify-center w-3 h-3 bg-gray-200 text-gray-500 rounded-full text-[9px] font-bold font-serif italic">i</span></span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Post Advanced Robots Meta</label>
                  </div>
                  <div className="col-span-8">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-[13px] text-gray-700 block mb-2 flex items-center gap-2">
                          <input type="checkbox" checked={true} readOnly className="rounded border-gray-300 text-[#00b8e6]" /> Snippet <span className="inline-flex items-center justify-center w-3 h-3 bg-gray-200 text-gray-500 rounded-full text-[9px] font-bold font-serif italic">i</span>
                        </span>
                        <input type="text" value={settings.seo_post_adv_snippet_val || ''} onChange={(e) => handleChange('seo_post_adv_snippet_val', e.target.value)} placeholder="-1" className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] outline-none" />
                      </div>
                      <div>
                        <span className="text-[13px] text-gray-700 block mb-2 flex items-center gap-2">
                          <input type="checkbox" checked={true} readOnly className="rounded border-gray-300 text-[#00b8e6]" /> Video Preview <span className="inline-flex items-center justify-center w-3 h-3 bg-gray-200 text-gray-500 rounded-full text-[9px] font-bold font-serif italic">i</span>
                        </span>
                        <input type="text" value={settings.seo_post_adv_video_val || ''} onChange={(e) => handleChange('seo_post_adv_video_val', e.target.value)} placeholder="-1" className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] outline-none" />
                      </div>
                      <div>
                        <span className="text-[13px] text-gray-700 block mb-2 flex items-center gap-2">
                          <input type="checkbox" checked={true} readOnly className="rounded border-gray-300 text-[#00b8e6]" /> Image Preview <span className="inline-flex items-center justify-center w-3 h-3 bg-gray-200 text-gray-500 rounded-full text-[9px] font-bold font-serif italic">i</span>
                        </span>
                        <select value={settings.seo_post_adv_image_val || 'Large'} onChange={(e) => handleChange('seo_post_adv_image_val', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] outline-none">
                          <option value="Large">Large</option>
                          <option value="Standard">Standard</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Link Suggestions</label>
                  </div>
                  <div className="col-span-8">
                    <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
                        <input type="checkbox" checked={settings.seo_post_link_suggestions === 'true'} onChange={() => toggleBoolean('seo_post_link_suggestions')} className="sr-only peer" />
                        <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
                    </label>
                    <p className="text-[13px] text-gray-500">Enable Link Suggestions meta box for this post type.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Link Suggestion Titles</label>
                  </div>
                  <div className="col-span-8">
                    <div className="flex border border-gray-300 rounded w-max overflow-hidden mb-2">
                      {['Titles', 'Focus Keywords'].map(opt => {
                        const isActive = (settings.seo_post_link_suggestion_titles || 'Titles') === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleChange('seo_post_link_suggestion_titles', opt)}
                            className={`px-4 py-1.5 text-[13px] font-medium transition-colors border-r border-gray-300 last:border-0 ${isActive ? 'bg-[#0085ba] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[13px] text-gray-500">Use the Focus Keyword as the default text for the links instead of the post titles.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Add SEO Controls</label>
                  </div>
                  <div className="col-span-8">
                    <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
                        <input type="checkbox" checked={settings.seo_post_add_seo_controls === 'true'} onChange={() => toggleBoolean('seo_post_add_seo_controls')} className="sr-only peer" />
                        <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
                    </label>
                    <p className="text-[13px] text-gray-500">Add SEO controls for the editor screen to customize SEO options for posts in this post type.</p>
                  </div>
                </div>

                

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Bulk Editing</label>
                  </div>
                  <div className="col-span-8">
                    <div className="flex border border-gray-300 rounded w-max overflow-hidden mb-2">
                      {['Disabled', 'Enabled', 'Read Only'].map(opt => {
                        const isActive = (settings.seo_attachment_bulk_editing || 'Disabled') === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleChange('seo_attachment_bulk_editing', opt)}
                            className={`px-4 py-1.5 text-[13px] font-medium transition-colors border-r border-gray-300 last:border-0 ${isActive ? 'bg-[#0085ba] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[13px] text-gray-500">Add bulk editing columns to the post listing screen.</p>
                  </div>
                </div>
              </div>
          )}

          {activeTab === 'pages' && (
            <div>
              

              <div className="bg-white rounded-md shadow-sm border border-gray-200">
                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Single Page Title</label>
                  </div>
                  <div className="col-span-8">
                    <SeoVariableInput
                      value={settings.seo_page_title || ''}
                      onChange={(val) => handleChange('seo_page_title', val)}
                      placeholder="%title% %sep% %sitename%"
                    />
                    <div className="mt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Example</span>
                      <p className="text-[14px] font-semibold text-[#1a0dab] mt-1">What Is AI Digital Marketing? A Complete Guide for Businesse...</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Single Page Description</label>
                  </div>
                  <div className="col-span-8">
                    <SeoVariableInput
                      value={settings.seo_page_desc || ''}
                      onChange={(val) => handleChange('seo_page_desc', val)}
                      placeholder="%excerpt%"
                    />
                    <div className="mt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Example</span>
                      <p className="text-[13px] text-gray-600 mt-1">AI digital marketing combines artificial intelligence technologies with digital marketing strategies to automate tasks, analyze customer behavior, and deliver...</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Schema Type</label>
                  </div>
                  <div className="col-span-8">
                    <SearchableSelect 
                      value={settings.seo_page_schema_type || 'Article'} 
                      onChange={(val) => handleChange('seo_page_schema_type', val)}
                      options={schemaOptions}
                    />
                    <p className="text-[12px] text-gray-500 mt-2">Default rich snippet selected when creating a new post of this type. If <code className="bg-gray-100 text-[#d44179] px-1 py-0.5 rounded text-[11px]">Service</code> is selected, it will be applied for all existing posts with no Schema selected.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Headline</label>
                  </div>
                  <div className="col-span-8">
                    <SeoVariableInput
                      value={settings.seo_page_headline || ''}
                      onChange={(val) => handleChange('seo_page_headline', val)}
                      placeholder="%seo_title%"
                    />
                    <div className="mt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Example</span>
                      <p className="text-[14px] font-semibold text-[#1a0dab] mt-1">What Is AI Digital Marketing? A Complete Guide for Businesse...</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Description</label>
                  </div>
                  <div className="col-span-8">
                    <SeoVariableInput
                      value={settings.seo_page_schema_desc || ''}
                      onChange={(val) => handleChange('seo_page_schema_desc', val)}
                      placeholder="%seo_description%"
                    />
                    <div className="mt-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Example</span>
                      <p className="text-[13px] text-gray-600 mt-1">AI digital marketing combines artificial intelligence technologies with digital marketing strategies to automate tasks, analyze customer behavior, and deliver...</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Autodetect Video</label>
                  </div>
                  <div className="col-span-8">
                    <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
                        <input type="checkbox" checked={settings.seo_page_autodetect_video === 'true'} onChange={() => toggleBoolean('seo_page_autodetect_video')} className="sr-only peer" />
                        <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
                    </label>
                    <p className="text-[13px] text-gray-500">Populate automatic Video Schema by auto-detecting any video in the content.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Page Robots Meta</label>
                  </div>
                  <div className="col-span-8">
                    <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
                        <input type="checkbox" checked={settings.seo_page_robots !== 'default'} onChange={() => handleChange('seo_page_robots', settings.seo_page_robots === 'default' ? 'Index' : 'default')} className="sr-only peer" />
                        <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
                    </label>
                    <p className="text-[13px] text-gray-500 mb-4">Select custom robots meta, such as <code className="bg-gray-100 px-1 py-0.5 rounded">noarchive</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">nosnippet</code>, etc. for single Page pages. Otherwise the default meta will be used, as set in the Global Meta tab.</p>
                    
                    {settings.seo_page_robots !== 'default' && (
                      <div className="grid grid-cols-2 gap-4">
                        {['Index', 'No Index', 'No Follow', 'No Archive', 'No Image Index', 'No Snippet'].map(robot => {
                          const currentRobots = settings.seo_page_robots ? settings.seo_page_robots.split(',') : [];
                          return (
                            <label key={robot} className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={currentRobots.includes(robot)}
                                onChange={(e) => {
                                  let newRobots = [...currentRobots];
                                  if (e.target.checked) {
                                    if (robot === 'Index') newRobots = newRobots.filter(r => r !== 'No Index');
                                    if (robot === 'No Index') newRobots = newRobots.filter(r => r !== 'Index');
                                    newRobots.push(robot);
                                  } else {
                                    newRobots = newRobots.filter(r => r !== robot);
                                  }
                                  newRobots = Array.from(new Set(newRobots));
                                  handleChange('seo_page_robots', newRobots.join(','));
                                }}
                                className="w-4 h-4 text-[#0085ba] rounded border-gray-300 focus:ring-[#0085ba]" 
                              />
                              <span className="text-[13px] text-gray-700 flex items-center gap-1">{robot} <span className="inline-flex items-center justify-center w-3 h-3 bg-gray-200 text-gray-500 rounded-full text-[9px] font-bold font-serif italic">i</span></span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[12px] text-gray-500 mt-3">Custom values for robots meta tag on Page.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Page Advanced Robots Meta</label>
                  </div>
                  <div className="col-span-8">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-[13px] text-gray-700 block mb-2 flex items-center gap-2">
                          <input type="checkbox" checked={true} readOnly className="rounded border-gray-300 text-[#0085ba]" /> Snippet <span className="inline-flex items-center justify-center w-3 h-3 bg-gray-200 text-gray-500 rounded-full text-[9px] font-bold font-serif italic">i</span>
                        </span>
                        <input type="text" placeholder="-1" className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] outline-none" />
                      </div>
                      <div>
                        <span className="text-[13px] text-gray-700 block mb-2 flex items-center gap-2">
                          <input type="checkbox" checked={true} readOnly className="rounded border-gray-300 text-[#0085ba]" /> Video Preview <span className="inline-flex items-center justify-center w-3 h-3 bg-gray-200 text-gray-500 rounded-full text-[9px] font-bold font-serif italic">i</span>
                        </span>
                        <input type="text" placeholder="-1" className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] outline-none" />
                      </div>
                      <div>
                        <span className="text-[13px] text-gray-700 block mb-2 flex items-center gap-2">
                          <input type="checkbox" checked={true} readOnly className="rounded border-gray-300 text-[#0085ba]" /> Image Preview <span className="inline-flex items-center justify-center w-3 h-3 bg-gray-200 text-gray-500 rounded-full text-[9px] font-bold font-serif italic">i</span>
                        </span>
                        <select className="w-full border border-gray-300 rounded px-3 py-1.5 text-[14px] outline-none">
                          <option value="Large">Large</option>
                          <option value="Standard">Standard</option>
                          <option value="None">None</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Link Suggestions</label>
                  </div>
                  <div className="col-span-8">
                    <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
                        <input type="checkbox" checked={settings.seo_page_link_suggestions === 'true'} onChange={() => toggleBoolean('seo_page_link_suggestions')} className="sr-only peer" />
                        <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
                    </label>
                    <p className="text-[13px] text-gray-500">Enable Link Suggestions meta box for this post type, along with the Pillar Content feature.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Link Suggestion Titles</label>
                  </div>
                  <div className="col-span-8">
                    <div className="flex border border-gray-300 rounded w-max overflow-hidden mb-2">
                      {['Titles', 'Focus Keywords'].map(opt => {
                        const isActive = (settings.seo_page_link_suggestion_titles || 'Titles') === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleChange('seo_page_link_suggestion_titles', opt)}
                            className={`px-4 py-1.5 text-[13px] font-medium transition-colors border-r border-gray-300 last:border-0 ${isActive ? 'bg-[#0085ba] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[13px] text-gray-500">Use the Focus Keyword as the default text for the links instead of the post titles.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Slack Enhanced Sharing</label>
                  </div>
                  <div className="col-span-8">
                    <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
                        <input type="checkbox" checked={settings.seo_page_slack_enhanced === 'true'} onChange={() => toggleBoolean('seo_page_slack_enhanced')} className="sr-only peer" />
                        <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
                    </label>
                    <p className="text-[13px] text-gray-500">When the option is enabled and a page is shared on Slack, additional information will be shown (estimated time to read).</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Add SEO Controls</label>
                  </div>
                  <div className="col-span-8">
                    <label className="relative inline-block w-[42px] h-[22px] align-middle select-none transition duration-200 ease-in cursor-pointer mb-2">
                        <input type="checkbox" checked={settings.seo_page_add_seo_controls === 'true'} onChange={() => toggleBoolean('seo_page_add_seo_controls')} className="sr-only peer" />
                        <div className="w-full h-full bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-[#0085ba]"></div>
                    </label>
                    <p className="text-[13px] text-gray-500">Add SEO controls for the editor screen to customize SEO options for posts in this post type.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Bulk Editing</label>
                  </div>
                  <div className="col-span-8">
                    <div className="flex border border-gray-300 rounded w-max overflow-hidden mb-2">
                      {['Disabled', 'Enabled', 'Read Only'].map(opt => {
                        const isActive = (settings.seo_page_bulk_editing || 'Disabled') === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleChange('seo_page_bulk_editing', opt)}
                            className={`px-4 py-1.5 text-[13px] font-medium transition-colors border-r border-gray-300 last:border-0 ${isActive ? 'bg-[#0085ba] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[13px] text-gray-500">Add bulk editing columns to the post listing screen.</p>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 py-6 px-6 border-b border-gray-100 last:border-0">
                  <div className="col-span-4">
                    <label className="text-[14px] font-bold text-gray-700">Custom Fields</label>
                  </div>
                  <div className="col-span-8">
                    <textarea
                      value={settings.seo_page_custom_fields || ''}
                      onChange={(e) => handleChange('seo_page_custom_fields', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[14px] min-h-[100px] outline-none"
                    />
                    <p className="text-[12px] text-gray-500 mt-2">List of custom fields name to include in the Page analysis. Add one per line.</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'portfolios' && (
            <div className="p-8 flex items-center justify-center">
              <div className="w-full max-w-3xl border border-dashed border-gray-300 rounded-md py-12 px-6 text-center bg-gray-50/50">
                <h3 className="text-[#1d2327] text-lg font-medium mb-3">Portfolios Settings</h3>
                <p className="text-gray-500 text-[14px]">These settings are not yet implemented in this demo.</p>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="p-8 flex items-center justify-center">
              <div className="w-full max-w-3xl border border-dashed border-gray-300 rounded-md py-12 px-6 text-center bg-gray-50/50">
                <h3 className="text-[#1d2327] text-lg font-medium mb-3">Attachments Settings</h3>
                <p className="text-gray-500 text-[14px]">These settings are not yet implemented in this demo.</p>
              </div>
            </div>
          )}
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

    <MediaModal
      isOpen={isMediaModalOpen}
      onClose={() => setIsMediaModalOpen(false)}
      onInsert={handleMediaSelect}
    />
  </div>
);
}

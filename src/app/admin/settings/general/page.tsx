'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Upload, Loader2, Image as ImageIcon, Plus, Trash2, FileImage } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import MediaModal from '@/components/MediaModal';
import { BASE_PATH } from '@/lib/config';

interface SocialIcon {
  id: string;
  iconUrl: string;
  link: string;
}

export default function GeneralSettings() {
  const [settings, setSettings] = useState({
    site_title: '',
    site_tagline: '',
    site_icon: '',
    site_logo: '',
    footer_logo: '',
    copyright_text: '',
    enable_physical_products: 'false',
  });
  const [socialIcons, setSocialIcons] = useState<SocialIcon[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFooter, setIsUploadingFooter] = useState(false);
  
  const [modalTarget, setModalTarget] = useState<'site_icon' | 'site_logo' | 'footer_logo' | 'social_icon' | null>(null);
  const [activeSocialId, setActiveSocialId] = useState<string | null>(null);
useEffect(() => {
  const loadSettings = async () => {
    try {
      const res = await fetch(
        `${BASE_PATH}/api/settings?_=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await res.json();

      setSettings({
        site_title: data.site_title || '',
        site_tagline: data.site_tagline || '',
        site_icon: data.site_icon || '',
        site_logo: data.site_logo || '',
        footer_logo: data.footer_logo || '',
        copyright_text: data.copyright_text || '',
        enable_physical_products: data.enable_physical_products || 'false',
      });

      if (data.social_icons) {
        try {
          setSocialIcons(JSON.parse(data.social_icons));
        } catch (error) {
          console.error('Failed to parse social icons:', error);
          setSocialIcons([]);
        }
      } else {
        setSocialIcons([]);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  loadSettings();
}, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleMediaInsert = (url: string) => {
    if (modalTarget === 'site_icon') setSettings(prev => ({ ...prev, site_icon: url }));
    else if (modalTarget === 'site_logo') setSettings(prev => ({ ...prev, site_logo: url }));
    else if (modalTarget === 'footer_logo') setSettings(prev => ({ ...prev, footer_logo: url }));
    else if (modalTarget === 'social_icon' && activeSocialId) {
      setSocialIcons(prev => prev.map(icon => icon.id === activeSocialId ? { ...icon, iconUrl: url } : icon));
    }
  };

  const addSocialIcon = () => {
    setSocialIcons(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), iconUrl: '', link: '' }]);
  };

  const updateSocialIcon = (id: string, field: 'link', value: string) => {
    setSocialIcons(prev => prev.map(icon => icon.id === id ? { ...icon, [field]: value } : icon));
  };

  const removeSocialIcon = (id: string) => {
    setSocialIcons(prev => prev.filter(icon => icon.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const payload = {
      ...settings,
      social_icons: JSON.stringify(socialIcons)
    };
    
    try {
      const res = await fetch(`${BASE_PATH}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    <div className="relative">
      <MediaModal 
        isOpen={modalTarget !== null}
        onClose={() => { setModalTarget(null); setActiveSocialId(null); }}
        onInsert={handleMediaInsert}
      />
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-10">
      
      {/* SECTION 1: Basic Details */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-100 pb-4 flex items-center gap-2">
          <span className="text-xl">📝</span> Basic Details
        </h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Title</label>
          <input
            type="text"
            name="site_title"
            value={settings.site_title}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#5e3fde] outline-none max-w-2xl"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
          <input
            type="text"
            name="site_tagline"
            value={settings.site_tagline}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#5e3fde] outline-none max-w-2xl"
          />
          <p className="mt-1 text-sm text-gray-500">In a few words, explain what this site is about.</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Text</label>
          <textarea
            name="copyright_text"
            value={settings.copyright_text}
            onChange={handleChange as any}
            placeholder="e.g. © %year% Your Company Name | All rights reserved. | Website by Velocity Consultancy"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#5e3fde] outline-none max-w-2xl resize-y"
          />
          <p className="mt-1 text-sm text-gray-500">Use <strong>%year%</strong> to automatically display the current year. HTML is allowed for adding links.</p>
        </div>
      </section>

      {/* SECTION 2: Branding & Assets */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-8">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-100 pb-4 flex items-center gap-2">
          <span className="text-xl">🎨</span> Branding & Assets
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Site Icon</label>
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden relative group">
              {settings.site_icon ? (
                <img src={settings.site_icon} alt="Site Icon" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="text-gray-300" size={48} />
              )}
              {isUploadingIcon && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="animate-spin text-blue-600" />
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setModalTarget('site_icon')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                <FileImage size={16} /> Choose a Site Icon
              </button>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">
                The Site Icon is what you see in browser tabs, bookmark bars, and within mobile apps. It should be square.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Site Logo (Header)</label>
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center justify-center w-64 h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden relative group">
              {settings.site_logo ? (
                <img src={settings.site_logo} alt="Site Logo" className="w-full h-full object-contain p-4" />
              ) : (
                <ImageIcon className="text-gray-300" size={48} />
              )}
              {isUploadingLogo && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="animate-spin text-blue-600" />
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setModalTarget('site_logo')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                <FileImage size={16} /> Choose a Header Logo
              </button>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">
                The main logo displayed at the top of your public website.
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-6 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Footer Logo</label>
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center justify-center w-64 h-32 border-2 border-dashed border-gray-300 rounded-lg bg-slate-800 overflow-hidden relative group">
              {settings.footer_logo ? (
                <img src={settings.footer_logo} alt="Footer Logo" className="w-full h-full object-contain p-4" />
              ) : (
                <ImageIcon className="text-gray-500" size={48} />
              )}
              {isUploadingFooter && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" />
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setModalTarget('footer_logo')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                <FileImage size={16} /> Choose a Footer Logo
              </button>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">
                The alternate logo displayed in the dark footer area. Usually a lighter/white version of your logo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Social Media Links */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-8">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-100 pb-4 flex items-center gap-2">
          <span className="text-xl">🔗</span> Social Media Links
        </h2>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Social Icons</label>
              <p className="text-sm text-gray-500 mt-1">Manage the social media links displayed in your footer.</p>
            </div>
            <button
              type="button"
              onClick={addSocialIcon}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <Plus size={16} /> Add Icon
            </button>
          </div>

          <div className="space-y-3">
            {socialIcons.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-sm">
                No social icons added yet. Click "Add Icon" to create one.
              </div>
            ) : (
              socialIcons.map((icon, index) => (
                <div key={icon.id} className="flex items-center gap-4 bg-gray-50 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <div 
                      onClick={() => {
                        setActiveSocialId(icon.id);
                        setModalTarget('social_icon');
                      }}
                      className="w-12 h-12 bg-white border border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden group relative"
                      title="Click to select icon from Media Library"
                    >
                      {icon.iconUrl ? (
                        <img src={icon.iconUrl} alt="Social Icon" className="w-6 h-6 object-contain" />
                      ) : (
                        <ImageIcon size={20} className="text-gray-400 group-hover:text-blue-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="https://facebook.com/yourpage"
                      value={icon.link}
                      onChange={(e) => updateSocialIcon(icon.id, 'link', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeSocialIcon(icon.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: Features & Capabilities */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-100 pb-4 flex items-center gap-2">
          <span className="text-xl">⚙️</span> Features & Capabilities
        </h2>
        
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative flex items-start pt-0.5">
              <input
                type="checkbox"
                checked={settings.enable_physical_products === 'true'}
                onChange={(e) => setSettings(prev => ({ ...prev, enable_physical_products: e.target.checked ? 'true' : 'false' }))}
                className="w-4 h-4 text-[#5e3fde] rounded border-gray-300 focus:ring-[#5e3fde]"
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-900">Enable Physical Products</span>
              <p className="mt-1 text-sm text-gray-500">
                Turn this on if you want to sell physical merchandise alongside your courses. It will show the "Products" tab in the admin sidebar.
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* Sticky Save Button */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur border-t border-gray-200 p-4 -mx-8 px-8 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-2.5 bg-[#5e3fde] text-white rounded font-medium hover:bg-[#4b32b2] disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>
    </form>
    </div>
  );
}

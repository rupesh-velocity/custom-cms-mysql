'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

export default function AdvancedSettings() {
  const [settings, setSettings] = useState({
    custom_css: '',
    custom_js: '',
    head_scripts: '',
    body_scripts: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/settings`)
      .then(res => res.json())
      .then(data => {
        setSettings({
          custom_css: data.custom_css || '',
          custom_js: data.custom_js || '',
          head_scripts: data.head_scripts || '',
          body_scripts: data.body_scripts || '',
        });
        setIsLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1">Custom CSS</label>
        <p className="text-sm text-gray-500 mb-3">Add your own CSS code here to customize the appearance and layout of your site.</p>
        <textarea
          name="custom_css"
          value={settings.custom_css}
          onChange={handleChange}
          rows={6}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
          placeholder="body { background-color: #f3f4f6; }"
          spellCheck={false}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1">Custom JS (Footer)</label>
        <p className="text-sm text-gray-500 mb-3">Add your own pure Javascript code here (without &lt;script&gt; tags). It will safely execute at the bottom of the page without invisible wrapper elements.</p>
        <textarea
          name="custom_js"
          value={settings.custom_js}
          onChange={handleChange}
          rows={6}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
          placeholder="document.addEventListener('click', function(e) { ... });"
          spellCheck={false}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1">Header Scripts</label>
        <p className="text-sm text-gray-500 mb-3">Scripts placed here will be output in the <code>&lt;head&gt;</code> section of every page (e.g., Google Analytics, Facebook Pixel).</p>
        <textarea
          name="head_scripts"
          value={settings.head_scripts}
          onChange={handleChange}
          rows={6}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
          placeholder="<!-- Global site tag (gtag.js) - Google Analytics -->"
          spellCheck={false}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1">Body Scripts</label>
        <p className="text-sm text-gray-500 mb-3">Scripts placed here will be output right before the closing <code>&lt;/body&gt;</code> tag.</p>
        <textarea
          name="body_scripts"
          value={settings.body_scripts}
          onChange={handleChange}
          rows={6}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
          placeholder="<script>console.log('Hello from body!');</script>"
          spellCheck={false}
        />
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

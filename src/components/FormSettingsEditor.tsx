'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

export default function FormSettingsEditor({ form }: { form: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(form.status || 'Published');
  const [notificationEmail, setNotificationEmail] = useState(form.notificationEmail || '');
  const [settings, setSettings] = useState<any>(
    form.settings ? (typeof form.settings === 'string' ? JSON.parse(form.settings) : form.settings) : {
      submitText: 'Submit Form',
      successAction: 'message',
      successMessage: 'Your submission has been received successfully.',
      redirectUrl: '',
      enableHoneypot: true,
      enableRecaptchaV3: false,
      recaptchaSiteKey: '',
      recaptchaSecretKey: '', hideTitle: false
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Preserve existing fields
      const payload: any = { 
        status, 
        notificationEmail, 
        settings,
        fields: typeof form.fields === 'string' ? JSON.parse(form.fields || '[]') : form.fields,
        title: form.title
      };
      
      // Inject the ID so the server knows it's an update, and hit the allowed root endpoint
      payload.id = form.id;
      const res = await fetch(`${BASE_PATH}/api/forms`, {
        method: 'POST', // Changed from PUT to POST to bypass host restrictions
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      
      toast.success('Settings saved');
      router.refresh();
    } catch (error) {
      toast.error('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm max-w-3xl">
      <div className="flex justify-between items-center border-b border-gray-100 pb-5 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4b32b2] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde]"
            >
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Draft forms will not accept submissions.</p>
          </div>
          <div>
            <label className="flex items-start gap-3 cursor-pointer mt-6">
              <input 
                type="checkbox" 
                checked={settings.hideTitle || false}
                onChange={e => setSettings({...settings, hideTitle: e.target.checked})}
                className="rounded text-[#5e3fde] focus:ring-[#5e3fde] mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 block">Hide Form Title</span>
                <p className="text-xs text-gray-500">Do not display the form title on the frontend.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Spam Protection</h3>
          
          <div className="space-y-4 max-w-xl">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.enableHoneypot}
                onChange={e => setSettings({...settings, enableHoneypot: e.target.checked})}
                className="rounded text-[#5e3fde] focus:ring-[#5e3fde] mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 block">Honeypot (Invisible Trap)</span>
                <p className="text-xs text-gray-500">Injects a hidden field. If filled by a bot, submission is silently rejected.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer mt-4">
              <input 
                type="checkbox" 
                checked={settings.enableRecaptchaV3}
                onChange={e => setSettings({...settings, enableRecaptchaV3: e.target.checked})}
                className="rounded text-[#5e3fde] focus:ring-[#5e3fde] mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 block">Google reCAPTCHA v3</span>
                <p className="text-xs text-gray-500">Invisible score-based bot protection. Requires backend verification.</p>
              </div>
            </label>
            
            {settings.enableRecaptchaV3 && (
              <div className="mt-3 ml-7 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Site Key</label>
                  <input 
                    type="text" 
                    value={settings.recaptchaSiteKey || ''}
                    onChange={e => setSettings({...settings, recaptchaSiteKey: e.target.value})}
                    placeholder="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-[#5e3fde]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Secret Key</label>
                  <input 
                    type="password" 
                    value={settings.recaptchaSecretKey || ''}
                    onChange={e => setSettings({...settings, recaptchaSecretKey: e.target.value})}
                    placeholder="••••••••••••••••••••••••••••••••••••••••"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded text-sm outline-none focus:ring-1 focus:ring-[#5e3fde]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 max-w-xl">
          <label className="block text-sm font-medium text-gray-700 mb-1">Form Shortcode</label>
          <code className="block bg-gray-50 text-[#5e3fde] px-4 py-3 rounded-lg text-sm font-mono border border-gray-200 break-all select-all">
            {form.shortcode}
          </code>
          <p className="text-xs text-gray-500 mt-2">Use this shortcode to embed the form into any page or post.</p>
        </div>

      </div>
    </div>
  );
}

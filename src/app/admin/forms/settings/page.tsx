'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Download,
  FileJson,
  Save,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

type SpamSettings = {
  forms_honeypot_enabled: string;
  forms_recaptcha_v3_enabled: string;
  forms_recaptcha_site_key: string;
  forms_recaptcha_secret_key: string;
  forms_recaptcha_score_threshold: string;
};

const defaults: SpamSettings = {
  forms_honeypot_enabled: 'true',
  forms_recaptcha_v3_enabled: 'false',
  forms_recaptcha_site_key: '',
  forms_recaptcha_secret_key: '',
  forms_recaptcha_score_threshold: '0.5',
};

function Toggle({ checked, onChange, label, description }: { checked:boolean; onChange:(value:boolean)=>void; label:string; description:string }) {
  return (
    <label className="flex items-start justify-between gap-5 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900">{label}</span>
        <span className="block text-xs text-gray-500 mt-1 leading-5">{description}</span>
      </span>
      <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${checked ? 'bg-[#5e3fde]' : 'bg-gray-300'}`}>
        <input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} className="sr-only" />
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </label>
  );
}

export default function FormsSettingsPage() {
  const [settings, setSettings] = useState<SpamSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'spam' | 'transfer'>('spam');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/settings`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then((data) => {
        setSettings({
          forms_honeypot_enabled: data.forms_honeypot_enabled ?? defaults.forms_honeypot_enabled,
          forms_recaptcha_v3_enabled: data.forms_recaptcha_v3_enabled ?? defaults.forms_recaptcha_v3_enabled,
          forms_recaptcha_site_key: data.forms_recaptcha_site_key ?? '',
          forms_recaptcha_secret_key: data.forms_recaptcha_secret_key ?? '',
          forms_recaptcha_score_threshold: data.forms_recaptcha_score_threshold ?? defaults.forms_recaptcha_score_threshold,
        });
      })
      .catch((error) => {
        console.error(error);
        toast.error('Could not load form settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const score = Number(settings.forms_recaptcha_score_threshold);
      if (!Number.isFinite(score) || score < 0 || score > 1) {
        toast.error('reCAPTCHA score threshold must be between 0 and 1');
        return;
      }
      const res = await fetch(`${BASE_PATH}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Forms settings saved');
    } catch (error) {
      console.error(error);
      toast.error('Could not save form settings');
    } finally {
      setSaving(false);
    }
  };

  const importForms = async (file?: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!Array.isArray(payload?.data?.forms)) throw new Error('This file does not contain exported forms.');
      const res = await fetch(`${BASE_PATH}/api/forms/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      toast.success(`Imported ${data?.result?.forms ?? payload.data.forms.length} form(s)`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not import forms');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) return <div className="py-16 text-center text-sm text-gray-500">Loading settings...</div>;

  const honeypotEnabled = settings.forms_honeypot_enabled === 'true';
  const recaptchaEnabled = settings.forms_recaptcha_v3_enabled === 'true';
  const recaptchaConfigured = Boolean(settings.forms_recaptcha_site_key && settings.forms_recaptcha_secret_key);

  return (
    <div className="max-w-[1040px] space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forms Settings</h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-2xl">Manage global form protection and move form definitions between CMS installations.</p>
        </div>
        {activeTab === 'spam' && (
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4b32b2] disabled:opacity-50 shadow-sm">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 pt-4 border-b border-gray-100 flex gap-1 overflow-x-auto">
          <button type="button" onClick={()=>setActiveTab('spam')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab==='spam'?'border-[#5e3fde] text-[#5e3fde]':'border-transparent text-gray-500 hover:text-gray-900'}`}>Spam Protection</button>
          <button type="button" onClick={()=>setActiveTab('transfer')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab==='transfer'?'border-[#5e3fde] text-[#5e3fde]':'border-transparent text-gray-500 hover:text-gray-900'}`}>Import / Export</button>
        </div>

        {activeTab === 'spam' ? (
          <div className="p-6 space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
                <p className="text-xs font-medium text-gray-500">Global Protection</p>
                <div className="flex items-center gap-2 mt-2"><ShieldCheck size={18} className="text-[#5e3fde]"/><span className="text-sm font-semibold text-gray-900">All published forms</span></div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
                <p className="text-xs font-medium text-gray-500">Honeypot</p>
                <div className="flex items-center gap-2 mt-2">{honeypotEnabled ? <CheckCircle2 size={18} className="text-green-600"/> : <AlertCircle size={18} className="text-gray-400"/>}<span className="text-sm font-semibold text-gray-900">{honeypotEnabled ? 'Enabled' : 'Disabled'}</span></div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
                <p className="text-xs font-medium text-gray-500">reCAPTCHA v3</p>
                <div className="flex items-center gap-2 mt-2">{recaptchaEnabled && recaptchaConfigured ? <CheckCircle2 size={18} className="text-green-600"/> : <Bot size={18} className={recaptchaEnabled ? 'text-amber-500' : 'text-gray-400'}/>}<span className="text-sm font-semibold text-gray-900">{recaptchaEnabled ? (recaptchaConfigured ? 'Configured' : 'Needs keys') : 'Disabled'}</span></div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              <div className="p-5"><Toggle checked={honeypotEnabled} onChange={(v)=>setSettings(prev=>({...prev,forms_honeypot_enabled:v?'true':'false'}))} label="Honeypot protection" description="Adds an invisible trap field to every CMS form. Automated submissions that fill it are rejected." /></div>
              <div className="p-5">
                <Toggle checked={recaptchaEnabled} onChange={(v)=>setSettings(prev=>({...prev,forms_recaptcha_v3_enabled:v?'true':'false'}))} label="Google reCAPTCHA v3" description="Runs invisible score-based verification globally on every published CMS form." />
                {recaptchaEnabled && (
                  <div className="mt-5 bg-gray-50 border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-sm font-medium text-gray-800 mb-1.5">Site Key</label><input type="text" value={settings.forms_recaptcha_site_key} onChange={(e)=>setSettings(prev=>({...prev,forms_recaptcha_site_key:e.target.value}))} className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#5e3fde]/15 focus:border-[#5e3fde]" placeholder="Enter reCAPTCHA v3 site key" /><p className="text-xs text-gray-500 mt-1.5">Public browser key from Google reCAPTCHA.</p></div>
                    <div><label className="block text-sm font-medium text-gray-800 mb-1.5">Secret Key</label><input type="password" value={settings.forms_recaptcha_secret_key} onChange={(e)=>setSettings(prev=>({...prev,forms_recaptcha_secret_key:e.target.value}))} className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#5e3fde]/15 focus:border-[#5e3fde]" placeholder="Enter reCAPTCHA v3 secret key" /><p className="text-xs text-gray-500 mt-1.5">Used only on the server for verification.</p></div>
                    <div><label className="block text-sm font-medium text-gray-800 mb-1.5">Score Threshold</label><div className="flex items-center gap-3"><input type="range" min="0" max="1" step="0.1" value={settings.forms_recaptcha_score_threshold} onChange={(e)=>setSettings(prev=>({...prev,forms_recaptcha_score_threshold:e.target.value}))} className="flex-1 accent-[#5e3fde]"/><input type="number" min="0" max="1" step="0.1" value={settings.forms_recaptcha_score_threshold} onChange={(e)=>setSettings(prev=>({...prev,forms_recaptcha_score_threshold:e.target.value}))} className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-[#5e3fde]"/></div><p className="text-xs text-gray-500 mt-1.5">0.5 is a practical default. Raise it only if spam remains a problem.</p></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/40">
                <div className="w-10 h-10 rounded-lg bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center mb-4"><Download size={19}/></div>
                <h2 className="text-base font-semibold text-gray-900">Export Forms</h2>
                <p className="text-sm text-gray-500 mt-1.5 leading-6">Download form definitions and notification settings as a portable JSON file. Form submissions are not included.</p>
                <a href={`${BASE_PATH}/api/forms/transfer`} className="mt-5 inline-flex items-center gap-2 bg-[#5e3fde] !text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4b32b2]"><Download size={15}/> Export Forms</a>
              </div>
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/40">
                <div className="w-10 h-10 rounded-lg bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center mb-4"><Upload size={19}/></div>
                <h2 className="text-base font-semibold text-gray-900">Import Forms</h2>
                <p className="text-sm text-gray-500 mt-1.5 leading-6">Import a Forms export. Matching shortcodes are updated; new forms are created. Other CMS data in the file is ignored.</p>
                <button type="button" disabled={importing} onClick={()=>fileRef.current?.click()} className="mt-5 inline-flex items-center gap-2 border border-gray-300 bg-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:border-[#5e3fde] hover:text-[#5e3fde] disabled:opacity-50"><FileJson size={15}/>{importing?'Importing...':'Choose JSON File'}</button>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e)=>importForms(e.target.files?.[0])}/>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs leading-5 text-blue-900"><strong>Safe transfer:</strong> this screen only imports and exports form definitions. Entries/submissions stay in the current database.</div>
          </div>
        )}
      </div>
    </div>
  );
}

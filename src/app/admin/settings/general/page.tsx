'use client';

import { useEffect, useState } from 'react';
import { FileImage, Image as ImageIcon, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import MediaModal from '@/components/MediaModal';
import { BASE_PATH } from '@/lib/config';

interface SocialIcon { id: string; iconUrl: string; link: string; }

type GeneralSettingsState = {
  site_title: string;
  site_tagline: string;
  site_url: string;
  site_icon: string;
  site_logo: string;
  footer_logo: string;
  copyright_text: string;
};

const fieldClass = 'w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5e3fde] focus:ring-2 focus:ring-[#5e3fde]/10 transition';

function AssetPicker({ label, description, value, wide=false, dark=false, onChoose }:{label:string;description:string;value:string;wide?:boolean;dark?:boolean;onChoose:()=>void}) {
  return <div className="grid md:grid-cols-[180px_1fr] gap-5 items-start py-5 first:pt-0 last:pb-0">
    <div><h3 className="text-sm font-semibold text-gray-900">{label}</h3><p className="text-xs text-gray-500 leading-5 mt-1">{description}</p></div>
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className={`${wide?'w-56 h-24':'w-24 h-24'} ${dark?'bg-slate-800':'bg-gray-50'} border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0`}>
        {value ? <img src={value} alt={label} className="w-full h-full object-contain p-3"/> : <ImageIcon size={30} className={dark?'text-gray-500':'text-gray-300'}/>} 
      </div>
      <button type="button" onClick={onChoose} className="inline-flex items-center gap-2 border border-gray-300 bg-white rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-[#5e3fde] hover:text-[#5e3fde] transition-colors"><FileImage size={16}/> Choose from Media</button>
    </div>
  </div>;
}

export default function GeneralSettings() {
  const [settings, setSettings] = useState<GeneralSettingsState>({ site_title:'', site_tagline:'', site_url:'', site_icon:'', site_logo:'', footer_logo:'', copyright_text:'' });
  const [socialIcons, setSocialIcons] = useState<SocialIcon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalTarget, setModalTarget] = useState<'site_icon'|'site_logo'|'footer_logo'|'social_icon'|null>(null);
  const [activeSocialId, setActiveSocialId] = useState<string|null>(null);

  useEffect(()=>{
    fetch(`${BASE_PATH}/api/settings?_=${Date.now()}`, { cache:'no-store', headers:{'Cache-Control':'no-cache, no-store, must-revalidate'} })
      .then(async r=>{if(!r.ok) throw new Error('Failed to load settings'); return r.json();})
      .then(data=>{
        setSettings({
          site_title:data.site_title||'', site_tagline:data.site_tagline||'', site_url:data.site_url||window.location.origin, site_icon:data.site_icon||'',
          site_logo:data.site_logo||'', footer_logo:data.footer_logo||'', copyright_text:data.copyright_text||''
        });
        try { setSocialIcons(data.social_icons ? JSON.parse(data.social_icons) : []); } catch { setSocialIcons([]); }
      })
      .catch(()=>toast.error('Failed to load settings'))
      .finally(()=>setIsLoading(false));
  },[]);

  const handleMediaInsert=(url:string)=>{
    if(modalTarget==='site_icon') setSettings(x=>({...x,site_icon:url}));
    if(modalTarget==='site_logo') setSettings(x=>({...x,site_logo:url}));
    if(modalTarget==='footer_logo') setSettings(x=>({...x,footer_logo:url}));
    if(modalTarget==='social_icon' && activeSocialId) setSocialIcons(x=>x.map(i=>i.id===activeSocialId?{...i,iconUrl:url}:i));
  };

  const save=async(e:React.FormEvent)=>{
    e.preventDefault(); setIsSaving(true);
    try{
      const normalizedSiteUrl = settings.site_url.trim().replace(/\/$/, '');
      if (normalizedSiteUrl) {
        const parsed = new URL(normalizedSiteUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid Site URL');
      }
      const payload = { ...settings, site_url: normalizedSiteUrl, social_icons: JSON.stringify(socialIcons) };
      const res=await fetch(`${BASE_PATH}/api/settings`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!res.ok) throw new Error();
      setSettings(x => ({ ...x, site_url: normalizedSiteUrl }));
      toast.success('General settings saved');
    }catch{toast.error('Please enter a valid Site URL, including http:// or https://');}finally{setIsSaving(false);}
  };

  if(isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400"/></div>;

  return <div className="max-w-[1040px] space-y-6">
    <MediaModal isOpen={modalTarget!==null} onClose={()=>{setModalTarget(null);setActiveSocialId(null);}} onInsert={handleMediaInsert}/>
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div><h2 className="text-xl font-semibold text-gray-900">General</h2><p className="text-sm text-gray-500 mt-1.5">Manage the site identity, logos, footer details and social links used across the website.</p></div>
      <button type="button" onClick={(e)=>save(e as any)} disabled={isSaving} className="inline-flex items-center gap-2 bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4b32b2] disabled:opacity-50"><Save size={16}/>{isSaving?'Saving...':'Save Changes'}</button>
    </div>

    <form onSubmit={save} className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-900">Site Identity</h2><p className="text-xs text-gray-500 mt-1">Basic information used in the admin area, metadata and public templates.</p></div>
        <div className="p-6 grid md:grid-cols-2 gap-5">
          <div><label className="block text-sm font-semibold text-gray-900 mb-1.5">Site Title</label><input className={fieldClass} value={settings.site_title} onChange={e=>setSettings(x=>({...x,site_title:e.target.value}))}/><p className="text-xs text-gray-500 mt-1.5">The primary website/business name.</p></div>
          <div><label className="block text-sm font-semibold text-gray-900 mb-1.5">Tagline</label><input className={fieldClass} value={settings.site_tagline} onChange={e=>setSettings(x=>({...x,site_tagline:e.target.value}))}/><p className="text-xs text-gray-500 mt-1.5">A short description of the website.</p></div>
          <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-900 mb-1.5">Site URL</label><input type="url" className={fieldClass} value={settings.site_url} onChange={e=>setSettings(x=>({...x,site_url:e.target.value}))} placeholder="https://example.com"/><p className="text-xs text-gray-500 mt-1.5">The public website address used for previews, share links, canonical URLs and SEO output. Use your local URL while testing, then change it to the live domain before deployment.</p></div>
          <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-900 mb-1.5">Copyright Text</label><textarea rows={3} className={`${fieldClass} resize-y`} value={settings.copyright_text} onChange={e=>setSettings(x=>({...x,copyright_text:e.target.value}))} placeholder="© %year% Your Company Name | All rights reserved."/><p className="text-xs text-gray-500 mt-1.5">Use <strong>%year%</strong> for the current year. HTML links are supported.</p></div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-900">Branding</h2><p className="text-xs text-gray-500 mt-1">Use the existing Site Icon as the browser favicon; separate 32×32 and Apple icon fields are no longer required.</p></div>
        <div className="p-6 divide-y divide-gray-100">
          <AssetPicker label="Site Icon" description="Square icon used for browser tabs, bookmarks and general site identity." value={settings.site_icon} onChoose={()=>setModalTarget('site_icon')}/>
          <AssetPicker label="Header Logo" description="Main logo displayed by public header templates." value={settings.site_logo} wide onChoose={()=>setModalTarget('site_logo')}/>
          <AssetPicker label="Footer Logo" description="Alternate logo used by footer templates, often a light version." value={settings.footer_logo} wide dark onChoose={()=>setModalTarget('footer_logo')}/>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4"><div><h2 className="text-base font-semibold text-gray-900">Social Links</h2><p className="text-xs text-gray-500 mt-1">Manage footer social icons and their destination URLs.</p></div><button type="button" onClick={()=>setSocialIcons(x=>[...x,{id:Math.random().toString(36).slice(2),iconUrl:'',link:''}])} className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-medium hover:border-[#5e3fde] hover:text-[#5e3fde]"><Plus size={15}/> Add Social Link</button></div>
        <div className="p-6">
          {socialIcons.length===0 ? <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center text-sm text-gray-500">No social links added yet.</div> : <div className="space-y-3">{socialIcons.map(icon=><div key={icon.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
            <button type="button" onClick={()=>{setActiveSocialId(icon.id);setModalTarget('social_icon');}} className="w-11 h-11 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden hover:border-[#5e3fde]">{icon.iconUrl?<img src={icon.iconUrl} alt="Social" className="w-6 h-6 object-contain"/>:<ImageIcon size={18} className="text-gray-400"/>}</button>
            <input className={fieldClass} value={icon.link} onChange={e=>setSocialIcons(x=>x.map(i=>i.id===icon.id?{...i,link:e.target.value}:i))} placeholder="https://example.com/profile"/>
            <button type="button" onClick={()=>setSocialIcons(x=>x.filter(i=>i.id!==icon.id))} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remove"><Trash2 size={18}/></button>
          </div>)}</div>}
        </div>
      </section>

      <div className="sticky bottom-3 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg px-4 py-3 flex justify-end"><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4b32b2] disabled:opacity-50"><Save size={16}/>{isSaving?'Saving...':'Save Changes'}</button></div>
    </form>
  </div>;
}

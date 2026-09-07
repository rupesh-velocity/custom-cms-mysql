'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, Plus, Save, Upload, RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';
import { fetchJsonWithRetry, fetchWithRetry } from '@/lib/client-api';
import ImageOptimizationSettings from './ImageOptimizationSettings';

function encodeCode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeCode(value: string) {
  if (!value) return '';
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function addonEntriesToMap(entries: any) {
  const out: Record<string, string> = {};
  if (!Array.isArray(entries)) return out;
  entries.forEach((entry) => {
    try {
      const key = decodeCode(String(entry?.k || ''));
      if (key) out[key] = decodeCode(String(entry?.v || ''));
    } catch {
      // Ignore malformed response entries; the caller will still have safe defaults.
    }
  });
  return out;
}

const codeSettingKeys = new Set(['analytics_head_code', 'analytics_body_code']);

const titles:Record<string,string>={
  'google-reviews':'Google Reviews',
  'backup-restore':'Backup & Restore',
  'maintenance':'Maintenance Mode',
  'analytics':'Analytics / Tracking',
  'cookie-consent':'Cookie Consent',
  'image-optimization':'Image Optimization',
  'popup-builder':'Popup Builder',
  'twilio':'Twilio OTP Login',
  'import-export':'CMS Import / Export',
  'smtp':'SMTP',
};

function Field({label,description,type='text',value,onChange,placeholder,rows=4}:{label:string,description?:string,type?:string,value:any,onChange:(v:any)=>void,placeholder?:string,rows?:number}) {
  return <div>
    <label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>
    {description && <p className="text-xs text-gray-500 mb-2 leading-5">{description}</p>}
    {type==='textarea' ? <textarea rows={rows} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde]"/> :
      <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde]"/>}
  </div>;
}
function Select({label,value,onChange,children,description}:{label:string,value:any,onChange:(v:string)=>void,children:React.ReactNode,description?:string}) {
  return <div><label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>{description&&<p className="text-xs text-gray-500 mb-2">{description}</p>}<select value={value||''} onChange={e=>onChange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde]">{children}</select></div>;
}
function Toggle({label,description,checked,onChange}:{label:string,description?:string,checked:boolean,onChange:(v:boolean)=>void}) {
  return <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="mt-1 w-4 h-4 text-[#5e3fde] rounded border-gray-300"/><span><span className="block text-sm font-medium text-gray-900">{label}</span>{description&&<span className="block text-xs text-gray-500 mt-1 leading-5">{description}</span>}</span></label>;
}
function Section({title,children}:{title:string,children:React.ReactNode}) {
  return <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5"><h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">{title}</h2>{children}</section>;
}


function TrackingCodeField({label,description,value,onChange,placeholder}:{label:string,description?:string,value:any,onChange:(v:string)=>void,placeholder?:string}) {
  return <div>
    <label className="block text-sm font-semibold text-gray-900 mb-1">{label}</label>
    {description&&<p className="text-xs text-gray-500 mb-2 leading-5">{description}</p>}
    <textarea
      rows={10}
      spellCheck={false}
      value={value||''}
      onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-[13px] leading-6 font-mono bg-[#0f172a] text-gray-100 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#5e3fde]/25 focus:border-[#5e3fde] resize-y"
    />
  </div>;
}

function PopupManager() {
  const [items,setItems]=useState<any[]>([]);
  const [editing,setEditing]=useState<any|null>(null);
  const [busy,setBusy]=useState(false);
  const [filter,setFilter]=useState('all');
  const [page,setPage]=useState(1);
  const pageSize=10;
  const load=()=>fetch(`${BASE_PATH}/api/popups`,{cache:'no-store'}).then(r=>r.json()).then(setItems);
  useEffect(()=>{load();},[]);
  useEffect(()=>{setPage(1);},[filter]);

  const newPopup=async()=>{
    const res=await fetch(`${BASE_PATH}/api/popups`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'New Popup'})});
    const item=await res.json(); if(res.ok){setEditing({...item,pageRules:[]});load();} else toast.error(item.error||'Could not create popup');
  };
  const edit=(p:any)=>{let rules=[];try{rules=JSON.parse(p.pageRules||'[]')}catch{} setEditing({...p,pageRules:rules,startAt:p.startAt?String(p.startAt).slice(0,16):'',endAt:p.endAt?String(p.endAt).slice(0,16):''});};
  const save=async()=>{
    if(!editing)return;setBusy(true);
    const res=await fetch(`${BASE_PATH}/api/popups/${editing.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(editing)});
    const data=await res.json();setBusy(false);
    if(res.ok){toast.success('Popup saved');setEditing(null);load();}else toast.error(data.error||'Save failed');
  };
  const action=async(p:any,kind:string)=>{
    if(kind==='delete'){if(!confirm('Permanently delete this popup?'))return;await fetch(`${BASE_PATH}/api/popups/${p.id}`,{method:'DELETE'});toast.success('Popup deleted');load();return;}
    if(kind==='duplicate'){const res=await fetch(`${BASE_PATH}/api/popups`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,title:`${p.title} Copy`,slug:''})});if(res.ok)toast.success('Popup duplicated');load();return;}
    const status=kind==='publish'?'Published':kind==='trash'?'Trash':'Draft';
    await fetch(`${BASE_PATH}/api/popups/${p.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});toast.success(`Popup ${status.toLowerCase()}`);load();
  };

  const filtered=filter==='all'?items:items.filter(p=>String(p.status).toLowerCase()===filter);
  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const visible=filtered.slice((page-1)*pageSize,page*pageSize);

  if(editing) return <Section title={`Edit Popup — ${editing.title}`}>
    <div className="grid md:grid-cols-2 gap-5">
      <Field label="Title" value={editing.title} onChange={v=>setEditing({...editing,title:v})}/>
      <Field label="Slug" value={editing.slug} onChange={v=>setEditing({...editing,slug:v})}/>
      <Select label="Status" value={editing.status} onChange={v=>setEditing({...editing,status:v})}><option>Draft</option><option>Published</option><option>Trash</option></Select>
      <Select label="Trigger" value={editing.triggerType} onChange={v=>setEditing({...editing,triggerType:v})}><option value="delay">Delay</option><option value="exit">Exit intent</option><option value="scroll">Scroll percentage</option></Select>
      {editing.triggerType==='delay'&&<Field label="Delay (seconds)" type="number" value={editing.delaySeconds} onChange={v=>setEditing({...editing,delaySeconds:Number(v)})}/>}
      {editing.triggerType==='scroll'&&<Field label="Scroll percentage" type="number" value={editing.scrollPercent} onChange={v=>setEditing({...editing,scrollPercent:Number(v)})}/>}
      <Select label="Display on" value={editing.displayMode} onChange={v=>setEditing({...editing,displayMode:v})}><option value="all">All pages</option><option value="selected">Selected paths only</option><option value="excluded">All except selected paths</option></Select>
      <Field label="Page paths" description="One path per line, for example /about-us or /events." type="textarea" rows={4} value={(editing.pageRules||[]).join('\n')} onChange={v=>setEditing({...editing,pageRules:String(v).split('\n').map(x=>x.trim()).filter(Boolean)})}/>
      <Field label="Start date/time" type="datetime-local" value={editing.startAt} onChange={v=>setEditing({...editing,startAt:v})}/>
      <Field label="End date/time" type="datetime-local" value={editing.endAt} onChange={v=>setEditing({...editing,endAt:v})}/>
    </div>
    <Field label="Popup HTML" description="Use the same HTML/CSS conventions as your site content. Forms can be embedded using their rendered HTML." type="textarea" rows={14} value={editing.contentHtml} onChange={v=>setEditing({...editing,contentHtml:v})}/>
    <div className="flex gap-3"><button onClick={save} disabled={busy} className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2">{busy?<Loader2 className="animate-spin" size={16}/>:<Save size={16}/>} Save Popup</button><button onClick={()=>setEditing(null)} className="border border-gray-300 px-5 py-2.5 rounded-lg text-sm">Cancel</button></div>
  </Section>;

  return <Section title="Popups">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-2"><label className="text-sm text-gray-600">Filter</label><select value={filter} onChange={e=>setFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"><option value="all">All</option><option value="published">Published</option><option value="draft">Draft</option><option value="trash">Trash</option></select></div><button onClick={newPopup} className="bg-[#5e3fde] text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"><Plus size={16}/> Add Popup</button></div>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b border-gray-200 bg-gray-50"><th className="p-3">Title</th><th className="p-3">Trigger</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
      <tbody>{visible.map(p=><tr key={p.id} className="border-b border-gray-100"><td className="p-3 font-medium">{p.title}<div className="text-xs text-gray-400">/{p.slug}</div></td><td className="p-3 capitalize">{p.triggerType}</td><td className="p-3">{p.status}</td><td className="p-3"><div className="flex justify-end flex-wrap gap-2">
        <button onClick={()=>edit(p)} className="text-[#5e3fde] hover:underline">Edit</button>
        <button onClick={()=>action(p,'duplicate')} className="text-[#5e3fde] hover:underline">Duplicate</button>
        {p.status!=='Published'&&p.status!=='Trash'&&<button onClick={()=>action(p,'publish')} className="text-green-700 hover:underline">Publish</button>}
        {p.status!=='Trash'&&<button onClick={()=>action(p,'trash')} className="text-red-600 hover:underline">Move to Trash</button>}
        {p.status==='Trash'&&<><button onClick={()=>action(p,'draft')} className="text-[#5e3fde] hover:underline">Restore Draft</button><button onClick={()=>action(p,'delete')} className="text-red-700 hover:underline">Delete</button></>}
      </div></td></tr>)}
      {filtered.length===0&&<tr><td colSpan={4} className="p-8 text-center text-gray-500">No popups yet.</td></tr>}</tbody>
    </table></div>
    {totalPages>1&&<div className="flex items-center justify-between pt-2"><span className="text-xs text-gray-500">Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40">Previous</button><button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40">Next</button></div></div>}
  </Section>;
}

export default function AddonSettingsClient({slug}:{slug:string}) {
  const [s,setS]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [transferTypes,setTransferTypes]=useState(['pages','posts','media','forms']);
  const [testEmail,setTestEmail]=useState('');
  const [testPhone,setTestPhone]=useState('');

  useEffect(()=>{
    let cancelled=false;
    Promise.all([
      fetchJsonWithRetry<{entries:any[]}>('/api/admin/addon-settings'),
      fetchJsonWithRetry<{values:Record<string,string>}>('/api/settings/code?group=analytics').catch(()=>({values:{}})),
    ]).then(([addonData,code])=>{
      if(cancelled)return;
      const general=addonEntriesToMap(addonData.entries);
      setS({
        ...general,
        analytics_head_code: decodeCode(code.values?.analytics_head_code || ''),
        analytics_body_code: decodeCode(code.values?.analytics_body_code || ''),
      });
    }).catch((error:any)=>{
      console.error('Failed to load add-on settings',error);
      if(!cancelled)toast.error(error?.message||'Failed to load add-on settings');
    }).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[]);
  const set=(key:string,value:any)=>setS(v=>({...v,[key]:String(value)}));
  const save=async(keys:string[])=>{
    setSaving(true);
    try{
      const normalKeys=keys.filter(k=>!codeSettingKeys.has(k));
      const codeKeys=keys.filter(k=>codeSettingKeys.has(k));

      if(normalKeys.length){
        const entries=normalKeys.map((key)=>({k:encodeCode(key),v:encodeCode(s[key]??'')}));
        const res=await fetch(`${BASE_PATH}/api/admin/addon-settings`,{
          method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries})
        });
        const data=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(data.error||'Could not save settings');
        const saved=addonEntriesToMap(data.entries);
        const mismatched=normalKeys.filter((key)=>(saved[key]??'')!==(s[key]??''));
        if(mismatched.length)throw new Error(`Database save verification failed for: ${mismatched.join(', ')}`);
      }

      if(codeKeys.length){
        const values:Record<string,string>={};
        codeKeys.forEach(k=>values[k]=encodeCode(s[k]??''));
        const res=await fetch(`${BASE_PATH}/api/settings/code`,{
          method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({group:'analytics',values})
        });
        const data=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(data.error||'Could not save tracking code');
        const mismatched=codeKeys.filter(k=>decodeCode(data.values?.[k]||'')!==(s[k]??''));
        if(mismatched.length)throw new Error(`Save verification failed for: ${mismatched.join(', ')}`);
      }

      toast.success('Settings saved and verified');
      return true;
    }catch(error:any){
      console.error(error);
      toast.error(error?.message||'Could not save settings');
      return false;
    }finally{
      setSaving(false);
    }
  };
  const SaveButton=({keys}:{keys:string[]})=><button onClick={()=>save(keys)} disabled={saving} className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2">{saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} Save Changes</button>;
  const uploadJson=async(file:File|null,url:string)=>{
    if(!file)return;
    try{
      const doc=JSON.parse(await file.text());
      const res=await fetchWithRetry(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(doc)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Import failed');
      const counts=data.result&&typeof data.result==='object'?Object.entries(data.result).map(([key,value])=>`${key}: ${value}`).join(', '):'';
      toast.success(counts?`Import completed — ${counts}`:'Import completed');
    }catch(error:any){
      toast.error(error?.message||'Please choose a valid JSON export file.');
    }
  };
  const downloadApiFile=async(url:string,fallback:string)=>{
    try{
      const res=await fetchWithRetry(url);
      if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(data.error||`Download failed (${res.status})`);}
      const blob=await res.blob();
      const disposition=res.headers.get('content-disposition')||'';
      const filename=disposition.match(/filename="?([^";]+)"?/i)?.[1]||fallback;
      const objectUrl=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=objectUrl;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(objectUrl);
      toast.success('Download ready');
    }catch(error:any){toast.error(error?.message||'Download failed');}
  };

  if(loading) return <div className="p-8"><Loader2 className="animate-spin text-gray-400"/></div>;
  const title=titles[slug]||'Add-on';

  let content:React.ReactNode;
  if(slug==='google-reviews') {
    const keys=['google_reviews_api_key','google_reviews_place_id','google_reviews_cache_hours','google_reviews_max'];
    content=<><Section title="Google Places Connection"><div className="grid md:grid-cols-2 gap-5"><Field label="Google Places API Key" type="password" value={s.google_reviews_api_key} onChange={v=>set('google_reviews_api_key',v)}/><Field label="Place ID" value={s.google_reviews_place_id} onChange={v=>set('google_reviews_place_id',v)}/><Field label="Refresh cache every (hours)" type="number" value={s.google_reviews_cache_hours||'48'} onChange={v=>set('google_reviews_cache_hours',v)}/><Field label="Maximum reviews" type="number" value={s.google_reviews_max||'5'} onChange={v=>set('google_reviews_max',v)}/></div><div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm"><strong>Shortcode:</strong> <code>[google_reviews]</code></div><div className="flex gap-3"><SaveButton keys={keys}/><button onClick={async()=>{if(!(await save(keys)))return;const r=await fetch(`${BASE_PATH}/api/google-reviews?refresh=1`,{cache:'no-store'});const d=await r.json();r.ok?toast.success(`Connected — ${d.rating||0} rating`):toast.error(d.error||'Google Reviews test failed');}} className="border border-gray-300 px-4 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"><RefreshCw size={15}/> Test / Refresh</button></div></Section></>;
  } else if(slug==='backup-restore') {
    content=<Section title="Backup & Restore"><p className="text-sm text-gray-600">The backup includes CMS settings, users (hashed passwords), pages, posts, taxonomies, media records, forms, menus and popups. Keep backup files private.</p><div className="flex flex-wrap gap-3"><button type="button" onClick={()=>downloadApiFile('/api/backup','cms-backup.json')} className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2"><Download size={16}/> Download Backup</button><label className="border border-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 cursor-pointer"><Upload size={16}/> Restore Backup<input type="file" accept=".json,application/json" className="hidden" onChange={e=>uploadJson(e.target.files?.[0]||null,'/api/backup')}/></label></div><div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-5">Media database records are included. Physical files in <code>public/uploads</code> must still be backed up at server/file-system level.</div><p className="text-xs text-gray-500">Restore merges matching records rather than deleting unrelated live data.</p></Section>;
  } else if(slug==='maintenance') {
    const keys=['maintenance_title','maintenance_message'];
    content=<Section title="Maintenance Screen"><Field label="Heading" value={s.maintenance_title||'We’ll be right back'} onChange={v=>set('maintenance_title',v)}/><Field label="Message" type="textarea" value={s.maintenance_message||'We are performing scheduled maintenance. Please check back shortly.'} onChange={v=>set('maintenance_message',v)}/><p className="text-xs text-gray-500">When the add-on toggle is enabled, public visitors see this screen. Logged-in administrators keep normal access.</p><SaveButton keys={keys}/></Section>;
  } else if(slug==='analytics') {
    const keys=['analytics_ga4_id','analytics_gtm_id','analytics_head_code','analytics_body_code'];
    content=<>
      <Section title="Google Analytics & Tag Manager">
        <div className="grid md:grid-cols-2 gap-5">
          <Field label="GA4 Measurement ID" description="Optional. Enter only the Measurement ID and the CMS will generate the standard GA4 loader." placeholder="G-XXXXXXXXXX" value={s.analytics_ga4_id} onChange={v=>set('analytics_ga4_id',v)}/>
          <Field label="Google Tag Manager Container ID" description="Optional. Enter only the container ID and the CMS will generate the standard GTM head + body snippets." placeholder="GTM-XXXXXXX" value={s.analytics_gtm_id} onChange={v=>set('analytics_gtm_id',v)}/>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Use either the GTM Container ID field or paste the GTM snippet manually. If the same GTM ID is detected in Custom JS / Tracking code, the CMS suppresses the generated GTM copy so the container is not executed twice. Next.js may still show the ID more than once in raw View Source because server-rendered values are also serialized in the React payload; that is not an extra GTM execution.
        </div>
      </Section>
      <Section title="Custom Tracking Code">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
          Keep marketing/measurement code here rather than mixing it with Settings → Custom CSS/JS. These snippets follow the Analytics / Tracking add-on and Cookie Consent state.
        </div>
        <TrackingCodeField label="Head Tracking Code" description="Inserted in the real document <head>. Use for Meta Pixel, Microsoft Clarity, Google Ads or other tracking scripts that specifically require head placement." value={s.analytics_head_code} onChange={v=>set('analytics_head_code',v)} placeholder={'<script>\n  // Tracking code\n</script>'}/>
        <TrackingCodeField label="Body Tracking Code" description="Inserted immediately after <body>. Use for tracking snippets or <noscript> fallbacks that specifically require body placement." value={s.analytics_body_code} onChange={v=>set('analytics_body_code',v)} placeholder={'<noscript>...</noscript>'}/>
        <p className="text-xs text-gray-500 leading-5">No separate footer tracking field is needed. Rare footer-only scripts can continue to use Settings → Custom CSS/JS → Custom JavaScript (Footer).</p>
        <SaveButton keys={keys}/>
      </Section>
      <p className="text-xs text-gray-500 leading-5">If Cookie Consent is enabled, GA4, GTM and custom tracking snippets load only after the visitor accepts cookies.</p>
    </>;
  } else if(slug==='cookie-consent') {
    const keys=['cookie_consent_message','cookie_accept_text','cookie_reject_text','cookie_privacy_url','cookie_position'];
    content=<Section title="Consent Banner"><Field label="Message" type="textarea" value={s.cookie_consent_message||'We use cookies to improve your experience and measure website performance.'} onChange={v=>set('cookie_consent_message',v)}/><div className="grid md:grid-cols-2 gap-5"><Field label="Accept button" value={s.cookie_accept_text||'Accept'} onChange={v=>set('cookie_accept_text',v)}/><Field label="Reject button" value={s.cookie_reject_text||'Reject'} onChange={v=>set('cookie_reject_text',v)}/><Field label="Privacy Policy URL" value={s.cookie_privacy_url} onChange={v=>set('cookie_privacy_url',v)}/><Select label="Position" value={s.cookie_position||'bottom'} onChange={v=>set('cookie_position',v)}><option value="bottom">Bottom</option><option value="top">Top</option></Select></div><SaveButton keys={keys}/></Section>;
  } else if(slug==='image-optimization') {
    content=<ImageOptimizationSettings/>;
  } else if(slug==='popup-builder') {
    content=<PopupManager/>;
  } else if(slug==='twilio') {
    const keys=['twilio_account_sid','twilio_auth_token','twilio_verify_service_sid','twilio_channel'];
    content=<Section title="Twilio Verify"><div className="grid md:grid-cols-2 gap-5"><Field label="Account SID" value={s.twilio_account_sid} onChange={v=>set('twilio_account_sid',v)}/><Field label="Auth Token" type="password" value={s.twilio_auth_token} onChange={v=>set('twilio_auth_token',v)}/><Field label="Verify Service SID" value={s.twilio_verify_service_sid} onChange={v=>set('twilio_verify_service_sid',v)}/><Select label="Channel" value={s.twilio_channel||'sms'} onChange={v=>set('twilio_channel',v)}><option value="sms">SMS</option><option value="call">Voice call</option></Select></div><div className="flex flex-wrap gap-3 items-end"><SaveButton keys={keys}/><div className="flex gap-2"><input value={testPhone} onChange={e=>setTestPhone(e.target.value)} placeholder="+15551234567" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"/><button onClick={async()=>{if(!(await save(keys)))return;const r=await fetch(`${BASE_PATH}/api/admin/twilio-test`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:testPhone})});const d=await r.json();r.ok?toast.success('Test code sent'):toast.error(d.error||'Twilio test failed');}} className="border border-gray-300 px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2"><Send size={15}/> Send Test</button></div></div><p className="text-xs text-gray-500">When this add-on is enabled, the login screen uses Phone Number → OTP → Login. Add a unique E.164 mobile number to each CMS user that needs access. Username/password login is used when this add-on is disabled.</p></Section>;
  } else if(slug==='import-export') {
    const types=['pages','posts','media','forms','categories','tags','menus','popups'];
    content=<Section title="CMS Import / Export"><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{types.map(t=><label key={t} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={transferTypes.includes(t)} onChange={e=>setTransferTypes(v=>e.target.checked?[...v,t]:v.filter(x=>x!==t))}/>{t}</label>)}</div><div className="flex flex-wrap gap-3"><button type="button" disabled={!transferTypes.length} onClick={()=>downloadApiFile(`/api/cms-transfer?types=${encodeURIComponent(transferTypes.join(','))}`,'cms-export.json')} className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"><Download size={16}/> Export Selected</button><label className="border border-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 cursor-pointer"><Upload size={16}/> Import CMS File<input type="file" accept=".json,application/json" className="hidden" onChange={e=>uploadJson(e.target.files?.[0]||null,'/api/cms-transfer')}/></label></div><p className="text-xs text-gray-500">Import merges by stable identifiers such as slug/shortcode rather than deleting unrelated content. Media export contains database records/URLs; physical upload files remain in your uploads directory.</p></Section>;
  } else if(slug==='smtp') {
    const keys=['smtp_host','smtp_port','smtp_secure_mode','smtp_auth_mode','smtp_user','smtp_pass','smtp_from_email','smtp_from_name','smtp_reply_to','smtp_reject_unauthorized'];
    content=<Section title="SMTP Connection"><div className="grid md:grid-cols-2 gap-5"><Field label="SMTP Host" placeholder="mail.example.com" value={s.smtp_host} onChange={v=>set('smtp_host',v)}/><Field label="Port" type="number" value={s.smtp_port||'587'} onChange={v=>set('smtp_port',v)}/><Select label="Encryption" value={s.smtp_secure_mode||'auto'} onChange={v=>set('smtp_secure_mode',v)}><option value="auto">Auto</option><option value="ssl">SSL/TLS (usually 465)</option><option value="starttls">STARTTLS (usually 587)</option><option value="none">None</option></Select><Select label="Authentication" value={s.smtp_auth_mode||'login'} onChange={v=>set('smtp_auth_mode',v)}><option value="login">Username + password</option><option value="none">No authentication</option></Select>{s.smtp_auth_mode!=='none'&&<><Field label="Username" value={s.smtp_user} onChange={v=>set('smtp_user',v)}/><Field label="Password / App Password" type="password" value={s.smtp_pass} onChange={v=>set('smtp_pass',v)}/></>}<Field label="From Email" value={s.smtp_from_email} onChange={v=>set('smtp_from_email',v)}/><Field label="From Name" value={s.smtp_from_name} onChange={v=>set('smtp_from_name',v)}/><Field label="Default Reply-To" value={s.smtp_reply_to} onChange={v=>set('smtp_reply_to',v)}/></div><Toggle label="Verify server TLS certificate" checked={s.smtp_reject_unauthorized!=='false'} onChange={v=>set('smtp_reject_unauthorized',v)} description="Keep this enabled for production. Disable only for a trusted local/private mail server with a self-signed certificate."/><div className="flex flex-wrap gap-3 items-center"><SaveButton keys={keys}/><input type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="test@example.com" className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm"/><button onClick={async()=>{if(!(await save(keys)))return;const r=await fetch(`${BASE_PATH}/api/admin/smtp-test`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:testEmail})});const d=await r.json();r.ok?toast.success(testEmail?'SMTP works — test email sent':'SMTP connection verified'):toast.error(d.error||'SMTP test failed');}} className="border border-gray-300 px-4 py-2.5 rounded-lg text-sm inline-flex items-center gap-2"><Send size={15}/> Test SMTP</button></div><div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 leading-5"><strong>Works with:</strong> hosting/cPanel mail, Gmail (App Password), Microsoft/Outlook SMTP, Zoho, Mailgun/SendGrid SMTP relay, Amazon SES SMTP and other standards-compliant SMTP providers.</div></Section>;
  } else {
    content=<Section title="Not found"><p className="text-sm text-gray-500">This add-on configuration page does not exist.</p></Section>;
  }

  return <div className="max-w-4xl space-y-6">
    <div><Link href="/admin/addons" className="text-sm text-[#5e3fde] inline-flex items-center gap-1 hover:underline"><ArrowLeft size={14}/> Back to Add-ons</Link><h1 className="text-2xl font-bold text-gray-900 mt-3">{title}</h1></div>
    {content}
  </div>;
}

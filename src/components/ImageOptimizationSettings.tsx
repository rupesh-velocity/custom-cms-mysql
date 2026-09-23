'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, HardDrive, Image as ImageIcon, RefreshCw, RotateCcw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

type MediaItem={id:number;filename:string;url:string;mimeType:string;detectedMimeType:string;size:number;optimized:boolean;originalSize?:number|null;originalUrl?:string|null;eligible:boolean;fullyOptimized:boolean;needsOptimization:boolean;canReoptimize:boolean;savedBytes:number;originalBytes:number};
type FailedItem={id:number;filename:string;error:string};
type Settings={image_optimize_new_uploads:string;image_convert_webp:string;image_keep_originals:string;image_quality:string;image_max_width:string;image_lazy_load:string};
type Health={total:number;repairNeeded:number;repairIds:number[];missingUnrepairable:number;missingUnrepairableIds:number[]};
type Stats={totalMedia:number;total:number;optimized:number;pending:number;unsupported:number;reoptimizable:number;savedBytes:number;savedPercent:number;webpEnabled:boolean;items:MediaItem[]};
const defaults:Settings={image_optimize_new_uploads:'true',image_convert_webp:'true',image_keep_originals:'true',image_quality:'82',image_max_width:'2560',image_lazy_load:'true'};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));


function encodeValue(value:string){const bytes=new TextEncoder().encode(value);let binary='';bytes.forEach(byte=>{binary+=String.fromCharCode(byte);});return btoa(binary);}
function decodeValue(value:string){if(!value)return'';const binary=atob(value);const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));return new TextDecoder().decode(bytes);}
function entriesToMap(entries:any){const out:Record<string,string>={};if(!Array.isArray(entries))return out;entries.forEach((entry:any)=>{try{const key=decodeValue(String(entry?.k||''));if(key)out[key]=decodeValue(String(entry?.v||''));}catch{}});return out;}

function Toggle({checked,onChange,label,description}:{checked:boolean;onChange:(v:boolean)=>void;label:string;description:string}){
  return <label className="flex items-start justify-between gap-5 cursor-pointer"><span><span className="block text-sm font-semibold text-gray-900">{label}</span><span className="block text-xs text-gray-500 mt-1 leading-5">{description}</span></span><span className={`relative w-11 h-6 rounded-full shrink-0 mt-0.5 transition-colors ${checked?'bg-[#5e3fde]':'bg-gray-300'}`}><input className="sr-only" type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked?'left-6':'left-1'}`}/></span></label>;
}
function formatBytes(bytes:number){if(!bytes)return'0 B';const units=['B','KB','MB','GB'];const i=Math.min(units.length-1,Math.floor(Math.log(bytes)/Math.log(1024)));return`${(bytes/Math.pow(1024,i)).toFixed(i?1:0)} ${units[i]}`;}

export default function ImageOptimizationSettings(){
  const [settings,setSettings]=useState<Settings>(defaults);
  const [addonEnabled,setAddonEnabled]=useState(true);
  const [stats,setStats]=useState<Stats>({totalMedia:0,total:0,optimized:0,pending:0,unsupported:0,reoptimizable:0,savedBytes:0,savedPercent:0,webpEnabled:true,items:[]});
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');
  const [saving,setSaving]=useState(false);
  const [bulkBusy,setBulkBusy]=useState(false);
  const [failedItems,setFailedItems]=useState<FailedItem[]>([]);
  const [health,setHealth]=useState<Health>({total:0,repairNeeded:0,repairIds:[],missingUnrepairable:0,missingUnrepairableIds:[]});
  const [progress,setProgress]=useState({done:0,total:0,success:0,failed:0,skipped:0,current:''});

  const load=useCallback(async()=>{
    setLoadError('');
    try{
      const [sr,statsResponse,hr]=await Promise.all([
        fetch(`${BASE_PATH}/api/admin/addon-settings`,{cache:'no-store',credentials:'same-origin'}),
        fetch(`${BASE_PATH}/api/media/optimization-stats`,{cache:'no-store',credentials:'same-origin'}),
        fetch(`${BASE_PATH}/api/media/optimization-health`,{cache:'no-store',credentials:'same-origin'}),
      ]);
      if(!sr.ok)throw new Error(`Settings request failed (${sr.status})`);
      if(!statsResponse.ok){const errorData=await statsResponse.json().catch(()=>({}));throw new Error(errorData.error||`Optimization stats request failed (${statsResponse.status})`);}
      const settingsPayload=await sr.json();const s=entriesToMap(settingsPayload.entries);const optimizationStats=await statsResponse.json();const h=hr.ok?await hr.json():null;
      setAddonEnabled(s.addon_image_optimization_enabled==='true');
      setSettings({image_optimize_new_uploads:s.image_optimize_new_uploads??defaults.image_optimize_new_uploads,image_convert_webp:s.image_convert_webp??defaults.image_convert_webp,image_keep_originals:s.image_keep_originals??defaults.image_keep_originals,image_quality:s.image_quality??defaults.image_quality,image_max_width:s.image_max_width??defaults.image_max_width,image_lazy_load:s.image_lazy_load??defaults.image_lazy_load});
      setStats({totalMedia:Number(optimizationStats.totalMedia||0),total:Number(optimizationStats.total||0),optimized:Number(optimizationStats.optimized||0),pending:Number(optimizationStats.pending||0),unsupported:Number(optimizationStats.unsupported||0),reoptimizable:Number(optimizationStats.reoptimizable||0),savedBytes:Number(optimizationStats.savedBytes||0),savedPercent:Number(optimizationStats.savedPercent||0),webpEnabled:Boolean(optimizationStats.webpEnabled),items:Array.isArray(optimizationStats.items)?optimizationStats.items:[]});
      if(h&&typeof h==='object')setHealth({total:Number(h.total||0),repairNeeded:Number(h.repairNeeded||0),repairIds:Array.isArray(h.repairIds)?h.repairIds.map(Number):[],missingUnrepairable:Number(h.missingUnrepairable||0),missingUnrepairableIds:Array.isArray(h.missingUnrepairableIds)?h.missingUnrepairableIds.map(Number):[]});
    }catch(e:any){const message=e?.message||'Could not load image optimization data';console.error(e);setLoadError(message);toast.error(message);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  // The dashboard and queue use the server-side classification result. This avoids
  // legacy MIME values (or missing MIME values) making real JPG/PNG/WebP records disappear.
  const eligible=stats.items;
  const webpEnabled=stats.webpEnabled;
  const optimized=eligible.filter(x=>x.fullyOptimized);
  const pending=eligible.filter(x=>x.needsOptimization);
  const reoptimizable=eligible.filter(x=>x.canReoptimize);
  const reoptimizeSkipped=Math.max(0,optimized.length-reoptimizable.length);
  const repairable=eligible.filter(x=>health.repairIds.includes(x.id));
  const savedBytes=stats.savedBytes;
  const savedPercent=stats.savedPercent;

  const save=async(showToast=true)=>{
    setSaving(true);
    try{
      const quality=Math.max(30,Math.min(100,Number(settings.image_quality||82)));
      const maxWidth=Math.max(0,Number(settings.image_max_width||0));
      const payload={...settings,image_quality:String(quality),image_max_width:String(maxWidth)};
      const entries=Object.entries(payload).map(([key,value])=>({k:encodeValue(key),v:encodeValue(String(value))}));
      const r=await fetch(`${BASE_PATH}/api/admin/addon-settings`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||'Could not save image optimization settings');
      const saved=entriesToMap(data.entries);
      const mismatched=Object.keys(payload).filter(key=>(saved[key]??'')!==String((payload as any)[key]??''));
      if(mismatched.length)throw new Error(`Database save verification failed for: ${mismatched.join(', ')}`);
      setSettings(payload);
      await load();
      if(showToast)toast.success('Image optimization settings saved and verified');
      return true;
    }catch(error:any){toast.error(error?.message||'Could not save image optimization settings');return false;}finally{setSaving(false);}
  };

  const optimizeItems=async(items:MediaItem[],label:string,skipped=0)=>{
    if(!items.length){toast.success('No images need optimization');return;}
    if(!addonEnabled){toast.error('Enable Image Optimization first');return;}

    // Do not make bulk processing depend on a Settings save request. The Save Changes
    // button controls settings; bulk actions use the last saved configuration immediately.
    setBulkBusy(true);setFailedItems([]);setProgress({done:0,total:items.length,success:0,failed:0,skipped,current:items[0]?.filename||''});
    // Yield once so the browser paints the queue/progress state before the first request.
    await sleep(0);
    let success=0;const failures:FailedItem[]=[];
    try{
      for(let i=0;i<items.length;i++){
        const item=items[i];
        setProgress(prev=>({...prev,current:item.filename}));
        try{
          // One image per request + timeout keeps cPanel CPU/memory bounded and prevents
          // a single problematic Sharp job from leaving the whole queue at 0 forever.
          const controller=new AbortController();
          const timeout=setTimeout(()=>controller.abort(),60000);
          let r:Response;
          try{
            r=await fetch(`${BASE_PATH}/api/media/optimize`,{
              method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
              headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id})
            });
          }finally{clearTimeout(timeout);}
          const data=await r.json().catch(()=>({}));
          if(r.ok){
            const shouldBeWebp=webpEnabled&&['image/jpeg','image/png'].includes(item.detectedMimeType);
            if(shouldBeWebp&&data.mimeType!=='image/webp'&&data.generatedWebp!==true){
              failures.push({id:item.id,filename:item.filename,error:'Server completed the request but did not generate a WebP file.'});
            }else{
              success++;
            }
          }else failures.push({id:item.id,filename:item.filename,error:data.error||`Request failed (${r.status})`});
        }catch(error:any){
          const message=error?.name==='AbortError'?'Timed out after 60 seconds':(error?.message||'Network/request error');
          failures.push({id:item.id,filename:item.filename,error:message});
        }
        setFailedItems([...failures]);
        setProgress({done:i+1,total:items.length,success,failed:failures.length,skipped,current:i+1<items.length?(items[i+1]?.filename||''):''});
        if(i<items.length-1)await sleep(250);
      }
      await load();
      failures.length?toast.error(`${label}: ${success} optimized, ${failures.length} failed`):toast.success(`${label} completed: ${success} optimized`);
    }finally{
      setBulkBusy(false);
    }
  };

;

  const retryFailed=()=>{
    const ids=new Set(failedItems.map(x=>x.id));
    const retry=eligible.filter(x=>ids.has(x.id));
    optimizeItems(retry,'Retry failed images');
  };

  if(loading)return <div className="py-12 text-sm text-gray-500">Loading image optimization...</div>;
  if(loadError)return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"><div className="font-semibold">Image Optimization data could not be loaded.</div><p className="text-xs mt-1 break-words">{loadError}</p><button type="button" onClick={()=>{setLoading(true);void load();}} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold">Retry</button></div>;
  const quality=Number(settings.image_quality||82);const progressPct=progress.total?Math.round(progress.done/progress.total*100):0;const waitingNow=bulkBusy?Math.max(0,progress.total-progress.done):pending.length;

  return <div className="space-y-6">
    {!addonEnabled&&<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div><strong>Image Optimization is disabled.</strong><p className="text-xs mt-1">Settings remain visible, but optimization actions are unavailable until the add-on is enabled.</p></div><Link href="/admin/addons" className="font-semibold text-[#5e3fde] hover:underline">Enable in Add-ons</Link></div>}

    {health.repairNeeded>0&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><p className="text-sm font-semibold text-amber-900">{health.repairNeeded} previously optimized image{health.repairNeeded===1?' needs':'s need'} URL repair</p><p className="text-xs text-amber-800 mt-1 leading-5">An older optimizer changed the attachment extension and can leave existing Page/Post/Course HTML pointing to the old URL. Repair restores that public URL without deleting the generated WebP copy.</p></div><button type="button" disabled={bulkBusy||!repairable.length} onClick={()=>optimizeItems(repairable,'Repair optimized media')} className="shrink-0 border border-amber-300 bg-white text-amber-900 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">Repair Existing Images</button></div>}
    {health.missingUnrepairable>0&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><strong>{health.missingUnrepairable} Media Library file{health.missingUnrepairable===1?' is':'s are'} missing with no backup available.</strong><p className="text-xs mt-1 leading-5">Restore those physical files to the configured uploads directory before optimizing them.</p></div>}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-gray-500 text-xs"><ImageIcon size={15}/> Optimizable images</div><div className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</div><p className="text-xs text-gray-500 mt-1">JPG, PNG and WebP · {stats.unsupported} other media skipped</p></div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-gray-500 text-xs"><CheckCircle2 size={15}/> Optimized</div><div className="text-2xl font-bold text-gray-900 mt-2">{stats.optimized}</div><p className="text-xs text-gray-500 mt-1">{stats.pending} remaining / needing optimization</p></div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-gray-500 text-xs"><HardDrive size={15}/> Space saved</div><div className="text-2xl font-bold text-gray-900 mt-2">{formatBytes(savedBytes)}</div><p className="text-xs text-gray-500 mt-1">{savedPercent}% across optimized images</p></div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"><div className="flex items-center gap-2 text-gray-500 text-xs"><Sparkles size={15}/> Next-gen format</div><div className="text-base font-bold text-gray-900 mt-2">{webpEnabled?'WebP enabled':'Original format'}</div><p className="text-xs text-gray-500 mt-1">Existing JPG/PNG is converted safely with original fallback kept</p></div>
    </div>
    <div className="text-xs text-gray-500 px-1">Database media records: <strong className="text-gray-700">{stats.totalMedia}</strong> · Optimizable: <strong className="text-gray-700">{stats.total}</strong> · Pending: <strong className="text-gray-700">{stats.pending}</strong> · Other/unsupported: <strong className="text-gray-700">{stats.unsupported}</strong></div>

    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-900">Optimization Settings</h2><p className="text-xs text-gray-500 mt-1">The existing upload-time optimizer remains active when automatic optimization is enabled.</p></div>
      <div className="divide-y divide-gray-100">
        <div className="p-6"><Toggle checked={settings.image_optimize_new_uploads!=='false'} onChange={v=>setSettings(x=>({...x,image_optimize_new_uploads:v?'true':'false'}))} label="Optimize new uploads automatically" description="Compress new JPG/PNG/WebP Media Library uploads immediately. If optimization fails, the original upload is still saved."/></div>
        <div className="p-6"><Toggle checked={settings.image_convert_webp!=='false'} onChange={v=>setSettings(x=>({...x,image_convert_webp:v?'true':'false'}))} label="Convert JPG/PNG to WebP" description="New and existing JPG/PNG images are converted to WebP. Existing original files are kept as fallbacks, and saved CMS content references are updated to the WebP URL."/></div>
        <div className="p-6"><Toggle checked={settings.image_keep_originals!=='false'} onChange={v=>setSettings(x=>({...x,image_keep_originals:v?'true':'false'}))} label="Keep original backups" description="Required for Restore Original and reliable re-optimization. Recommended for production sites."/></div>
        <div className="p-6"><Toggle checked={settings.image_lazy_load!=='false'} onChange={v=>setSettings(x=>({...x,image_lazy_load:v?'true':'false'}))} label="Lazy load images" description="Lazy-load non-critical images below the fold. The first content image remains eager/high priority so LCP is not delayed."/></div>
        <div className="p-6 grid md:grid-cols-2 gap-6"><div><div className="flex items-center justify-between mb-2"><label className="text-sm font-semibold text-gray-900">Compression quality</label><span className="text-sm font-semibold text-[#5e3fde]">{quality}</span></div><input type="range" min="30" max="100" step="1" value={quality} onChange={e=>setSettings(x=>({...x,image_quality:e.target.value}))} className="w-full accent-[#5e3fde]"/><div className="flex justify-between text-[11px] text-gray-400 mt-1"><span>Smaller files</span><span>Higher quality</span></div><div className="flex flex-wrap gap-2 mt-3"><button type="button" aria-pressed={quality===75} onClick={()=>setSettings(x=>({...x,image_quality:'75'}))} className={`text-xs border rounded-lg px-2.5 py-1.5 transition ${quality===75?'border-[#5e3fde] bg-[#5e3fde]/10 text-[#5e3fde] font-semibold ring-1 ring-[#5e3fde]/20':'border-gray-200 text-gray-700 hover:border-[#5e3fde]'}`}>High compression{quality===75&&' ✓'}</button><button type="button" aria-pressed={quality===82} onClick={()=>setSettings(x=>({...x,image_quality:'82'}))} className={`text-xs border rounded-lg px-2.5 py-1.5 transition ${quality===82?'border-[#5e3fde] bg-[#5e3fde]/10 text-[#5e3fde] font-semibold ring-1 ring-[#5e3fde]/20':'border-gray-200 text-gray-700 hover:border-[#5e3fde]'}`}>Balanced{quality===82&&' ✓'}</button><button type="button" aria-pressed={quality===90} onClick={()=>setSettings(x=>({...x,image_quality:'90'}))} className={`text-xs border rounded-lg px-2.5 py-1.5 transition ${quality===90?'border-[#5e3fde] bg-[#5e3fde]/10 text-[#5e3fde] font-semibold ring-1 ring-[#5e3fde]/20':'border-gray-200 text-gray-700 hover:border-[#5e3fde]'}`}>High quality{quality===90&&' ✓'}</button></div></div><div><label className="block text-sm font-semibold text-gray-900 mb-1.5">Maximum image width</label><div className="flex items-center gap-2"><input type="number" min="0" value={settings.image_max_width} onChange={e=>setSettings(x=>({...x,image_max_width:e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5e3fde]"/><span className="text-sm text-gray-500">px</span></div><p className="text-xs text-gray-500 mt-2">Images wider than this are resized without enlargement. Set 0 to keep original dimensions.</p></div></div>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end"><button type="button" onClick={()=>save()} disabled={saving} className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#4b32b2] disabled:opacity-50"><Save size={16}/>{saving?'Saving...':'Save Changes'}</button></div>
    </section>

    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h2 className="text-base font-semibold text-gray-900">Bulk Optimization</h2><p className="text-xs text-gray-500 mt-1">Low-resource mode processes one image per request instead of running the whole library at once.</p></div><Link href="/admin/media" className="text-sm font-medium text-[#5e3fde] hover:underline">Open Media Library</Link></div>
      <div className="p-6 space-y-5">
        <div className="grid sm:grid-cols-4 gap-3"><div className="border border-gray-200 rounded-xl p-3"><p className="text-xs text-gray-500">Waiting</p><p className="text-xl font-bold text-gray-900 mt-1">{waitingNow}</p></div><div className="border border-gray-200 rounded-xl p-3"><p className="text-xs text-gray-500">Processed</p><p className="text-xl font-bold text-gray-900 mt-1">{progress.done}</p></div><div className="border border-gray-200 rounded-xl p-3"><p className="text-xs text-gray-500">Successful</p><p className="text-xl font-bold text-emerald-700 mt-1">{progress.success}</p></div><div className="border border-gray-200 rounded-xl p-3"><p className="text-xs text-gray-500">Failed / skipped</p><p className="text-xl font-bold text-red-600 mt-1">{progress.failed}<span className="text-sm font-medium text-gray-400"> / {progress.skipped}</span></p></div></div>
        {bulkBusy&&<div><div className="flex justify-between gap-4 text-xs text-gray-600 mb-2"><span className="truncate">Processing {progress.done} of {progress.total}{progress.current?` — ${progress.current}`:''}</span><span className="shrink-0">{progressPct}%</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#5e3fde] transition-all" style={{width:`${progressPct}%`}}/></div></div>}
        <div className="flex flex-wrap gap-3"><button type="button" disabled={!addonEnabled||bulkBusy||!pending.length} onClick={()=>optimizeItems(pending,'Bulk optimization')} className="bg-[#5e3fde] text-white px-4 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"><RefreshCw size={15} className={bulkBusy?'animate-spin':''}/> Optimize Remaining</button><button type="button" disabled={!addonEnabled||bulkBusy||!reoptimizable.length} onClick={()=>{if(confirm('Re-optimize images that have an original backup using the saved settings? Existing public URLs will be preserved.'))optimizeItems(reoptimizable,'Re-optimization',reoptimizeSkipped);}} className="border border-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"><RotateCcw size={15}/> Re-optimize Optimized</button>{failedItems.length>0&&<button type="button" disabled={bulkBusy} onClick={retryFailed} className="border border-red-200 text-red-700 bg-red-50 px-4 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"><RefreshCw size={15}/> Retry Failed ({failedItems.length})</button>}</div>

        {failedItems.length>0&&<div className="border border-red-200 bg-red-50/50 rounded-xl overflow-hidden"><div className="px-4 py-3 border-b border-red-100 flex items-center gap-2 text-sm font-semibold text-red-800"><AlertTriangle size={16}/> Failed images</div><div className="divide-y divide-red-100 max-h-64 overflow-y-auto">{failedItems.map(item=><div key={item.id} className="px-4 py-3"><p className="text-sm font-medium text-gray-900 break-all">{item.filename}</p><p className="text-xs text-red-700 mt-1 break-words">{item.error}</p></div>)}</div></div>}

        <div className="flex items-start gap-3 bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs text-blue-900 leading-5"><ShieldCheck size={17} className="shrink-0 mt-0.5"/><p><strong>Resource-safe processing:</strong> bulk actions run sequentially, one image per request, with a short pause and a 60-second per-image timeout. Keep this browser tab open until the queue finishes. Existing original files are preserved as fallbacks while CMS content is updated to use generated WebP URLs.</p></div>
      </div>
    </section>
  </div>;
}

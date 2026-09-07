'use client';
import { useEffect,useState } from 'react';
import { Save,Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

export default function PermalinksSettings(){
  const [s,setS]=useState({permalink_post_base:'',permalink_category_base:'category',permalink_tag_base:'tag',permalink_trailing_slash:'true'});
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  useEffect(()=>{fetch(`${BASE_PATH}/api/settings`).then(r=>r.json()).then(d=>{setS({
    permalink_post_base:d.permalink_post_base||'',
    permalink_category_base:d.permalink_category_base||'category',
    permalink_tag_base:d.permalink_tag_base||'tag',
    permalink_trailing_slash:d.permalink_trailing_slash||'true',
  });setLoading(false);});},[]);
  const save=async()=>{setSaving(true);const r=await fetch(`${BASE_PATH}/api/settings`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)});setSaving(false);r.ok?toast.success('Permalink settings saved'):toast.error('Could not save permalinks');};
  if(loading)return <Loader2 className="animate-spin text-gray-400"/>;
  const field=(label:string,key:keyof typeof s,help:string)=><div><label className="block text-sm font-medium mb-1">{label}</label><input value={s[key]} onChange={e=>setS(v=>({...v,[key]:e.target.value}))} className="w-full max-w-lg border border-gray-300 rounded-lg px-3 py-2.5"/><p className="text-xs text-gray-500 mt-1">{help}</p></div>;
  return <div className="max-w-3xl space-y-6"><div><h1 className="text-2xl font-bold">Permalinks</h1><p className="text-gray-500 mt-1">Control clean public URL bases without changing stored slugs.</p></div><section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
    {field('Post base','permalink_post_base','Leave blank for /post-name/. Use blog for /blog/post-name/.')}
    {field('Category base','permalink_category_base','Default: category')}
    {field('Tag base','permalink_tag_base','Default: tag')}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.permalink_trailing_slash!=='false'} onChange={e=>setS(v=>({...v,permalink_trailing_slash:e.target.checked?'true':'false'}))}/> Use trailing slash on generated permalinks</label>
    <button onClick={save} disabled={saving} className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex gap-2 items-center">{saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>}Save Changes</button>
  </section></div>;
}

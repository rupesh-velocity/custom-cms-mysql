'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Video, BadgeDollarSign } from 'lucide-react';
import ClassicEditor from '@/components/ClassicEditor';
import ClassicSidebar from '@/components/ClassicSidebar';
import SeoAnalyzer from '@/components/SeoAnalyzer';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

type VideoItem = { title:string; url:string };

export default function CourseEditorForm({ courseId }:{ courseId?:string }) {
  const router=useRouter();
  const isNew=!courseId;
  const [loading,setLoading]=useState(!isNew);
  const [saving,setSaving]=useState(false);
  const [title,setTitle]=useState('');
  const [slug,setSlug]=useState('');
  const [contentHtml,setContentHtml]=useState(isNew?'<p>Start writing your course description here...</p>':'');
  const [contentText,setContentText]=useState(isNew?'Start writing your course description here...':'');
  const [videos,setVideos]=useState<VideoItem[]>([{title:'',url:''}]);
  const [focusKeyword,setFocusKeyword]=useState('');
  const [metaDescription,setMetaDescription]=useState('');
  const [status,setStatus]=useState('Draft');
  const [visibility,setVisibility]=useState('Public');
  const [password,setPassword]=useState('');
  const [publishDate,setPublishDate]=useState('');
  const [price,setPrice]=useState<number|''>('');
  const [salePrice,setSalePrice]=useState<number|''>('');
  const [seoScore,setSeoScore]=useState(0);
  const [featuredImage,setFeaturedImage]=useState<string|null>(null);

  useEffect(()=>{
    if(!courseId) return;
    fetch(`${BASE_PATH}/api/courses/${courseId}`)
      .then(r=>r.json())
      .then(data=>{
        if(data.error){toast.error('Course not found');router.push('/admin/courses');return;}
        setTitle(data.title||'');setSlug(data.slug||'');setContentHtml(data.contentHtml||'');setContentText(data.contentText||'');
        setVideos(Array.isArray(data.videos)&&data.videos.length?data.videos:[{title:'',url:''}]);
        setMetaDescription(data.metaDescription||'');setFocusKeyword(data.focusKeyword||'');setStatus(data.status||'Draft');
        setPrice(data.price||'');setSalePrice(data.salePrice||'');setFeaturedImage(data.featuredImage||null);
        if(data.createdAt){const d=new Date(data.createdAt);const local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);setPublishDate(local);}
      })
      .catch(()=>toast.error('Failed to load course'))
      .finally(()=>setLoading(false));
  },[courseId,router]);

  const effectiveSlug=slug || title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'');
  const previewUrl=`${BASE_PATH}/courses/${effectiveSlug}${effectiveSlug?'/':''}`;
  const addVideo=()=>setVideos(x=>[...x,{title:'',url:''}]);

  const saveCourse=async(overrideStatus?:string)=>{
    if(!title.trim()){toast.error('Please enter a title');return;}
    setSaving(true);
    try{
      const payload={
        title,slug:effectiveSlug,contentHtml,contentText,videos:videos.filter(v=>v.title.trim()&&v.url.trim()),
        metaDescription,focusKeyword,status:overrideStatus||status,price:price?Number(price):0,salePrice:salePrice?Number(salePrice):null,
        featuredImage,createdAt:publishDate||undefined,
      };
      const res=await fetch(courseId?`${BASE_PATH}/api/courses/${courseId}`:`${BASE_PATH}/api/courses`,{
        method:courseId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Could not save course');
      toast.success(courseId?'Course updated':'Course created');
      if(!courseId) router.push(`/admin/courses/${data.id}/edit`); else router.refresh();
    }catch(error:any){toast.error(error.message||'Could not save course');}finally{setSaving(false);}
  };

  if(loading) return <div className="py-16 text-center text-sm text-gray-500">Loading editor...</div>;

  return <div className="max-w-[1280px] mx-auto py-6 px-2">
    <div className="mb-5"><h1 className="text-2xl font-semibold text-gray-900">{isNew?'Add Course':'Edit Course'}</h1><p className="text-sm text-gray-500 mt-1">Manage course content, curriculum, pricing, publishing and SEO.</p></div>
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        <ClassicEditor title={title} setTitle={setTitle} slug={slug} setSlug={setSlug} contentHtml={contentHtml} setContentHtml={setContentHtml} setContentText={setContentText} permalinkBase="courses" trailingSlash={true} modern={true}/>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center"><BadgeDollarSign size={18}/></span><div><h2 className="text-sm font-semibold text-gray-900">Course Pricing</h2><p className="text-xs text-gray-500 mt-0.5">Set the regular price and an optional promotional price.</p></div></div>
          <div className="p-5 grid md:grid-cols-2 gap-5 bg-gradient-to-b from-white to-gray-50/50"><div><label className="block text-sm font-semibold text-gray-900 mb-1.5">Regular Price ($)</label><input type="number" step="0.01" min="0" value={price} onChange={e=>setPrice(e.target.value?Number(e.target.value):'')} className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5e3fde]" placeholder="99.00"/></div><div><label className="block text-sm font-semibold text-gray-900 mb-1.5">Sale Price ($) <span className="font-normal text-gray-400">Optional</span></label><input type="number" step="0.01" min="0" value={salePrice} onChange={e=>setSalePrice(e.target.value?Number(e.target.value):'')} className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#5e3fde]" placeholder="49.00"/></div></div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center"><Video size={18}/></span><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-gray-900">Course Curriculum</h2><span className="text-[11px] font-semibold text-[#5e3fde] bg-[#5e3fde]/10 px-2 py-0.5 rounded-full">{videos.length} {videos.length===1?'video':'videos'}</span></div><p className="text-xs text-gray-500 mt-0.5">Add videos in the order they should appear to students.</p></div></div><button type="button" onClick={addVideo} className="inline-flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium hover:border-[#5e3fde] hover:text-[#5e3fde]"><Plus size={15}/> Add Video</button></div>
          <div className="p-5 space-y-3">{videos.map((video,index)=><div key={index} className="grid md:grid-cols-[44px_1fr_auto] gap-3 items-start border border-gray-200 rounded-xl p-4 bg-gray-50/50"><div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">{index+1}</div><div className="grid md:grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Video Title</label><input className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5e3fde]" value={video.title} onChange={e=>setVideos(x=>x.map((v,i)=>i===index?{...v,title:e.target.value}:v))} placeholder="Lesson title"/></div><div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Video Embed URL</label><input className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5e3fde]" value={video.url} onChange={e=>setVideos(x=>x.map((v,i)=>i===index?{...v,url:e.target.value}:v))} placeholder="https://www.youtube.com/embed/..."/></div></div><button type="button" disabled={videos.length===1} onClick={()=>setVideos(x=>x.filter((_,i)=>i!==index))} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30" title="Remove video"><Trash2 size={17}/></button></div>)}</div>
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3"><p className="text-xs text-gray-500">Add the next lesson without scrolling back to the top.</p><button type="button" onClick={addVideo} className="inline-flex items-center gap-1.5 bg-[#5e3fde] text-white rounded-lg px-3.5 py-2 text-sm font-semibold hover:bg-[#4f32c9]"><Plus size={15}/> Add Video</button></div>
        </section>

        <SeoAnalyzer title={title} setTitle={setTitle} slug={slug} setSlug={setSlug} metaDescription={metaDescription} setMetaDescription={setMetaDescription} content={contentText} focusKeyword={focusKeyword} setFocusKeyword={setFocusKeyword} onScoreChange={setSeoScore}/>
      </div>

      <div className="w-[300px] shrink-0 flex flex-col gap-4">
        <ClassicSidebar status={status} setStatus={setStatus} visibility={visibility} setVisibility={setVisibility} password={password} setPassword={setPassword} publishDate={publishDate} setPublishDate={setPublishDate} isNew={isNew} onPublish={saveCourse} isSaving={saving} score={seoScore} featuredImage={featuredImage} setFeaturedImage={setFeaturedImage} isPost={false} previewUrl={previewUrl} modern={true}/>
      </div>
    </div>
  </div>;
}

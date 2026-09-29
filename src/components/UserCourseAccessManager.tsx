'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

type CoursePlan = { id:number; name:string; durationMonths:number; regularPrice:number; salePrice:number|null; isActive:boolean; isDefault:boolean };
type Course = { id:number; title:string; pricingType?:string; accessPlans?:CoursePlan[] };
type AccessRecord = { id:number; startsAt:string; expiresAt:string|null; source:string; adminNote?:string|null; course: { id:number; title:string; slug:string }; courseAccessPlan?: CoursePlan|null; order?: { orderNumber:string }|null };

function fmt(date?: string | null) { return date ? new Date(date).toLocaleDateString() : 'Lifetime'; }
function status(record: AccessRecord) { return !record.expiresAt || new Date(record.expiresAt).getTime() > Date.now() ? 'Active' : 'Expired'; }

export default function UserCourseAccessManager({ userId }: { userId: number }) {
  const [courses,setCourses]=useState<Course[]>([]);
  const [access,setAccess]=useState<AccessRecord[]>([]);
  const [courseId,setCourseId]=useState('');
  const [planId,setPlanId]=useState('');
  const [source,setSource]=useState<'manual'|'free'>('manual');
  const [adminNote,setAdminNote]=useState('');
  const [saving,setSaving]=useState(false);

  const load=()=>{
    fetch(`${BASE_PATH}/api/courses`).then(r=>r.json()).then(data=>{ if(Array.isArray(data)) setCourses(data); }).catch(()=>{});
    fetch(`${BASE_PATH}/api/users/${userId}/course-access`).then(r=>r.json()).then(data=>{ if(Array.isArray(data)) setAccess(data); }).catch(()=>{});
  };
  useEffect(()=>{ load(); },[userId]);

  const selectedCourse=useMemo(()=>courses.find(c=>String(c.id)===courseId),[courses,courseId]);
  const plans=(selectedCourse?.accessPlans||[]).filter(p=>p.isActive);

  useEffect(()=>{
    if(!selectedCourse) return;
    if(selectedCourse.pricingType==='VARIABLE' && plans.length){ setPlanId(String((plans.find(p=>p.isDefault)||plans[0]).id)); }
    else setPlanId('');
  },[courseId]);

  const grant=async()=>{
    if(!courseId){ toast.error('Select a course'); return; }
    setSaving(true);
    try{
      const res=await fetch(`${BASE_PATH}/api/users/${userId}/course-access`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:Number(courseId),courseAccessPlanId:planId?Number(planId):null,source,adminNote})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Could not grant access');
      toast.success('Course access saved');
      setAdminNote(''); load();
    }catch(error:any){ toast.error(error.message||'Could not grant access'); }
    finally{ setSaving(false); }
  };

  const remove=async(accessId:number)=>{
    if(!confirm('Remove this course access? The customer will no longer be able to open this course.')) return;
    setSaving(true);
    try{
      const res=await fetch(`${BASE_PATH}/api/users/${userId}/course-access`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',accessId})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Could not remove access');
      toast.success('Course access removed'); load();
    }catch(error:any){ toast.error(error.message||'Could not remove access'); }
    finally{ setSaving(false); }
  };

  return <section className="mt-8 max-w-2xl bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
    <div className="mb-5"><h2 className="text-lg font-semibold text-gray-900">Course Access</h2><p className="text-sm text-gray-500 mt-1">Assign a course variation/access plan for manual or complimentary offline enrollments.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label><select value={courseId} onChange={e=>setCourseId(e.target.value)} className="w-full h-[42px] border border-gray-300 rounded-lg px-3 py-2 bg-white"><option value="">Select course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Access Plan</label><select value={planId} onChange={e=>setPlanId(e.target.value)} disabled={!plans.length} className="w-full h-[42px] border border-gray-300 rounded-lg px-3 py-2 bg-white disabled:bg-gray-100"><option value="">{plans.length?'Select plan':'Simple course / no plan'}</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name} · {p.durationMonths} months · ${p.salePrice||p.regularPrice}</option>)}</select></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label><select value={source} onChange={e=>setSource(e.target.value as any)} className="w-full h-[42px] border border-gray-300 rounded-lg px-3 py-2 bg-white"><option value="manual">Manual / Offline Payment</option><option value="free">Free / Complimentary</option></select></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Admin Note</label><input value={adminNote} onChange={e=>setAdminNote(e.target.value)} placeholder="Paid cash, phone order, etc." className="w-full h-[42px] border border-gray-300 rounded-lg px-3 py-2"/></div>
    </div>
    <button type="button" onClick={grant} disabled={saving} className="inline-flex items-center gap-2 bg-[#5e3fde] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"><Plus size={16}/> Grant / Update Access</button>

    <div className="mt-6 border-t border-gray-100 pt-5 space-y-3">
      {access.length===0 ? <p className="text-sm text-gray-500">No course access assigned yet.</p> : access.map(record=><div key={record.id} className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div><div className="font-semibold text-gray-900">{record.course.title}</div><div className="text-sm text-gray-500 mt-1">Plan: {record.courseAccessPlan?.name || 'Simple / Legacy'} · Source: {record.source || 'legacy'} · Started: {fmt(record.startsAt)} · Expires: {fmt(record.expiresAt)}</div>{record.adminNote ? <div className="text-xs text-gray-500 mt-1">Note: {record.adminNote}</div> : null}</div>
        <div className="flex items-center gap-2"><span className={`text-xs font-bold rounded-full px-3 py-1 ${status(record)==='Active'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{status(record)}</span><button type="button" onClick={()=>remove(record.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></div>
      </div>)}
    </div>
  </section>;
}

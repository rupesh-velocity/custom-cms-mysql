'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BASE_PATH } from '@/lib/config';
import toast from 'react-hot-toast';
import { Settings2 } from 'lucide-react';


function encodeValue(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeValue(value: string) {
  if (!value) return '';
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function entriesToMap(entries: any) {
  const out: Record<string,string> = {};
  if (!Array.isArray(entries)) return out;
  entries.forEach((entry) => {
    try {
      const key = decodeValue(String(entry?.k || ''));
      if (key) out[key] = decodeValue(String(entry?.v || ''));
    } catch {}
  });
  return out;
}

export interface AddonCard { slug:string; key:string; title:string; description:string; configureHref?:string; }
export default function AddonsManager({cards, initial}:{cards:AddonCard[],initial:Record<string,string>}) {
  const [values,setValues]=useState(initial);
  const toggle=async(card:AddonCard)=>{
    const previous=values[card.key]||'false';
    const next=previous!=='true';
    const nextValue=next?'true':'false';
    setValues(v=>({...v,[card.key]:nextValue}));
    try{
      const res=await fetch(`${BASE_PATH}/api/admin/addon-settings`,{
        method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({entries:[{k:encodeValue(card.key),v:encodeValue(nextValue)}]})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||'Could not update add-on');
      const saved=entriesToMap(data.entries);
      if(saved[card.key]!==nextValue)throw new Error('Database verification failed');
      setValues(v=>({...v,[card.key]:saved[card.key]}));
      toast.success(`${card.title} ${next?'enabled':'disabled'}`);
    }catch(error:any){
      setValues(v=>({...v,[card.key]:previous}));
      toast.error(error?.message||'Could not update add-on');
    }
  };
  return <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
    {cards.map(card=>{
      const enabled=values[card.key]==='true';
      return <article key={card.slug} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col min-h-[235px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{card.title}</h2>
            <p className="text-sm text-gray-500 mt-2 leading-6">{card.description}</p>
          </div>
          <button type="button" onClick={()=>toggle(card)} aria-pressed={enabled} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${enabled?'bg-[#5e3fde]':'bg-gray-300'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled?'left-6':'left-1'}`}/>
          </button>
        </div>
        <div className="mt-auto pt-5 flex items-center justify-between border-t border-gray-100">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${enabled?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>{enabled?'Enabled':'Disabled'}</span>
          <Link href={card.configureHref || `/admin/addons/${card.slug}`} className="inline-flex items-center gap-1.5 text-sm text-[#5e3fde] font-medium hover:underline"><Settings2 size={15}/> Configure</Link>
        </div>
      </article>;
    })}
  </div>;
}

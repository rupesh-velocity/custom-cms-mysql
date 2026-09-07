'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

function allowed(popup:any, path:string) {
  let rules:string[] = [];
  try { rules = JSON.parse(popup.pageRules || '[]'); } catch {}
  if (popup.displayMode === 'selected') return rules.some(r => path === r || path.startsWith(r.endsWith('/') ? r : `${r}/`));
  if (popup.displayMode === 'excluded') return !rules.some(r => path === r || path.startsWith(r.endsWith('/') ? r : `${r}/`));
  return true;
}

export default function PopupRuntime() {
  const path = usePathname() || '/';
  const [popups,setPopups] = useState<any[]>([]);
  const [active,setActive] = useState<any|null>(null);
  const shown = useRef(new Set<number>());

  useEffect(() => {
    fetch(`${BASE_PATH}/api/popups?active=1`, {cache:'no-store'}).then(r=>r.ok?r.json():[]).then(setPopups).catch(()=>{});
  },[]);

  useEffect(() => {
    const candidates = popups.filter(p=>allowed(p,path) && !shown.current.has(p.id));
    if (!candidates.length) return;
    const cleanups:(()=>void)[] = [];
    for (const p of candidates) {
      const show=()=>{ if(shown.current.has(p.id)) return; shown.current.add(p.id); setActive(p); };
      if (p.triggerType === 'exit') {
        const fn=(e:MouseEvent)=>{ if(e.clientY<=5) show(); };
        document.addEventListener('mouseout',fn); cleanups.push(()=>document.removeEventListener('mouseout',fn));
      } else if (p.triggerType === 'scroll') {
        const fn=()=>{ const h=document.documentElement.scrollHeight-innerHeight; if(h>0 && scrollY/h*100 >= Number(p.scrollPercent||50)) show(); };
        addEventListener('scroll',fn,{passive:true}); cleanups.push(()=>removeEventListener('scroll',fn));
      } else {
        const t=setTimeout(show, Math.max(0,Number(p.delaySeconds||0))*1000); cleanups.push(()=>clearTimeout(t));
      }
    }
    return ()=>cleanups.forEach(fn=>fn());
  },[popups,path]);

  if (!active) return null;
  return <div className="fixed inset-0 z-[99999] bg-black/55 p-4 flex items-center justify-center" onMouseDown={()=>setActive(null)}>
    <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6" onMouseDown={e=>e.stopPropagation()}>
      <button aria-label="Close popup" onClick={()=>setActive(null)} className="absolute right-3 top-3 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X size={18}/></button>
      <div dangerouslySetInnerHTML={{__html:active.contentHtml}} />
    </div>
  </div>;
}

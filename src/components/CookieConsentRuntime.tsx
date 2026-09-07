'use client';
import { useEffect,useState } from 'react';

export default function CookieConsentRuntime({ enabled, message, acceptText, rejectText, privacyUrl, position }:{
  enabled:boolean,message:string,acceptText:string,rejectText:string,privacyUrl:string,position:string
}) {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{ if(enabled && !document.cookie.split('; ').some(c=>c.startsWith('cms_cookie_consent='))) setVisible(true); },[enabled]);
  if(!visible) return null;
  const choose=(value:'accepted'|'rejected')=>{
    document.cookie=`cms_cookie_consent=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
    setVisible(false);
    if(value==='accepted') window.location.reload();
  };
  const pos=position==='top'?'top-0':'bottom-0';
  return <div className={`fixed ${pos} inset-x-0 z-[99998] p-4`}>
    <div className="max-w-5xl mx-auto bg-[#1f2937] text-white rounded-xl shadow-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 text-sm leading-6">
        {message || 'We use cookies to improve your experience and measure website performance.'}
        {privacyUrl && <> <a href={privacyUrl} className="underline font-medium">Privacy Policy</a></>}
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={()=>choose('rejected')} className="px-4 py-2 rounded-lg border border-white/30 hover:bg-white/10 text-sm font-medium">{rejectText||'Reject'}</button>
        <button onClick={()=>choose('accepted')} className="px-4 py-2 rounded-lg bg-white text-gray-900 hover:bg-gray-100 text-sm font-semibold">{acceptText||'Accept'}</button>
      </div>
    </div>
  </div>;
}

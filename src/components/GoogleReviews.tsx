'use client';
import { useEffect,useState } from 'react';
import { Star } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

export default function GoogleReviews() {
  const [data,setData]=useState<any>(null);
  useEffect(()=>{ fetch(`${BASE_PATH}/api/google-reviews`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(setData).catch(()=>{}); },[]);
  if(!data) return null;
  return <section className="google-reviews-widget my-8">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div>
        <h3 className="text-xl font-semibold">{data.name || 'Google Reviews'}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <strong>{Number(data.rating||0).toFixed(1)}</strong>
          <span className="flex">{Array.from({length:5}).map((_,i)=><Star key={i} size={16} fill={i<Math.round(data.rating||0)?'currentColor':'none'} />)}</span>
          <span>({data.userRatingCount || 0} reviews)</span>
        </div>
      </div>
      {data.googleMapsUri && <a href={data.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-[#5e3fde] text-sm font-medium hover:underline">View on Google</a>}
    </div>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {(data.reviews||[]).map((r:any,i:number)=><article key={i} className="border border-gray-200 rounded-xl p-5 bg-white">
        <div className="font-semibold text-gray-900">{r.author}</div>
        <div className="flex my-2">{Array.from({length:5}).map((_,s)=><Star key={s} size={14} fill={s<r.rating?'currentColor':'none'} />)}</div>
        <p className="text-sm text-gray-600 leading-6">{r.text}</p>
        {r.relativeTime && <div className="text-xs text-gray-400 mt-3">{r.relativeTime}</div>}
      </article>)}
    </div>
  </section>;
}

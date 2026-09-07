import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === '1';
    if (forceRefresh && !(await isAdministratorSession())) return NextResponse.json({error:'Unauthorized'},{status:401});
    const rows=await prisma.setting.findMany({where:{key:{in:[
      'addon_google_reviews_enabled','google_reviews_api_key','google_reviews_place_id',
      'google_reviews_cache','google_reviews_cache_at','google_reviews_cache_hours','google_reviews_max'
    ]}}});
    const s=rows.reduce((a:Record<string,string>,r:any)=>{a[r.key]=r.value||'';return a;},{});
    if(s.addon_google_reviews_enabled!=='true') return NextResponse.json({error:'Google Reviews add-on is disabled.'},{status:404});
    const cacheHours=Math.max(1,Number(s.google_reviews_cache_hours||48));
    const cachedAt=s.google_reviews_cache_at ? new Date(s.google_reviews_cache_at).getTime() : 0;
    if(!forceRefresh && s.google_reviews_cache && Date.now()-cachedAt < cacheHours*3600000) {
      return NextResponse.json(JSON.parse(s.google_reviews_cache));
    }
    if(!s.google_reviews_api_key || !s.google_reviews_place_id) return NextResponse.json({error:'Google Reviews API key and Place ID are required.'},{status:400});

    const response=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(s.google_reviews_place_id)}`,{
      headers:{
        'X-Goog-Api-Key':s.google_reviews_api_key,
        'X-Goog-FieldMask':'displayName,rating,userRatingCount,reviews,googleMapsUri'
      },
      cache:'no-store'
    });
    const data=await response.json();
    if(!response.ok) return NextResponse.json({error:data?.error?.message || 'Google Places request failed.'},{status:response.status});

    const max=Math.max(1,Math.min(10,Number(s.google_reviews_max||5)));
    const normalized={
      name:data.displayName?.text || '',
      rating:data.rating || 0,
      userRatingCount:data.userRatingCount || 0,
      googleMapsUri:data.googleMapsUri || '',
      reviews:(data.reviews||[]).slice(0,max).map((r:any)=>({
        author:r.authorAttribution?.displayName || 'Google user',
        authorUri:r.authorAttribution?.uri || '',
        photoUri:r.authorAttribution?.photoUri || '',
        rating:r.rating || 0,
        text:r.text?.text || r.originalText?.text || '',
        relativeTime:r.relativePublishTimeDescription || '',
        publishTime:r.publishTime || ''
      }))
    };
    await Promise.all([
      prisma.setting.upsert({where:{key:'google_reviews_cache'},update:{value:JSON.stringify(normalized)},create:{key:'google_reviews_cache',value:JSON.stringify(normalized)}}),
      prisma.setting.upsert({where:{key:'google_reviews_cache_at'},update:{value:new Date().toISOString()},create:{key:'google_reviews_cache_at',value:new Date().toISOString()}})
    ]);
    return NextResponse.json(normalized);
  } catch(error:any) {
    return NextResponse.json({error:error.message || 'Could not load Google reviews.'},{status:500});
  }
}

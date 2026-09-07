import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { optimizeExistingMedia } from '@/lib/media-optimization';

export async function POST(req:Request){
  if(!(await isAdministratorSession()))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const data=await req.json();
    // Intentionally process one image per request. The admin bulk workflow
    // sequences these requests to avoid a long-running, memory-heavy Sharp loop.
    const id=Number(data.id);
    if(!Number.isInteger(id)||id<=0)return NextResponse.json({error:'A valid media id is required.'},{status:400});
    return NextResponse.json(await optimizeExistingMedia(id));
  }catch(error:any){
    return NextResponse.json({error:error?.message||'Image optimization failed'},{status:400});
  }
}

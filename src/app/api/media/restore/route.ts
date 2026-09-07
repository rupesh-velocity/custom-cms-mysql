import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { restoreExistingMedia } from '@/lib/media-optimization';

export async function POST(req: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data=await req.json();
    if(data.all) {
      const rows=await prisma.media.findMany({where:{mimeType:{in:['image/jpeg','image/png','image/webp']}}});
      const results:any[]=[];
      for(const row of rows) {
        try { results.push(await restoreExistingMedia(row.id)); } catch(error:any) { results.push({id:row.id,error:error.message}); }
      }
      return NextResponse.json({success:true,results});
    }
    const item=await restoreExistingMedia(Number(data.id));
    return NextResponse.json(item);
  } catch(error:any) {
    return NextResponse.json({error:error.message || 'Operation failed'},{status:400});
  }
}

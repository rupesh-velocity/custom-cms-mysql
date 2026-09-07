import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { join, dirname } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { BASE_PATH } from '@/lib/config';
import { getImageOptimizationSettings, getUploadRoot, optimizeBuffer } from '@/lib/media-optimization';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error:'No file uploaded' },{status:400});

    const originalBuffer=Buffer.from(await file.arrayBuffer());
    let buffer=originalBuffer;
    const baseName=file.name.replace(/\.[^/.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'-');
    const originalExtension=file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    let extension=originalExtension;
    let mimeType=file.type || 'application/octet-stream';
    const originalMimeType=mimeType;
    const cfg=await getImageOptimizationSettings();
    let optimized=false;

    if (cfg.enabled && cfg.auto && ['image/jpeg','image/png','image/webp'].includes(mimeType)) {
      try {
        const out=await optimizeBuffer(originalBuffer,mimeType,cfg);
        buffer=out.buffer; extension=out.extension || extension; mimeType=out.mimeType; optimized=true;
      } catch(err){ console.error('Image optimization failed, storing original:',err); }
    }

    // Pick a collision-safe base for both the optimized filename and its original
    // extension. This keeps Restore Original from ever overwriting another attachment.
    let counter=0;
    let safeBase=baseName;
    let finalFileName=`${safeBase}${extension}`;
    while(true){
      const originalCandidate=`${safeBase}${originalExtension}`;
      const conflict=await prisma.media.findFirst({
        where:{ OR:[{filename:finalFileName},{filename:originalCandidate}] }
      });
      if(!conflict)break;
      counter+=1; safeBase=`${baseName}-${counter}`; finalFileName=`${safeBase}${extension}`;
    }

    const now=new Date(), year=String(now.getFullYear()), month=String(now.getMonth()+1).padStart(2,'0');
    const uploadRoot=getUploadRoot(), uploadDir=join(uploadRoot,year,month);
    mkdirSync(uploadDir,{recursive:true});
    writeFileSync(join(uploadDir,finalFileName),buffer);

    let originalUrl:string|null=null;
    let originalFilename:string|null=null;
    if (optimized && cfg.keepOriginals) {
      originalFilename=`${safeBase}${originalExtension}`;
      const backupRel=join('.originals',year,month,`${Date.now()}-${originalFilename}`).replace(/\\/g,'/');
      const backupPath=join(uploadRoot,backupRel);
      mkdirSync(dirname(backupPath),{recursive:true});
      writeFileSync(backupPath,originalBuffer);
      originalUrl=backupRel;
    }

    const finalUrl=`${BASE_PATH}/uploads/${year}/${month}/${finalFileName}`;
    const media=await prisma.media.create({data:{
      filename:finalFileName,url:finalUrl,mimeType,size:buffer.length,
      optimized,originalFilename,originalMimeType:optimized?originalMimeType:null,
      originalSize:optimized?originalBuffer.length:null,originalUrl
    }});
    return NextResponse.json(media);
  } catch(error){ console.error('Error uploading file:',error); return NextResponse.json({error:'Failed to upload file'},{status:500}); }
}

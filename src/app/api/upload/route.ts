import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '@/lib/prisma';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { BASE_PATH } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
    const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
    
    let finalFileName = file.name;
    let publicId = baseName;
    let counter = 1;

    while (true) {
      const existingMedia = await prisma.media.findFirst({
        where: { filename: finalFileName }
      });
      if (!existingMedia) break; 
      finalFileName = `${baseName}-${counter}${extension}`;
      publicId = `${baseName}-${counter}`;
      counter++;
    }

    let finalUrl = '';
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    if (process.env.CLOUDINARY_URL) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'custom-cms', public_id: publicId, resource_type: 'auto' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(buffer);
        });

        const result = uploadResult as any;
        finalUrl = result.secure_url;
      } catch (err) {
        console.error('Cloudinary upload failed, falling back to local file system', err);
        const uploadDir = join(process.cwd(), '..', '..', 'public_html', 'newweb-new', 'uploads', year, month);
        if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
        
        const filePath = join(uploadDir, finalFileName);
        writeFileSync(filePath, buffer);
        finalUrl = `${BASE_PATH}/uploads/${year}/${month}/${finalFileName}`;
      }
    } else {
      // Navigate up from repositories/custom-cms to reach public_html/newweb-new
      const uploadDir = join(process.cwd(), '..', '..', 'public_html', 'newweb-new', 'uploads', year, month);
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
      
      const filePath = join(uploadDir, finalFileName);
      writeFileSync(filePath, buffer);
      finalUrl = `${BASE_PATH}/uploads/${year}/${month}/${finalFileName}`;
    }
    
    const media = await prisma.media.create({
      data: {
        filename: finalFileName,
        url: finalUrl,
        mimeType: file.type || 'application/octet-stream',
        size: buffer.length,
      }
    });
    
    return NextResponse.json(media);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
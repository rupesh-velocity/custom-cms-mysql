import { NextResponse } from 'next/server';
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

    const isLiveServer = process.platform === 'linux';
    const uploadDir = isLiveServer 
      ? join(process.cwd(), '..', '..', 'public_html', 'fitnessarts', 'uploads', year, month)
      : join(process.cwd(), 'public', 'uploads', year, month);

    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    
    const filePath = join(uploadDir, finalFileName);
    writeFileSync(filePath, buffer);
    finalUrl = `${BASE_PATH}/uploads/${year}/${month}/${finalFileName}`;
    
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
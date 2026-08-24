import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function DELETE(req: Request, context: any) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    // Find the media record
    const media = await prisma.media.findUnique({
      where: { id }
    });
    
    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    // Delete the file from the filesystem
    // URL format is usually like /fitnessarts/uploads/2026/08/home-hero-img.png
    // We split by '/uploads/' and take everything after it.
    const urlParts = media.url.split('/uploads/');
    const relativePath = urlParts.length > 1 ? urlParts[1] : media.filename;
    
    const isLiveServer = process.platform === 'linux';
    const path = isLiveServer 
      ? join(process.cwd(), '..', '..', 'public_html', 'fitnessarts', 'uploads', relativePath)
      : join(process.cwd(), 'public', 'uploads', relativePath);
    
    try {
      await unlink(path);
    } catch (e) {
      console.warn(`File ${path} not found on disk, skipping filesystem deletion.`);
    }
    
    // Delete the record from the database
    await prisma.media.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const data = await req.json();
    
    const media = await prisma.media.update({
      where: { id },
      data: {
        altText: data.altText,
        filename: data.filename
      }
    });
    
    return NextResponse.json(media);
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }
}

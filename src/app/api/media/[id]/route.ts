import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

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
    const filename = media.url.replace('/uploads/', '');
    const path = join(process.cwd(), 'public', 'uploads', filename);
    
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

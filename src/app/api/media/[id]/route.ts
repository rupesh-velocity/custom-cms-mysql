import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(req: Request, context: any) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid media ID' },
        { status: 400 }
      );
    }

    const media = await prisma.media.findUnique({
      where: { id }
    });

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    const uploadRoot =
      process.env.UPLOAD_ROOT?.trim() ||
      join(process.cwd(), 'public', 'uploads');

    // Works with:
    // /uploads/2026/08/file.webp
    // and old /fitnessarts/uploads/... records if any remain
    const urlParts = media.url.split('/uploads/');

    const relativePath =
      urlParts.length > 1
        ? urlParts[1]
        : media.filename;

    const filePath = join(uploadRoot, relativePath);

    try {
      await unlink(filePath);
    } catch (error: any) {
      // If physical file is already missing, still remove DB record
      if (error?.code !== 'ENOENT') {
        console.error('Physical media deletion failed:', error);
        throw error;
      }

      console.warn(`Physical file not found: ${filePath}`);
    }

    await prisma.media.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting media:', error);

    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
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

    return NextResponse.json(
      { error: 'Failed to update media' },
      { status: 500 }
    );
  }
}
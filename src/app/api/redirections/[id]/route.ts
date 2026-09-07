import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdministratorSession } from '@/lib/admin-auth';

async function permanentlyDelete(
  id: number,
  fallback?: { sourceUrl?: string; destinationUrl?: string },
) {
  const clauses: any[] = [{ id }];
  if (fallback?.sourceUrl && fallback?.destinationUrl) {
    clauses.push({ sourceUrl: fallback.sourceUrl, destinationUrl: fallback.destinationUrl });
  }

  const result = await prisma.redirection.deleteMany({ where: { OR: clauses } });
  // Permanent delete is intentionally idempotent. If the row was already removed by
  // another request/tab, the UI can still clear its stale copy without a Prisma P2025.
  return NextResponse.json({ success: true, deleted: result.count });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);
    if (!Number.isFinite(numericId)) {
      return NextResponse.json({ error: 'Invalid redirection ID' }, { status: 400 });
    }

    const data = await request.json();

    // Use PUT for permanent deletion as well. Some cPanel/WAF configurations
    // block the HTTP DELETE method before it reaches Next.js.
    if (data?.action === 'delete_permanently') {
      return await permanentlyDelete(numericId, { sourceUrl: data.sourceUrl, destinationUrl: data.destinationUrl });
    }

    const updateData: Record<string, unknown> = {};
    if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
    if (data.ignoreCase !== undefined) updateData.ignoreCase = Boolean(data.ignoreCase);
    if (data.destinationUrl !== undefined) updateData.destinationUrl = data.destinationUrl;
    if (data.redirectType !== undefined) updateData.redirectType = String(data.redirectType);
    if (data.status !== undefined) updateData.status = Boolean(data.status);
    if (data.isTrashed !== undefined) updateData.isTrashed = Boolean(data.isTrashed);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes supplied' }, { status: 400 });
    }

    const redirection = await prisma.redirection.update({
      where: { id: numericId },
      data: updateData,
    });

    return NextResponse.json(redirection);
  } catch (error) {
    console.error('Error updating redirection:', error);
    return NextResponse.json(
      {
        error: 'Failed to update redirection',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Kept for compatibility, but the admin UI intentionally uses PUT with
// action=delete_permanently because DELETE may be blocked by hosting security.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdministratorSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);
    if (!Number.isFinite(numericId)) {
      return NextResponse.json({ error: 'Invalid redirection ID' }, { status: 400 });
    }
    return await permanentlyDelete(numericId);
  } catch (error) {
    console.error('Error deleting redirection:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete redirection',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

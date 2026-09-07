import { NextResponse } from 'next/server';
import { getSessionUser, isAdministratorSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import bcrypt from 'bcryptjs';

async function validatePhone(raw: unknown, excludeId: number) {
  if (!String(raw ?? '').trim()) return { phone: null as string | null, error: '' };
  const phone = normalizePhone(raw);
  if (!phone) {
    return { phone: null, error: 'Enter the mobile number in E.164 format, including country code (for example +15551234567).' };
  }
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });
  if (users.some((user) => user.id !== excludeId && normalizePhone(user.phone) === phone)) {
    return { phone: null, error: 'This mobile number is already assigned to another user.' };
  }
  return { phone, error: '' };
}

export async function GET(req: Request, context: any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const params = await context.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(params.id) },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        bio: true,
        phone: true,
        twilioTwoFactorEnabled: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error fetching user' }, { status: 500 });
  }
}

export async function POST(req: Request, context: any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const data = await req.json();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: data.username }, { email: data.email }],
        NOT: { id },
      },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'Username or Email already exists on another account' }, { status: 400 });
    }

    const phoneResult = await validatePhone(data.phone, id);
    if (phoneResult.error) return NextResponse.json({ error: phoneResult.error }, { status: 400 });

    const updateData: any = {
      username: data.username,
      email: data.email,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      bio: data.bio || '',
      phone: phoneResult.phone,
      role: data.role || 'Subscriber',
    };
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.update({ where: { id }, data: updateData });
    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const sessionUser = await getSessionUser();

    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    if (sessionUser?.id === id) {
      return NextResponse.json({ error: 'You cannot delete the account you are currently logged in with.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (String(user.role).toLowerCase() === 'administrator') {
      const adminCount = await prisma.user.count({ where: { role: 'Administrator' } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'The last Administrator account cannot be deleted.' }, { status: 400 });
      }
    }

    let body: any = {};
    try { body = await req.json(); } catch {}
    const contentAction = body.contentAction === 'delete' ? 'delete' : 'reassign';
    const reassignTo = Number(body.reassignTo || 0);

    if (contentAction === 'reassign') {
      if (!reassignTo || reassignTo === id) {
        return NextResponse.json({ error: 'Select another user to receive this user’s authored content.' }, { status: 400 });
      }
      const replacement = await prisma.user.findUnique({ where: { id: reassignTo }, select: { id: true } });
      if (!replacement) return NextResponse.json({ error: 'Replacement user not found.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (contentAction === 'reassign') {
        await tx.page.updateMany({ where: { authorId: id }, data: { authorId: reassignTo } });
        await tx.post.updateMany({ where: { authorId: id }, data: { authorId: reassignTo } });
        await tx.course.updateMany({ where: { authorId: id }, data: { authorId: reassignTo } });
        await tx.product.updateMany({ where: { authorId: id }, data: { authorId: reassignTo } });
        await tx.form.updateMany({ where: { authorId: id }, data: { authorId: reassignTo } });
        await tx.revision.updateMany({ where: { authorId: id }, data: { authorId: reassignTo } });
      } else {
        // Delete only content that is actually authored/owned by this user.
        // Orders/customers and other business records keep their own lifecycle.
        await tx.form.deleteMany({ where: { authorId: id } });
        // Preserve historical order snapshots even if an authored product is
        // deleted. Variation references are optional, so detach them before
        // product -> variation cascades run.
        const authoredVariationIds = await tx.productVariation.findMany({
          where: { product: { authorId: id } },
          select: { id: true },
        });
        if (authoredVariationIds.length) {
          await tx.orderItem.updateMany({
            where: { variationId: { in: authoredVariationIds.map((item) => item.id) } },
            data: { variationId: null },
          });
        }
        await tx.product.deleteMany({ where: { authorId: id } });
        await tx.course.deleteMany({ where: { authorId: id } });
        await tx.post.deleteMany({ where: { authorId: id } });
        await tx.page.deleteMany({ where: { authorId: id } });
        await tx.revision.updateMany({ where: { authorId: id }, data: { authorId: null } });
      }

      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: error?.message || 'Error deleting user' }, { status: 500 });
  }
}

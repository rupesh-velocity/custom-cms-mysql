import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import bcrypt from 'bcryptjs';

async function validatePhone(raw: unknown, excludeId?: number) {
  if (!String(raw ?? '').trim()) return { phone: null as string | null, error: '' };
  const phone = normalizePhone(raw);
  if (!phone) {
    return { phone: null, error: 'Enter the mobile number in E.164 format, including country code (for example +15551234567).' };
  }

  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });
  const duplicate = users.some((user) => user.id !== excludeId && normalizePhone(user.phone) === phone);
  if (duplicate) return { phone: null, error: 'This mobile number is already assigned to another user.' };
  return { phone, error: '' };
}

export async function POST(req: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await req.json();

    if (data.id) {
      const id = parseInt(data.id);
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
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username: data.username }, { email: data.email }] },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'Username or Email already exists' }, { status: 400 });
    }

    const phoneResult = await validatePhone(data.phone);
    if (phoneResult.error) return NextResponse.json({ error: phoneResult.error }, { status: 400 });

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        bio: data.bio || '',
        phone: phoneResult.phone,
        role: data.role || 'Subscriber',
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error processing user' }, { status: 500 });
  }
}

export async function GET() {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
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
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error fetching users' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (data.id) {
      // UPDATE logic
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: data.username },
            { email: data.email },
          ],
          NOT: { id: parseInt(data.id) }
        },
      });

      if (existingUser) {
        return NextResponse.json({ error: 'Username or Email already exists on another account' }, { status: 400 });
      }

      const updateData: any = {
        username: data.username,
        email: data.email,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        role: data.role || 'Subscriber',
      };

      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }

      const user = await prisma.user.update({
        where: { id: parseInt(data.id) },
        data: updateData,
      });
      return NextResponse.json(user);
    } else {
      // CREATE logic
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: data.username },
            { email: data.email },
          ],
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username or Email already exists' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          username: data.username,
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          role: data.role || 'Subscriber',
        },
      });
      return NextResponse.json(user);
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error processing user' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error fetching users' }, { status: 500 });
  }
}

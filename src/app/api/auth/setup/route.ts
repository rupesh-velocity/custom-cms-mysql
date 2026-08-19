import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Setup is locked because users already exist.' },
        { status: 403 }
      );
    }

    const { email, password, firstName, lastName } = await req.json();

    if (!email || !password || !firstName) {
      return NextResponse.json(
        { error: 'Email, password, and first name are required.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: email.split('@')[0] || 'admin',
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || '',
        role: 'Administrator',
      },
    });

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during setup.' },
      { status: 500 }
    );
  }
}

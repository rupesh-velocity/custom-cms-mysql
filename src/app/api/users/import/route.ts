import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isAdministratorSession } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import { sendSubscriberLoginEmail } from '@/lib/email';

function makeUsername(firstName: string, lastName: string, email: string) {
  const base = `${firstName || ''}${lastName || ''}`.trim() || email.split('@')[0] || 'subscriber';
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 30) || 'subscriber';
}

function makePassword() {
  return `Fit${Math.random().toString(36).slice(2, 8)}${Math.floor(1000 + Math.random() * 9000)}!`;
}

async function uniqueUsername(base: string) {
  let username = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${suffix}`.slice(0, 45);
    suffix += 1;
  }
  return username;
}

export async function POST(req: Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const sendEmails = Boolean(body.sendEmails);

    if (!rows.length) {
      return NextResponse.json({ error: 'No users found to import.' }, { status: 400 });
    }

    const existingPhones = await prisma.user.findMany({
      where: { phone: { not: null } },
      select: { phone: true },
    });
    const usedPhones = new Set(existingPhones.map((u) => normalizePhone(u.phone)).filter(Boolean));
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    const results: Array<{
      row: number;
      email: string;
      status: 'created' | 'skipped' | 'error';
      message: string;
      temporaryPassword?: string;
    }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      const firstName = String(row.firstName || '').trim();
      const lastName = String(row.lastName || '').trim();
      const email = String(row.email || '').trim().toLowerCase();
      const rawPhone = String(row.phone || '').trim();
      const rowNumber = index + 1;

      if (!firstName || !lastName || !email) {
        results.push({ row: rowNumber, email, status: 'error', message: 'First Name, Last Name, and Email are required.' });
        continue;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        results.push({ row: rowNumber, email, status: 'error', message: 'Invalid email address.' });
        continue;
      }
      if (seenEmails.has(email)) {
        results.push({ row: rowNumber, email, status: 'skipped', message: 'Duplicate email in import file.' });
        continue;
      }
      seenEmails.add(email);

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        results.push({ row: rowNumber, email, status: 'skipped', message: 'User already exists.' });
        continue;
      }

      let phone: string | null = null;
      if (rawPhone) {
        phone = normalizePhone(rawPhone);
        if (!phone) {
          results.push({ row: rowNumber, email, status: 'error', message: 'Phone must be in E.164 format, for example +15551234567.' });
          continue;
        }
        if (usedPhones.has(phone) || seenPhones.has(phone)) {
          results.push({ row: rowNumber, email, status: 'error', message: 'Phone number is already assigned to another user.' });
          continue;
        }
        seenPhones.add(phone);
      }

      const temporaryPassword = makePassword();
      const password = await bcrypt.hash(temporaryPassword, 10);
      const username = await uniqueUsername(makeUsername(firstName, lastName, email));

      const user = await prisma.user.create({
        data: {
          username,
          email,
          password,
          firstName,
          lastName,
          phone,
          role: 'Subscriber',
        },
      });

      if (phone) usedPhones.add(phone);

      let emailSent = false;
      let emailMessage = '';
      if (sendEmails) {
        const emailResult = await sendSubscriberLoginEmail({
          userEmail: user.email,
          userName: `${firstName} ${lastName}`.trim(),
          temporaryPassword,
        });
        emailSent = Boolean(emailResult.success);
        emailMessage = emailSent ? ' Login email sent.' : ' Login email could not be sent.';
      }

      results.push({
        row: rowNumber,
        email,
        status: 'created',
        message: `Subscriber created.${emailMessage}`,
        temporaryPassword: sendEmails && emailSent ? undefined : temporaryPassword,
      });
    }

    const summary = results.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { created: 0, skipped: 0, error: 0 } as Record<'created' | 'skipped' | 'error', number>
    );

    return NextResponse.json({ success: true, summary, results });
  } catch (error: any) {
    console.error('User import error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to import users.' }, { status: 500 });
  }
}

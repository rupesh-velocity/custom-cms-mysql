import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export interface CmsSmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secureMode: 'auto' | 'ssl' | 'starttls' | 'none';
  authMode: 'login' | 'none';
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  rejectUnauthorized: boolean;
}

export async function getSmtpSettings(): Promise<CmsSmtpSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [
      'addon_smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_secure_mode',
      'smtp_auth_mode', 'smtp_user', 'smtp_pass', 'smtp_from_email',
      'smtp_from_name', 'smtp_reply_to', 'smtp_reject_unauthorized',
      'from_email', 'site_title'
    ] } }
  });
  const map = rows.reduce((acc: Record<string,string>, row: any) => {
    acc[row.key] = row.value || '';
    return acc;
  }, {});

  const port = Number(map.smtp_port || process.env.SMTP_PORT || 587);
  const secureMode = (map.smtp_secure_mode || (port === 465 ? 'ssl' : 'auto')) as CmsSmtpSettings['secureMode'];
  return {
    enabled: map.addon_smtp_enabled === 'true',
    host: map.smtp_host || process.env.SMTP_HOST || '',
    port,
    secureMode,
    authMode: (map.smtp_auth_mode || 'login') as CmsSmtpSettings['authMode'],
    user: map.smtp_user || process.env.SMTP_USER || '',
    pass: map.smtp_pass || process.env.SMTP_PASS || '',
    fromEmail: map.smtp_from_email || map.from_email || process.env.SMTP_FROM || map.smtp_user || process.env.SMTP_USER || '',
    fromName: map.smtp_from_name || map.site_title || 'Website',
    replyTo: map.smtp_reply_to || '',
    rejectUnauthorized: map.smtp_reject_unauthorized !== 'false',
  };
}

export function createSmtpTransport(settings: CmsSmtpSettings) {
  const secure = settings.secureMode === 'ssl' || (settings.secureMode === 'auto' && settings.port === 465);
  const requireTLS = settings.secureMode === 'starttls';

  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure,
    requireTLS,
    auth: settings.authMode === 'none' ? undefined : {
      user: settings.user,
      pass: settings.pass,
    },
    tls: { rejectUnauthorized: settings.rejectUnauthorized },
  });
}

export async function verifyCmsSmtp() {
  const settings = await getSmtpSettings();
  if (!settings.host) throw new Error('SMTP host is required.');
  if (settings.authMode !== 'none' && (!settings.user || !settings.pass)) {
    throw new Error('SMTP username and password are required when authentication is enabled.');
  }
  const transporter = createSmtpTransport(settings);
  await transporter.verify();
  return true;
}

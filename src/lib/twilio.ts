import { prisma } from '@/lib/prisma';

async function getTwilioSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [
      'addon_twilio_enabled', 'twilio_account_sid', 'twilio_auth_token',
      'twilio_verify_service_sid', 'twilio_channel'
    ] } }
  });
  const map = rows.reduce((a: Record<string,string>, r: any) => {
    a[r.key] = r.value || '';
    return a;
  }, {});
  return {
    enabled: map.addon_twilio_enabled === 'true',
    accountSid: map.twilio_account_sid,
    authToken: map.twilio_auth_token,
    serviceSid: map.twilio_verify_service_sid,
    channel: map.twilio_channel || 'sms',
  };
}

function basicAuth(sid: string, token: string) {
  return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;
}

export async function sendTwilioVerification(phone: string) {
  const cfg = await getTwilioSettings();
  if (!cfg.enabled) throw new Error('Twilio add-on is disabled.');
  if (!cfg.accountSid || !cfg.authToken || !cfg.serviceSid) throw new Error('Twilio Verify credentials are incomplete.');

  const body = new URLSearchParams({ To: phone, Channel: cfg.channel });
  const res = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(cfg.serviceSid)}/Verifications`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(cfg.accountSid, cfg.authToken),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Twilio could not send the verification code.');
  return data;
}

export async function checkTwilioVerification(phone: string, code: string) {
  const cfg = await getTwilioSettings();
  if (!cfg.enabled) throw new Error('Twilio add-on is disabled.');
  if (!cfg.accountSid || !cfg.authToken || !cfg.serviceSid) throw new Error('Twilio Verify credentials are incomplete.');

  const body = new URLSearchParams({ To: phone, Code: code });
  const res = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(cfg.serviceSid)}/VerificationCheck`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(cfg.accountSid, cfg.authToken),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Twilio could not verify the code.');
  return data?.status === 'approved';
}

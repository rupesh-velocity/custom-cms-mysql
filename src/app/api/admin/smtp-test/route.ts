import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { createSmtpTransport, getSmtpSettings, verifyCmsSmtp } from '@/lib/smtp';

export async function POST(req:Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data=await req.json().catch(()=>({}));
    const settings=await getSmtpSettings();
    await verifyCmsSmtp();
    if(data.to) {
      const t=createSmtpTransport(settings);
      await t.sendMail({
        from:`"${settings.fromName}" <${settings.fromEmail || settings.user}>`,
        to:String(data.to),
        subject:'CMS SMTP Test',
        html:'<p>Your SMTP configuration is working correctly.</p>'
      });
    }
    return NextResponse.json({success:true});
  } catch(error:any) {
    return NextResponse.json({error:error.message || 'SMTP test failed.'},{status:400});
  }
}

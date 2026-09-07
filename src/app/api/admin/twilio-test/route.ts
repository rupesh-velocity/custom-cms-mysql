import { NextResponse } from 'next/server';
import { isAdministratorSession } from '@/lib/admin-auth';
import { sendTwilioVerification } from '@/lib/twilio';

export async function POST(req:Request) {
  if (!(await isAdministratorSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const {phone}=await req.json();
    if(!phone) return NextResponse.json({error:'Enter a test phone number in E.164 format.'},{status:400});
    await sendTwilioVerification(String(phone));
    return NextResponse.json({success:true});
  } catch(error:any) {
    return NextResponse.json({error:error.message||'Twilio test failed.'},{status:400});
  }
}

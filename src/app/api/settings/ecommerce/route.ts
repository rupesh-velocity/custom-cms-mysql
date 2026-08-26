import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allowedKeys = [
      'stripeEnabled', 'stripeMode', 'stripeTestPublicKey', 'stripeTestSecretKey',
      'stripeLivePublicKey', 'stripeLiveSecretKey', 'paypalEnabled', 'paypalClientId',
      'zelleEnabled', 'zellePhone', 'zelleQrCodeUrl',
      'currency', 'adminEmail', 'storeAddress1', 'storeAddress2', 'storeCity',
      'storeState', 'storeZip', 'storeCountry', 'sellingLocation', 'specificSellingCountries',
      'storePhone', 'storePublicEmail', 'enableTaxes', 'emailSenderName', 'emailLogoUrl',
      'emailTemplateSuccess', 'emailTemplateFailed', 'emailTemplateCancelled',
      'emailPrimaryColor', 'emailSubjectSuccess', 'emailSubjectFailed', 
      'emailSubjectCancelled'
    ];
    
    const settings = await prisma.setting.findMany({
      where: { key: { in: allowedKeys } }
    });
    
    const result: any = {};
    settings.forEach(s => {
      result[s.key] = s.value || '';
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        await prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

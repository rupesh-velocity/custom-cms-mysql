import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { itemId, type } = await req.json();

    if (!itemId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Fetch item details
    let amount = 0;
    if (type === 'course') {
      const course = await prisma.course.findUnique({ where: { id: parseInt(itemId) } });
      if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      amount = course.salePrice || course.price || 0;
    } else {
      const product = await prisma.product.findUnique({ where: { id: parseInt(itemId) } });
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      amount = product.salePrice || product.price || 0;
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // 2. Fetch Stripe settings
    const settings = await prisma.setting.findMany();
    const settingsObj = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    if (settingsObj.stripeEnabled !== 'true') {
      return NextResponse.json({ error: 'Stripe payments are not enabled' }, { status: 400 });
    }

    const mode = settingsObj.stripeMode || 'test';
    const secretKey = mode === 'live' ? settingsObj.stripeLiveSecretKey : settingsObj.stripeTestSecretKey;
    const publicKey = mode === 'live' ? settingsObj.stripeLivePublicKey : settingsObj.stripeTestPublicKey;

    if (!secretKey || !publicKey) {
      return NextResponse.json({ error: 'Stripe is not configured correctly (missing keys)' }, { status: 400 });
    }

    // 3. Initialize Stripe and create PaymentIntent
    // Stripe expects amount in cents
    const amountInCents = Math.round(amount * 100);
    
    // We can use latest api version, or not specify it if typescript allows.
    // The stripe node library requires apiVersion to be string if provided, but default is fine.
    const stripe = new Stripe(secretKey, {
      apiVersion: '2026-06-24.dahlia' as any, // Bypass strict type check if needed, or use exact literal
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: (settingsObj.currency || 'USD').toLowerCase(),
      metadata: {
        itemId: itemId.toString(),
        itemType: type,
      },
    });

    let allowedCountries: string[] | undefined = undefined;
    if (settingsObj.sellingLocation === 'specific') {
      try {
        const parsed = JSON.parse(settingsObj.specificSellingCountries || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          allowedCountries = parsed;
        }
      } catch (e) {}
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: publicKey,
      allowedCountries,
      zelleEnabled: settingsObj.zelleEnabled === 'true',
      zellePhone: settingsObj.zellePhone || '',
      zelleQrCodeUrl: settingsObj.zelleQrCodeUrl || '',
    });
  } catch (error: any) {
    console.error('Stripe PaymentIntent Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

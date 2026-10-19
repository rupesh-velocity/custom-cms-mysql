import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export type StripeSettings = {
  stripe: Stripe;
  publishableKey: string;
  currency: string;
  zelleEnabled: boolean;
  zellePhone: string;
  zelleQrCodeUrl: string;
  allowedCountries?: string[];
  mode: string;
};

export async function getStripeSettings(): Promise<StripeSettings> {
  const settings = await prisma.setting.findMany();
  const settingsObj = settings.reduce((acc: Record<string, string>, setting) => {
    acc[setting.key] = setting.value || '';
    return acc;
  }, {});

  if (settingsObj.stripeEnabled !== 'true') {
    throw new Error('Stripe payments are not enabled');
  }

  const mode = settingsObj.stripeMode || 'test';
  const secretKey = mode === 'live' ? settingsObj.stripeLiveSecretKey : settingsObj.stripeTestSecretKey;
  const publishableKey = mode === 'live' ? settingsObj.stripeLivePublicKey : settingsObj.stripeTestPublicKey;

  if (!secretKey || !publishableKey) {
    throw new Error('Stripe is not configured correctly (missing keys)');
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2026-06-24.dahlia' as any,
  });

  let allowedCountries: string[] | undefined;
  if (settingsObj.sellingLocation === 'specific') {
    try {
      const parsed = JSON.parse(settingsObj.specificSellingCountries || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        allowedCountries = parsed;
      }
    } catch (e) {}
  }

  return {
    stripe,
    publishableKey,
    currency: (settingsObj.currency || 'USD').toLowerCase(),
    zelleEnabled: settingsObj.zelleEnabled === 'true',
    zellePhone: settingsObj.zellePhone || '',
    zelleQrCodeUrl: settingsObj.zelleQrCodeUrl || '',
    allowedCountries,
    mode,
  };
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_COURSE_WEBHOOK_SECRET || '';
}

'use client';

import { useState } from 'react';

type Props = {
  subscriptionId: number;
  status: string;
  cancelAtPeriodEnd?: boolean | null;
  variant?: 'account' | 'admin';
  accessExpired?: boolean;
  renewHref?: string;
};

function isManageableStatus(status: string) {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'ACTIVE' || normalized === 'TRIALING' || normalized === 'PAST_DUE';
}

export default function SubscriptionActions({
  subscriptionId,
  status,
  cancelAtPeriodEnd = false,
  variant = 'account',
  accessExpired = false,
  renewHref,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canManage = isManageableStatus(status);

  async function runAction(action: 'cancel_at_period_end' | 'resume') {
    setLoading(action);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to update subscription.');
      }

      setMessage(data?.message || 'Subscription updated.');
      setTimeout(() => window.location.reload(), 900);
    } catch (err: any) {
      setError(err?.message || 'Unable to update subscription.');
    } finally {
      setLoading(null);
    }
  }

  const shouldShowRenewAccess = Boolean(cancelAtPeriodEnd && accessExpired && renewHref);

  if (!canManage && !shouldShowRenewAccess) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {shouldShowRenewAccess ? (
        <a
          href={renewHref}
          className="inline-flex items-center justify-center rounded-xl bg-[#5e3fde] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#4b2fd6]"
        >
          Renew Access
        </a>
      ) : canManage ? (
        cancelAtPeriodEnd ? (
          accessExpired ? null : (
            <button
              type="button"
              onClick={() => runAction('resume')}
              disabled={Boolean(loading)}
              className="inline-flex items-center justify-center rounded-xl bg-[#5e3fde] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#4b2fd6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === 'resume' ? 'Updating...' : 'Resume Auto Renewal'}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => runAction('cancel_at_period_end')}
            disabled={Boolean(loading)}
            className="inline-flex items-center justify-center rounded-xl border border-[#5e3fde]/25 bg-white px-4 py-2 text-xs font-bold text-[#5e3fde] transition hover:border-[#5e3fde] hover:bg-[#5e3fde]/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === 'cancel_at_period_end' ? 'Updating...' : 'Cancel Auto Renewal'}
          </button>
        )
      ) : null}

      {message ? <p className="w-full text-right text-xs font-semibold text-green-700">{message}</p> : null}
      {error ? <p className="w-full text-right text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

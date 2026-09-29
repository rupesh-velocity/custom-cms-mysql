'use client';

import Link from 'next/link';
import { Eye, RotateCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';
import { useState } from 'react';

type Props = {
  orderId: number;
  isTrash?: boolean;
};

export default function OrderListActions({ orderId, isTrash = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const updateStatus = async (status: string, successMessage: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to update order');
      }

      toast.success(successMessage);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const moveToTrash = async () => {
    if (!window.confirm('Move this order to trash? If this order granted course access, access linked to this order will be revoked.')) {
      return;
    }
    await updateStatus('TRASH', 'Order moved to trash');
  };

  const restoreOrder = async () => {
    await updateStatus('PENDING', 'Order restored to pending');
  };

  const deletePermanently = async () => {
    if (!window.confirm('Permanently delete this order? This cannot be undone.')) {
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to delete order');
      }
      toast.success('Order permanently deleted');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (isTrash) {
    return (
      <div className="inline-flex items-center justify-end gap-2">
        <Link
          href={`/admin/orders/${orderId}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-[#5e3fde] hover:bg-[#f4f1ff] hover:border-[#d8cffd] transition-colors"
          title="View order"
        >
          <Eye size={16} />
        </Link>
        <button
          type="button"
          onClick={restoreOrder}
          disabled={busy}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          title="Restore order"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={deletePermanently}
          disabled={busy}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          title="Delete permanently"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-end gap-2">
      <Link
        href={`/admin/orders/${orderId}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-[#5e3fde] hover:bg-[#f4f1ff] hover:border-[#d8cffd] transition-colors"
        title="View order"
      >
        <Eye size={16} />
      </Link>
      <button
        type="button"
        onClick={moveToTrash}
        disabled={busy}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        title="Move to trash"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

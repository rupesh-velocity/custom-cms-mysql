'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

type Props = {
  isTrash?: boolean;
  children: ReactNode;
};

export default function OrderBulkForm({ isTrash = false, children }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const selectAll = (checked: boolean) => {
    document.querySelectorAll<HTMLInputElement>('input[name="orderIds"]').forEach((checkbox) => {
      checkbox.checked = checked;
    });
  };

  const runBulkAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const action = String(formData.get('bulkAction') || '');
    const ids = formData.getAll('orderIds').map((id) => Number(id)).filter(Boolean);

    if (!action) {
      toast.error('Please select a bulk action');
      return;
    }

    if (ids.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    const actionLabels: Record<string, string> = {
      trash: 'move selected order(s) to trash',
      pending: 'mark selected order(s) as pending',
      completed: 'mark selected order(s) as completed',
      restore: 'restore selected order(s) to pending',
      delete: 'permanently delete selected order(s)',
    };

    if (!window.confirm(`Are you sure you want to ${actionLabels[action] || 'apply this action'}?`)) {
      return;
    }

    setBusy(true);
    try {
      for (const id of ids) {
        if (action === 'delete') {
          const res = await fetch(`${BASE_PATH}/api/orders/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Unable to delete order #${id}`);
          }
          continue;
        }

        const nextStatus = action === 'trash'
          ? 'TRASH'
          : action === 'restore' || action === 'pending'
            ? 'PENDING'
            : action === 'completed'
              ? 'COMPLETED'
              : '';

        if (!nextStatus) {
          throw new Error('Invalid bulk action');
        }

        const res = await fetch(`${BASE_PATH}/api/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Unable to update order #${id}`);
        }
      }

      toast.success('Bulk action completed');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Unable to complete bulk action');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={runBulkAction}>
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100 bg-white">
        <select
          name="bulkAction"
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 min-w-[170px] focus:outline-none focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde]"
          defaultValue=""
          disabled={busy}
        >
          <option value="">Bulk actions</option>
          {isTrash ? (
            <>
              <option value="restore">Restore</option>
              <option value="delete">Delete permanently</option>
            </>
          ) : (
            <>
              <option value="trash">Move to trash</option>
              <option value="pending">Mark as pending</option>
              <option value="completed">Mark as completed</option>
            </>
          )}
        </select>
        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Apply
        </button>
        <label className="ml-auto hidden items-center gap-2 text-xs text-gray-500 sm:flex">
          <input
            type="checkbox"
            onChange={(event) => selectAll(event.currentTarget.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#5e3fde] focus:ring-[#5e3fde]"
          />
          Select all visible
        </label>
      </div>
      {children}
    </form>
  );
}

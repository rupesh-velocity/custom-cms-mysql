'use client';

import Link from 'next/link';
import { Edit, Loader2, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

type Candidate = {
  id: number;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

type ContentCounts = {
  pages: number;
  posts: number;
  courses: number;
  products: number;
  forms: number;
};

function label(user: Candidate) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName ? `${fullName} (${user.username})` : `${user.username} (${user.email})`;
}

export default function UserActions({
  user,
  candidates,
  counts,
}: {
  user: Candidate;
  candidates: Candidate[];
  counts: ContentCounts;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const available = candidates.filter((candidate) => candidate.id !== user.id);
  const [mode, setMode] = useState<'reassign' | 'delete'>(available.length ? 'reassign' : 'delete');
  const [reassignTo, setReassignTo] = useState<number>(available[0]?.id || 0);
  const total = useMemo(() => Object.values(counts).reduce((sum, value) => sum + value, 0), [counts]);

  const remove = async () => {
    if (mode === 'reassign' && !reassignTo) {
      toast.error('Select a user to receive the authored content.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${BASE_PATH}/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentAction: mode, reassignTo }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not delete user');
      toast.success('User deleted');
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex justify-end items-center gap-3">
        <Link href={`/admin/users/${user.id}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit user">
          <Edit size={18} />
        </Link>
        <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete user">
          <Trash2 size={18} />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delete user: {label(user)}</h2>
                <p className="text-sm text-gray-500 mt-1">Choose what should happen to content authored by this account.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><X size={18}/></button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Object.entries(counts).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center">
                    <div className="text-lg font-semibold text-gray-900">{value}</div>
                    <div className="text-[11px] text-gray-500 capitalize">{key}</div>
                  </div>
                ))}
              </div>

              {total === 0 ? (
                <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">This user has no authored Pages, Posts, Courses, Products or Forms.</div>
              ) : null}

              {available.length > 0 ? (
                <label className={`block rounded-xl border p-4 cursor-pointer ${mode === 'reassign' ? 'border-[#5e3fde] bg-[#5e3fde]/5' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <input type="radio" name="delete-mode" checked={mode === 'reassign'} onChange={() => setMode('reassign')} className="mt-1" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Assign all authored content to another user</div>
                      <p className="text-xs text-gray-500 mt-1">Recommended. Pages, Posts, Courses, Products and Forms keep their content and receive a new author.</p>
                      {mode === 'reassign' ? (
                        <select value={reassignTo} onChange={(e) => setReassignTo(Number(e.target.value))} className="mt-3 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                          {available.map((candidate) => <option key={candidate.id} value={candidate.id}>{label(candidate)}</option>)}
                        </select>
                      ) : null}
                    </div>
                  </div>
                </label>
              ) : null}

              <label className={`block rounded-xl border p-4 cursor-pointer ${mode === 'delete' ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  <input type="radio" name="delete-mode" checked={mode === 'delete'} onChange={() => setMode('delete')} className="mt-1" />
                  <div>
                    <div className="font-medium text-gray-900">Delete authored content</div>
                    <p className="text-xs text-gray-500 mt-1">Deletes this user’s authored Pages, Posts, Courses, Products and Forms. Orders/customer history is not reassigned or deleted by this option.</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} disabled={busy} className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700">Cancel</button>
              <button onClick={remove} disabled={busy} className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>} Confirm Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

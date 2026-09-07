'use client';

import { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function RevisionHistory({ type, id, enabled = true }: { type: 'page'|'post', id: string|number, enabled?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const router = useRouter();

  const load = async () => {
    const res = await fetch(`${BASE_PATH}/api/revisions/${type}/${id}`, { cache: 'no-store' });
    if (res.ok) setItems(await res.json());
  };
  useEffect(() => { if (enabled) load(); }, [id, enabled]);

  if (!enabled) return null;

  const restore = async (revisionId: number) => {
    if (!confirm('Restore this revision? The current version will be saved as a new revision first on your next update.')) return;
    setBusy(revisionId);
    const res = await fetch(`${BASE_PATH}/api/revisions/${type}/${id}`, {
      method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ revisionId })
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Revision restored');
      router.refresh();
      window.location.reload();
    } else toast.error(data.error || 'Restore failed');
    setBusy(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-800 hover:bg-gray-50">
        <span className="flex items-center gap-2"><History size={16}/> Revision History</span>
        <span className="text-xs text-gray-500">{items.length}</span>
      </button>
      {open && <div className="border-t border-gray-100 max-h-72 overflow-y-auto">
        {items.length === 0 ? <p className="p-4 text-xs text-gray-500">No revisions yet. A snapshot is created before each update.</p> :
          items.map(item => <div key={item.id} className="p-3 border-b border-gray-100 last:border-0 text-xs">
            <div className="font-medium text-gray-800">{new Date(item.createdAt).toLocaleString()}</div>
            <div className="text-gray-500 mt-1">{item.authorName || 'System'} · {item.title}</div>
            <button type="button" disabled={busy===item.id} onClick={() => restore(item.id)} className="mt-2 text-[#5e3fde] hover:underline inline-flex items-center gap-1">
              <RotateCcw size={12}/> {busy===item.id ? 'Restoring…' : 'Restore'}
            </button>
          </div>)
        }
      </div>}
    </div>
  );
}

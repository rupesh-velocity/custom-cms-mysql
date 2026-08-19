'use client';

import { useRouter } from 'next/navigation';
import { Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { BASE_PATH } from '@/lib/config';

export default function ActionButtons({ id, type }: { id: number, type: 'posts' | 'pages' | 'users' }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      const res = await fetch(`${BASE_PATH}/api/${type}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred');
    }
  };

  return (
    <div className="flex justify-end items-center gap-3">
      <Link href={`/admin/${type}/${id}`} className="text-gray-400 hover:text-blue-600 transition-colors">
        <Edit size={18} />
      </Link>
      <button onClick={handleDelete} className="text-gray-400 hover:text-red-600 transition-colors">
        <Trash2 size={18} />
      </button>
    </div>
  );
}

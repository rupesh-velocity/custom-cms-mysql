'use client';

import { useRouter } from 'next/navigation';

export default function FormSwitcher({ forms, activeFormId, status }: { forms: {id: number, title: string}[], activeFormId: number, status: string }) {
  const router = useRouter();
  
  return (
    <select 
      value={activeFormId}
      onChange={(e) => router.push(`/admin/forms/entries?form_id=${e.target.value}&status=${status}`)}
      className="bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm font-medium text-gray-700 min-w-[200px] focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde]"
    >
      {forms.map(f => (
        <option key={f.id} value={f.id}>{f.title}</option>
      ))}
    </select>
  );
}

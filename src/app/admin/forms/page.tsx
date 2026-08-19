import { prisma } from '@/lib/prisma';
import AdminListClient from '@/components/AdminListClient';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const whereClause = params.status ? { status: params.status } : {};
  
  const forms = await prisma.form.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: { author: true }
  });

  return (
    <div className="max-w-[1200px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Forms</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/admin/forms" className={!params.status ? 'text-gray-900 font-semibold' : 'text-[#5e3fde] hover:underline'}>
              All <span className="text-gray-500 font-normal">({await prisma.form.count()})</span>
            </Link>
            <Link href="/admin/forms?status=Published" className={params.status === 'Published' ? 'text-gray-900 font-semibold' : 'text-[#5e3fde] hover:underline'}>
              Published <span className="text-gray-500 font-normal">({await prisma.form.count({ where: { status: 'Published' } })})</span>
            </Link>
            <Link href="/admin/forms?status=Draft" className={params.status === 'Draft' ? 'text-gray-900 font-semibold' : 'text-[#5e3fde] hover:underline'}>
              Drafts <span className="text-gray-500 font-normal">({await prisma.form.count({ where: { status: 'Draft' } })})</span>
            </Link>
            <Link href="/admin/forms?status=Trash" className={params.status === 'Trash' ? 'text-gray-900 font-semibold' : 'text-[#5e3fde] hover:underline'}>
              Trash <span className="text-gray-500 font-normal">({await prisma.form.count({ where: { status: 'Trash' } })})</span>
            </Link>
          </div>
        </div>
        <Link 
          href="/admin/forms/new"
          className="bg-[#5e3fde] !text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4b32b2] transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Add Form
        </Link>
      </div>
      
      <AdminListClient items={forms} type="forms" />
    </div>
  );
}

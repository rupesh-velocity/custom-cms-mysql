import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import AdminListClient from '@/components/AdminListClient';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PagesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const statusFilter = params?.status || 'All';

  const whereClause = statusFilter !== 'All' ? { status: statusFilter } : { status: { not: 'Trash' } };

  const [allCount, publishedCount, draftCount, trashCount] = await Promise.all([
    prisma.page.count({ where: { status: { not: 'Trash' } } }),
    prisma.page.count({ where: { status: 'Published' } }),
    prisma.page.count({ where: { status: 'Draft' } }),
    prisma.page.count({ where: { status: 'Trash' } }),
  ]);

  const pages = await prisma.page.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: { author: true }
  });

  return (
    <div className="max-w-[1200px]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
        </div>
        <Link 
          href="/admin/pages/new"
          className="bg-[#5e3fde] !text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4b32b2] transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Add Page
        </Link>
      </div>

      <div className="flex text-[14px] mb-4 text-[#50575e]">
        <Link href="/admin/pages" className={statusFilter === 'All' ? 'font-semibold text-gray-900' : 'text-[#5e3fde] hover:underline'}>All <span className="text-gray-500 font-normal">({allCount})</span></Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/admin/pages?status=Published" className={statusFilter === 'Published' ? 'font-semibold text-gray-900' : 'text-[#5e3fde] hover:underline'}>Published <span className="text-gray-500 font-normal">({publishedCount})</span></Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/admin/pages?status=Draft" className={statusFilter === 'Draft' ? 'font-semibold text-gray-900' : 'text-[#5e3fde] hover:underline'}>Draft <span className="text-gray-500 font-normal">({draftCount})</span></Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/admin/pages?status=Trash" className={statusFilter === 'Trash' ? 'font-semibold text-gray-900' : 'text-[#5e3fde] hover:underline'}>Trash <span className="text-gray-500 font-normal">({trashCount})</span></Link>
      </div>

      <AdminListClient items={pages} type="pages" />
    </div>
  );
}

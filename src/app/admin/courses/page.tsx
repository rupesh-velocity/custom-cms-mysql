import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import AdminListClient from '@/components/AdminListClient';
import { Plus } from 'lucide-react';

export const dynamic='force-dynamic';

export default async function CoursesPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const params=await searchParams;const statusFilter=params?.status||'All';
  const whereClause=statusFilter!=='All'?{status:statusFilter}:{status:{not:'Trash'}};
  const [allCount,publishedCount,draftCount,trashCount,courses]=await Promise.all([
    prisma.course.count({where:{status:{not:'Trash'}}}),prisma.course.count({where:{status:'Published'}}),prisma.course.count({where:{status:'Draft'}}),prisma.course.count({where:{status:'Trash'}}),
    prisma.course.findMany({where:whereClause,orderBy:{createdAt:'desc'},include:{author:true}})
  ]);
  return <div className="max-w-[1200px]">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5"><div><h1 className="text-2xl font-bold text-gray-900">Courses</h1><p className="text-sm text-gray-500 mt-1.5">Create and manage course content, curriculum, pricing and publishing.</p></div><Link href="/admin/courses/new" className="bg-[#5e3fde] !text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4b32b2] transition-colors flex items-center gap-2"><Plus size={17}/> Add Course</Link></div>
    <div className="flex flex-wrap text-[14px] mb-4 text-[#50575e]">
      <Link href="/admin/courses" className={statusFilter==='All'?'font-semibold text-gray-900':'text-[#5e3fde] hover:underline'}>All <span className="text-gray-500 font-normal">({allCount})</span></Link><span className="mx-2 text-gray-300">|</span>
      <Link href="/admin/courses?status=Published" className={statusFilter==='Published'?'font-semibold text-gray-900':'text-[#5e3fde] hover:underline'}>Published <span className="text-gray-500 font-normal">({publishedCount})</span></Link><span className="mx-2 text-gray-300">|</span>
      <Link href="/admin/courses?status=Draft" className={statusFilter==='Draft'?'font-semibold text-gray-900':'text-[#5e3fde] hover:underline'}>Draft <span className="text-gray-500 font-normal">({draftCount})</span></Link><span className="mx-2 text-gray-300">|</span>
      <Link href="/admin/courses?status=Trash" className={statusFilter==='Trash'?'font-semibold text-gray-900':'text-[#5e3fde] hover:underline'}>Trash <span className="text-gray-500 font-normal">({trashCount})</span></Link>
    </div>
    <AdminListClient items={courses} type="courses"/>
  </div>;
}

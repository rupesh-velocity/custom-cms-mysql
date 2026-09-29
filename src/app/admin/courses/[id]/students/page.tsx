import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

function status(expiresAt?: Date | null) {
  return !expiresAt || expiresAt.getTime() > Date.now() ? 'Active' : 'Expired';
}

export default async function CourseStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = Number(id);
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) notFound();

  const access = await prisma.userCourseAccess.findMany({
    where: { courseId },
    include: { user: true, courseAccessPlan: true, order: { select: { orderNumber: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return <div className="max-w-[1100px]">
    <div className="flex items-start justify-between gap-4 mb-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Course Students</h1><p className="text-sm text-gray-500 mt-1">{course.title}</p></div>
      <Link href={`/admin/courses/${course.id}/edit`} className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Back to Course</Link>
    </div>
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-gray-50 border-b border-gray-100"><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Source</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Expires</th><th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {access.map((record)=><tr key={record.id} className="hover:bg-gray-50/50"><td className="px-5 py-4"><Link href={`/admin/users/${record.userId}`} className="font-semibold text-[#5e3fde] hover:underline">{record.user.firstName || record.user.lastName ? `${record.user.firstName || ''} ${record.user.lastName || ''}`.trim() : record.user.email}</Link><div className="text-xs text-gray-500 mt-1">{record.user.email}</div></td><td className="px-5 py-4 text-sm text-gray-700">{record.courseAccessPlan?.name || 'Simple / Legacy'}</td><td className="px-5 py-4 text-sm text-gray-700 capitalize">{record.source || 'legacy'}{record.order?.orderNumber ? <div className="text-xs text-gray-500">{record.order.orderNumber}</div> : null}</td><td className="px-5 py-4 text-sm text-gray-700">{record.expiresAt ? record.expiresAt.toLocaleDateString() : 'Lifetime'}</td><td className="px-5 py-4"><span className={`text-xs font-bold rounded-full px-3 py-1 ${status(record.expiresAt)==='Active'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{status(record.expiresAt)}</span></td></tr>)}
          {access.length===0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-500">No students have access to this course yet.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}

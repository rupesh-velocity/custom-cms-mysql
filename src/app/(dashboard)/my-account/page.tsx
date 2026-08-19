import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MyAccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('cms_session')?.value;
  
  if (!token) {
    redirect('/login?redirect=/my-account');
  }

  let userId: number | null = null;
  let user: any = null;
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
    );
    const { payload } = await jwtVerify(token, secret);
    userId = payload.id as number;
    
    user = await prisma.user.findUnique({
      where: { id: userId }
    });
  } catch (error) {
    redirect('/login?redirect=/my-account');
  }

  if (!user) {
    redirect('/login?redirect=/my-account');
  }

  // Fetch courses user has access to
  const accessRecords = await prisma.userCourseAccess.findMany({
    where: { userId: userId },
    include: { course: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-[#2c3338]">


      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">My Dashboard</h1>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">My Courses</h2>
          
          {accessRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              </div>
              <p className="text-gray-500 mb-4">You haven't purchased any courses yet.</p>
              <Link href="/shop" className="inline-block bg-[#5e3fde] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#4b32b2] transition-colors">
                Browse Shop
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accessRecords.map((record) => (
                <Link 
                  href={`/courses/${record.course.slug}`} 
                  key={record.id}
                  className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#5e3fde] hover:shadow-lg transition-all"
                >
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    {record.course.featuredImage ? (
                      <img src={record.course.featuredImage} alt={record.course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#5e3fde]/10 text-[#5e3fde]">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 group-hover:text-[#5e3fde] transition-colors">{record.course.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      Purchased on {new Date(record.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

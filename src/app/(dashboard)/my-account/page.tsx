import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PageHeroBanner from '@/components/PageHeroBanner';

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
    <div className="min-h-screen bg-[#f8f9fa] font-body text-body relative overflow-hidden">
      
      {/* Dashboard Header using their standard page-banner style */}
      <PageHeroBanner 
        title={`Welcome back, ${user.firstName || user.username}!`}
        description="Manage your enrolled courses"
      />

      <main className="section-padding relative z-10">
        <div className="container max-w-6xl mx-auto">
          
          <div className="bg-white rounded-[12px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-[#f0f0f0] overflow-hidden p-8 md:p-12 relative -mt-8">
            <div className="mb-10 text-left border-b border-[#f0f0f0] pb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--purple)]/10 flex items-center justify-center text-[var(--purple)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              </div>
              <h2 className="font-heading text-[var(--purple)] text-[24px]">Enrolled Courses</h2>
            </div>
            
            <div className="">
              {accessRecords.length === 0 ? (
                <div className="shop-empty-state flex flex-col items-center justify-center text-center py-12">
                  <div className="shop-empty-icon flex justify-center mb-4">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  </div>
                  <h3 className="shop-empty-title mb-4">No courses yet</h3>
                  <p className="shop-empty-desc text-center" style={{ marginBottom: '24px' }}>
                    You haven't purchased or enrolled in any courses yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {accessRecords.map((record) => (
                    <Link 
                      href={`/courses/${record.course.slug}`} 
                      key={record.id}
                      className="blog-post-card group flex flex-col h-full"
                    >
                      <div className="blog-post-img-wrap w-full aspect-[4/3] bg-[#f9fafb]">
                        {record.course.featuredImage ? (
                          <img src={record.course.featuredImage} alt={record.course.title} className="blog-post-img" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#f6f6f6] text-[var(--purple)]">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                          </div>
                        )}
                        
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 bg-black/10">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-[var(--pink)] shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <div className="blog-post-category text-[var(--purple)] mb-2">
                          <span>Course</span>
                        </div>
                        <h3 className="blog-post-title group-hover:text-[var(--pink)] line-clamp-2 mb-4">
                          {record.course.title}
                        </h3>
                        <div className="mt-auto pt-4 border-t border-[#f0f0f0]">
                          <div className="recent-post-date">
                            Enrolled: {new Date(record.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
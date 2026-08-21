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
    <div className="min-h-screen bg-light font-body text-body">
      {/* Dashboard Header using their standard page-banner style */}
      

      <main className="section-padding">
        <div className="container">
          
          <div className="bg-white rounded-[12px] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-[#f0f0f0] overflow-hidden">
            <div className="px-8 py-6 border-b border-[#f0f0f0] bg-[#f8f9fa]">
              <h2 className="font-heading text-heading text-[24px]">My Courses</h2>
            </div>
            
            <div className="p-8">
              {accessRecords.length === 0 ? (
                <div className="shop-empty-state text-center">
                  <div className="shop-empty-icon flex justify-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  </div>
                  <h3 className="shop-empty-title">No courses yet</h3>
                  <p className="shop-empty-desc mx-auto mb-8">You haven't purchased or enrolled in any courses yet. Explore our library to get started.</p>
                  <Link href="/shop" className="theme-btn theme-btn-blue">
                    <span>Browse Course Library</span>
                  </Link>
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
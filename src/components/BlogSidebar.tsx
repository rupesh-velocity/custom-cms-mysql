import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function BlogSidebar() {
  const recentPosts = await prisma.post.findMany({
    where: { status: 'Published' },
    orderBy: { publishedAt: 'desc' },
    take: 5,
  });

  return (
    <aside className="w-full lg:w-[320px] shrink-0 space-y-8 blog-sidebar">
      {/* Search Widget */}
        <div className="blog-sidebar-widget">
        <h3 className="blog-sidebar-title">Search</h3>
        <form action="/search" method="GET" className="blog-search-form">
          <input 
            type="text" 
            name="q" 
            placeholder="Search posts..." 
            className="blog-search-input"
            required
          />
          <button type="submit" className="blog-search-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        </form>
      </div>

      {/* Recent Posts Widget */}
       <div className="blog-sidebar-widget">
        <h3 className="blog-sidebar-title">Recent Posts</h3>
        <div className="recent-posts-list">
          {recentPosts.length > 0 ? recentPosts.map(post => (
            <div key={post.id}>
              <Link href={`/${post.slug}`} className="recent-post-item">
                <h4 className="recent-post-title">
                  {post.title}
                </h4>
                <p className="recent-post-date">
                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </Link>
            </div>
          )) : (
            <p className="text-gray-500 text-sm">No posts yet.</p>
          )}
        </div>
      </div>
    </aside>
  );
}

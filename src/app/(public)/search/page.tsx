import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import BlogSidebar from '@/components/BlogSidebar';
import PageHeroBanner from '@/components/PageHeroBanner';
import BodyClassInjector from '@/components/BodyClassInjector';

export const dynamic = 'force-dynamic';

export default async function SearchPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const q = searchParams.q || '';
  
  const posts = await prisma.post.findMany({
    where: {
      status: 'Published',
      visibility: 'Public',
      OR: [
        { title: { contains: q } },
        { contentText: { contains: q } }
      ]
    },
    orderBy: { publishedAt: 'desc' },
    include: { author: true, categories: true }
  });

  const pages = await prisma.page.findMany({
    where: {
      status: 'Published',
      visibility: 'Public',
      OR: [
        { title: { contains: q } },
        { contentText: { contains: q } }
      ]
    },
    orderBy: { publishedAt: 'desc' },
    include: { author: true }
  });

  const allResults = [...posts.map(p => ({...p, __type: 'post'})), ...pages.map(p => ({...p, __type: 'page'}))].sort((a: any, b: any) => {
    const dateA = new Date(a.publishedAt || a.createdAt).getTime();
    const dateB = new Date(b.publishedAt || b.createdAt).getTime();
    return dateB - dateA;
  });

  return (
    <>
      <BodyClassInjector type="search" />
      <div className="min-h-screen w-full pb-16">
        <PageHeroBanner 
        title={`Search Results for "${q}"`}
        description={`Found ${allResults.length} ${allResults.length === 1 ? 'result' : 'results'}`}
      />

      <div className="max-w-[1200px] mx-auto px-4 flex flex-col lg:flex-row gap-12 mt-12">
        <div className="flex-1 min-w-0">
          {allResults.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No results found</h2>
              <p className="text-gray-500 text-lg">Sorry, but nothing matched your search terms. Please try again with some different keywords.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {allResults.map((post: any) => (
                <article key={`${post.__type}-${post.id}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col sm:flex-row overflow-hidden group/card">
                  {post.featuredImage && (
                    <Link href={`/${post.slug}`} className="block w-full sm:w-1/3 lg:w-[30%] shrink-0 overflow-hidden relative">
                      <div className="absolute inset-0">
                        <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700" />
                      </div>
                      <div className="w-full pb-[56.25%] sm:pb-0"></div>
                    </Link>
                  )}
                  <div className="flex-1 min-w-0 p-6 sm:p-8 flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-[#5e3fde] font-semibold mb-2">
                      {post.categories?.map((cat: any, i: number) => (
                        <span key={cat.id}>
                          <Link href={`/category/${cat.slug}`} className="hover:underline">{cat.name}</Link>
                          {i < post.categories.length - 1 ? ' â€¢ ' : ''}
                        </span>
                      ))}
                    </div>
                    <Link href={`/${post.slug}`} className="block group">
                      <h2 className="text-2xl font-bold text-gray-900 group-hover:text-[#5e3fde] transition-colors mb-3 font-outfit leading-tight">
                        {post.title}
                      </h2>
                    </Link>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-4 font-medium">
                      {post.author?.firstName && <span>By {post.author.firstName} {post.author.lastName}</span>}
                      {post.author?.firstName && <span>â€¢</span>}
                      <span>
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <div className="prose prose-blue max-w-none text-gray-700 text-sm md:text-base">
                      <p>{(post.contentText || '').substring(0, 180)}...</p>
                      <Link href={`/${post.slug}`} className="text-[#5e3fde] font-medium hover:underline mt-3 inline-flex items-center gap-1">
                        Read more &rarr;
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        
        <BlogSidebar />
      </div>
    </div>
    </>
  );
}

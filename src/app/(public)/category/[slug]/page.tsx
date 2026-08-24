import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import BlogSidebar from '@/components/BlogSidebar';
import PageHeroBanner from '@/components/PageHeroBanner';
import BodyClassInjector from '@/components/BodyClassInjector';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

import { generateFullMetadata } from '@/lib/seo-metadata';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  
  if (!category) {
    return {
      title: 'Category Not Found',
    };
  }

  return generateFullMetadata({
    title: `${category.name} Archives`,
    rawTitle: `${category.name} Archives`,
    description: `Browse all posts in the ${category.name} category.`,
    rawContentText: `Browse all posts in the ${category.name} category.`,
    category: category.name,
    type: 'website',
    url: `/category/${category.slug}`,
  });
}

export default async function CategoryPage(props: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const slug = params.slug;

  const category = await prisma.category.findUnique({ where: { slug } });

  if (!category) {
    notFound();
  }

  const settingsRecords = await prisma.setting.findMany({
    where: {
      key: { in: ['blog_pages_at_most', 'feed_include'] }
    }
  });

  const settings = settingsRecords.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  const limit = parseInt(settings.blog_pages_at_most || '10');
  const currentPage = parseInt((searchParams?.page as string) || '1') || 1;
  const skip = (currentPage - 1) * limit;

  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get('cms_session');
  
  const visibilityFilter = isLoggedIn ? {} : { visibility: { not: 'Private' } };

  const posts = await prisma.post.findMany({
    where: { 
      status: 'Published',
      ...visibilityFilter,
      categories: {
        some: {
          slug: category.slug
        }
      }
    },
    orderBy: { publishedAt: 'desc' },
    include: { author: true, categories: true },
    skip,
    take: limit,
  });

  const totalPosts = await prisma.post.count({
    where: { 
      status: 'Published',
      ...visibilityFilter,
      categories: {
        some: {
          slug: category.slug
        }
      }
    }
  });
  const totalPages = Math.ceil(totalPosts / limit);

  return (
    <>
      <BodyClassInjector type="category" id={category.id} />
      <div className="min-h-screen w-full pb-16">
        <PageHeroBanner 
        title={category.name} 
        description="Category"
      />

      <div className="max-w-[1200px] mx-auto px-4 flex flex-col lg:flex-row gap-12 mt-12">
        <div className="flex-1 min-w-0">
          {posts.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-gray-100">
              <p className="text-gray-500 text-lg">No posts published in this category yet.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {posts.map((post: any) => (
               <article key={post.id} className="blog-post-card">
                      {post.featuredImage && (
                        <Link href={`/${post.slug}`} className="blog-post-img-wrap">
                          <img src={post.featuredImage} alt={post.title} className="blog-post-img" />
                          <div className="blog-post-img-spacer"></div>
                        </Link>
                      )}
                      <div className="blog-post-content">
                        <div className="blog-post-category">
                          {post.categories?.map((cat: any, i: number) => (
                            <span key={cat.id}>
                              <Link href={`/category/${cat.slug}`}>{cat.name}</Link>
                            </span>
                          ))}
                        </div>
                        <Link href={`/${post.slug}`} className="block group">
                          <h2 className="blog-post-title">
                            {post.title}
                          </h2>
                        </Link>
                        <div className="blog-post-meta">
                          {post.author?.firstName && <span>By {post.author.firstName} {post.author.lastName}</span>}
                          {post.author?.firstName && <span>•</span>}
                          <span>
                            {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </span>
                        </div>
                        
                        {post.visibility === 'Password Protected' && cookieStore.get(`post_pass_${post.id}`)?.value !== post.password ? (
                          <div className="blog-post-excerpt">
                            <p>This content is password protected.</p>
                            <Link href={`/${post.slug}`} className="blog-post-read-more">
                              Enter Password &rarr;
                            </Link>
                          </div>
                        ) : (
                          <div className="blog-post-excerpt">
                            <p>{(post.contentText || '').substring(0, 180)}...</p>
                            <Link href={`/${post.slug}`} className="blog-post-read-more">
                              Read more &rarr;
                            </Link>
                          </div>
                        )}
                      </div>
                    </article>
              ))}

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-8">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Link
                      key={i}
                      href={`/category/${slug}?page=${i + 1}`}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-colors ${
                        currentPage === i + 1 
                          ? 'bg-[#5e3fde] text-white' 
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {i + 1}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        }
        </div>
        
        <BlogSidebar />
      </div>
    </div>
    </>
  );
}

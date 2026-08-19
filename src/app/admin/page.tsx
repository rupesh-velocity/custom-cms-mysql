import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [totalPosts, totalPages, totalUsers, recentPages, recentPosts] = await Promise.all([
    prisma.post.count(),
    prisma.page.count(),
    prisma.user.count(),
    prisma.page.findMany({ orderBy: { updatedAt: 'desc' }, take: 5 }),
    prisma.post.findMany({ orderBy: { updatedAt: 'desc' }, take: 5 }),
  ]);
  
  // Combine and sort recent activity
  const recentActivity = [...recentPages.map(p => ({ ...p, type: 'Page' })), ...recentPosts.map(p => ({ ...p, type: 'Post' }))]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#5e3fde]/10 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome to Velocity CMS</h1>
          <p className="text-gray-500 mt-2 text-lg">Your dashboard is looking great today. Here's what's happening.</p>
        </div>
        <div className="relative z-10">
          <a href="/admin/pages/new" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl !text-white bg-[#5e3fde] hover:bg-[#4b32b2] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5e3fde]">
            + Create New Page
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* At a Glance (Left Column) */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-base font-semibold text-gray-900">At a Glance</h3>
              <div className="flex items-center gap-1 text-gray-400">
                <svg className="w-5 h-5 cursor-pointer hover:text-gray-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                <svg className="w-5 h-5 cursor-pointer hover:text-gray-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M8.707 1.5a1 1 0 00-1.414 0L.683 8.12a1 1 0 00-.274.536l-1.393 7.662a.75.75 0 00.916.866l7.65-1.785a1 1 0 00.485-.22l6.634-6.634a1 1 0 000-1.414l-6-6zM15 4.5l-6 6-2-2 6-6 2 2z" /></svg>
                  <a href="/admin/posts" className="text-[14px] text-[#5e3fde] hover:underline font-medium">{totalPosts} Published posts</a>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                  <a href="/admin/pages" className="text-[14px] text-[#5e3fde] hover:underline font-medium">{totalPages} Published pages</a>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                  <a href="/admin/users" className="text-[14px] text-[#5e3fde] hover:underline font-medium">{totalUsers} Active users</a>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                  <span className="text-[14px] text-gray-600 font-medium">Velocity Theme</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-base font-semibold text-gray-900">Quick Links</h3>
            </div>
            <div className="p-4 grid grid-cols-1 gap-2">
              <a href="/admin/pages/new" className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center group-hover:bg-[#5e3fde] group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Create Page</h4>
                  <p className="text-[12px] text-gray-500">Publish a new static page</p>
                </div>
              </a>
              <a href="/admin/posts/new" className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Write Post</h4>
                  <p className="text-[12px] text-gray-500">Publish a new blog post</p>
                </div>
              </a>
              <a href="/admin/settings/general" className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center group-hover:bg-gray-800 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Settings</h4>
                  <p className="text-[12px] text-gray-500">Configure your platform</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Recent Activity (Right Column) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
              <a href="/admin/pages" className="text-sm font-medium text-[#5e3fde] hover:text-[#4b32b2]">View All</a>
            </div>
            <div className="p-6">
              {recentActivity.length > 0 ? (
                <div className="relative border-l border-gray-200 ml-3 space-y-8 pb-4">
                  {recentActivity.map((item, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-white border-2 border-[#5e3fde] rounded-full -left-[6.5px] top-1.5"></div>
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                        <h4 className="text-[15px] font-semibold text-gray-900">
                          {item.title || '(no title)'} <span className="font-normal text-gray-500 text-sm ml-1">({item.type})</span>
                        </h4>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1 sm:mt-0">
                          {new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(item.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Was updated by <span className="font-medium text-gray-900">Admin</span>. 
                        <a href={`/admin/${item.type.toLowerCase()}s/${item.id}`} className="ml-2 text-[#5e3fde] hover:underline">Edit</a>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No activity</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new page or post.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

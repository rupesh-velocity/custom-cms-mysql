'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Search, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

export default function AdminListClient({ items, type }: { items: any[], type: 'pages' | 'posts' | 'courses' | 'forms' }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>('Admin User');
  const [search, setSearch] = useState('');
  const [bulkAction, setBulkAction] = useState('');
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const router = useRouter();

  const filteredItems = items.filter(item => 
    item.title?.toLowerCase().includes(search.toLowerCase()) || 
    item.author?.firstName?.toLowerCase().includes(search.toLowerCase()) || 
    item.author?.username?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    fetch(`${BASE_PATH}/api/auth/me`)
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          const name = data.user.firstName 
            ? `${data.user.firstName} ${data.user.lastName || ''}`.trim() 
            : data.user.username;
          if (name) setCurrentUserName(name);
        }
      })
      .catch(() => {});

    fetch(`${BASE_PATH}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setGlobalSettings(data);
      })
      .catch(() => {});
  }, []);

  const bulkEditingSetting = type === 'pages' ? globalSettings?.seo_page_bulk_editing : globalSettings?.seo_post_bulk_editing;
  const showSeoDetails = type !== 'forms' && type !== 'courses' && bulkEditingSetting !== 'Disabled';

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleTrash = async (id: number) => {
    try {
      const res = await fetch(`${BASE_PATH}/api/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Trash' })
      });
      if (res.ok) {
        toast.success('Moved to Trash');
        router.refresh();
      }
    } catch (e) {
      toast.error('Error');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      const res = await fetch(`${BASE_PATH}/api/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Draft' })
      });
      if (res.ok) {
        toast.success('Restored from Trash');
        router.refresh();
      }
    } catch (e) {
      toast.error('Error restoring');
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this item?')) return;
    try {
      const res = await fetch(`${BASE_PATH}/api/${type}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Permanently deleted');
        router.refresh();
      }
    } catch (e) {
      toast.error('Error deleting');
    }
  };

  const handleBulkApply = async () => {
    if (selectedIds.length === 0) return;

    if (bulkAction === 'trash') {
      if (!window.confirm(`Are you sure you want to move ${selectedIds.length} items to Trash?`)) return;
      try {
        await Promise.all(selectedIds.map(id => 
          fetch(`${BASE_PATH}/api/${type}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Trash' })
          })
        ));
        toast.success(`Moved ${selectedIds.length} items to Trash`);
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        toast.error('Error moving items to trash');
      }
    } else if (bulkAction === 'restore') {
      try {
        await Promise.all(selectedIds.map(id => 
          fetch(`${BASE_PATH}/api/${type}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Draft' })
          })
        ));
        toast.success(`Restored ${selectedIds.length} items`);
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        toast.error('Error restoring items');
      }
    } else if (bulkAction === 'delete') {
      if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} items?`)) return;
      try {
        await Promise.all(selectedIds.map(id => 
          fetch(`${BASE_PATH}/api/${type}/${id}`, { method: 'DELETE' })
        ));
        toast.success(`Permanently deleted ${selectedIds.length} items`);
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        toast.error('Error deleting items');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm bg-white text-gray-700 focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] transition-all"
          >
            <option value="">Bulk actions</option>
            <option value="trash">Move to Trash</option>
            <option value="restore">Restore</option>
            <option value="delete">Delete Permanently</option>
          </select>
          <button 
            onClick={handleBulkApply}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors font-medium"
          >
            Apply
          </button>
          
          <select className="hidden md:block border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm bg-white text-gray-700 focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] transition-all">
            <option>All dates</option>
          </select>
          
          <select className="hidden lg:block border border-gray-200 rounded-lg px-3 py-2 outline-none text-sm bg-white text-gray-700 focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] transition-all">
            <option>Rank Math</option>
          </select>
          
          <button className="hidden md:block bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors font-medium">
            Filter
          </button>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={`Search ${type}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12 text-center">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={items.length > 0 && selectedIds.length === items.length} 
                  className="rounded text-[#5e3fde] focus:ring-[#5e3fde]" 
                />
              </th>
              <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
              {type !== 'forms' && (
                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">Author</th>
              )}
              <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">Date</th>
              {type === 'forms' && (
                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[20%]">Shortcode</th>
              )}
              {showSeoDetails && (
                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[20%]">SEO Details</th>
              )}
              <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[12%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="py-4 px-6 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(item.id)} 
                    onChange={() => handleSelect(item.id)} 
                    className="rounded text-[#5e3fde] focus:ring-[#5e3fde]" 
                  />
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Link 
                        href={(type === 'courses' || type === 'forms') ? `/admin/${type}/${item.id}/edit` : `/admin/${type}/${item.id}`} 
                        className="font-medium text-gray-900 hover:text-[#5e3fde] text-[15px]"
                      >
                        {item.title || '(no title)'}
                      </Link>
                      {item.status !== 'Published' && item.status !== 'Trash' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {item.status}
                        </span>
                      )}
                    </div>
                    {item.status === 'Trash' && (
                      <div className="flex items-center gap-2 text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleRestore(item.id)} className="text-[#0071a1] hover:underline font-medium">Restore</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => handlePermanentDelete(item.id)} className="text-[#b32d2e] hover:underline font-medium">Delete Permanently</button>
                      </div>
                    )}
                    {type === 'forms' && item.status !== 'Trash' && (
                       <div className="text-[12px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/admin/forms/${item.id}/submissions`} className="text-[#0071a1] hover:underline font-medium">View Submissions</Link>
                       </div>
                    )}
                  </div>
                </td>
                {type !== 'forms' && (
                  <td className="py-4 px-6">
                    <span className="text-sm font-medium text-[#5e3fde] hover:underline cursor-pointer">
                      {item.author ? (item.author.firstName ? `${item.author.firstName} ${item.author.lastName || ''}`.trim() : item.author.username) : currentUserName}
                    </span>
                  </td>
                )}
                <td className="py-4 px-6">
                  <div className="text-sm font-medium text-gray-900">
                    {item.status === 'Published' ? 'Published' : (item.status === 'Draft' ? 'Modified' : item.status)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(item.publishedAt || item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </td>
                {type === 'forms' && (
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 text-[#5e3fde] px-2 py-1 rounded text-sm font-mono border border-gray-200">{item.shortcode}</code>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(item.shortcode); toast.success('Copied!'); }}
                        className="text-gray-400 hover:text-gray-700"
                        title="Copy Shortcode"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </td>
                )}
                {showSeoDetails && (
                  <td className="py-4 px-6">
                    <div className="flex gap-2 items-center mb-1.5">
                      {item.seoScore > 0 ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.seoScore >= 80 ? 'bg-green-100 text-green-800' : 
                          item.seoScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.seoScore} / 100
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          N/A
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {item.focusKeyword ? (
                        <div className="truncate max-w-[120px]" title={item.focusKeyword}>Keyword: <span className="font-medium text-gray-700">{item.focusKeyword}</span></div>
                      ) : (
                        <div>No Index</div>
                      )}
                      <div>Schema: <span className="font-medium text-gray-700">{item.schemaJson ? 'Custom' : 'N/A'}</span></div>
                    </div>
                  </td>
                )}
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link 
                      href={(type === 'courses' || type === 'forms') ? `/admin/${type}/${item.id}/edit` : `/admin/${type}/${item.id}`} 
                      className="p-2 text-gray-400 hover:text-[#5e3fde] hover:bg-[#5e3fde]/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </Link>
                    {type !== 'forms' && (
                      <Link 
                        href={type === 'courses' ? `/courses/${item.slug}` : `/${item.slug}`} 
                        target="_blank"
                        className="p-2 text-gray-400 hover:text-[#5e3fde] hover:bg-[#5e3fde]/10 rounded-lg transition-colors"
                        title="View"
                      >
                        <ExternalLink size={16} />
                      </Link>
                    )}
                    {item.status !== 'Trash' && (
                      <button 
                        onClick={() => handleTrash(item.id)} 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Trash"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  No {type} found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

type Redirection = {
  id: number;
  sourceUrl: string;
  ignoreCase: boolean;
  destinationUrl: string;
  redirectType: string;
  status: boolean;
  isTrashed: boolean;
  hits: number;
  lastAccessed: string | null;
  category: string;
  createdAt: string;
};

export default function RedirectionsPage() {
  const [redirections, setRedirections] = useState<Redirection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Inactive' | 'Trash'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection and Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [sourceUrl, setSourceUrl] = useState('');
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [redirectType, setRedirectType] = useState('301');
  const [status, setStatus] = useState(true);

  useEffect(() => {
    fetchRedirections();
  }, []);

  const fetchRedirections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/redirections`);
      const data = await res.json();
      setRedirections(data);
    } catch (err) {
      toast.error('Failed to load redirections');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSourceUrl('');
    setIgnoreCase(false);
    setDestinationUrl('');
    setRedirectType('301');
    setStatus(true);
  };

  const openModal = (redirection?: Redirection) => {
    if (redirection) {
      setEditingId(redirection.id);
      setSourceUrl(redirection.sourceUrl);
      setIgnoreCase(redirection.ignoreCase);
      setDestinationUrl(redirection.destinationUrl);
      setRedirectType(redirection.redirectType);
      setStatus(redirection.status);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl || !destinationUrl) {
      toast.error('Source and Destination URLs are required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/redirections/${editingId}` : '/api/redirections';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl,
          ignoreCase,
          destinationUrl,
          redirectType,
          status
        })
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      toast.success(editingId ? 'Redirection updated' : 'Redirection added');
      setIsModalOpen(false);
      fetchRedirections();
    } catch (err) {
      toast.error('Failed to save redirection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrash = async (id: number) => {
    if (!window.confirm('Are you sure you want to move this to trash?')) return;
    
    try {
      const res = await fetch(`${BASE_PATH}/api/redirections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrashed: true })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to trash');
      }
      
      toast.success('Moved to trash');
      fetchRedirections();
    } catch (err: any) {
      toast.error(err.message || 'Failed to move to trash');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      const res = await fetch(`${BASE_PATH}/api/redirections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrashed: false })
      });
      if (!res.ok) throw new Error('Failed to restore');
      
      toast.success('Redirection restored');
      fetchRedirections();
    } catch (err) {
      toast.error('Failed to restore');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this redirection?')) return;
    
    try {
      const res = await fetch(`${BASE_PATH}/api/redirections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      toast.success('Redirection deleted permanently');
      fetchRedirections();
    } catch (err) {
      toast.error('Failed to delete redirection');
    }
  };

  const handleToggleStatus = async (redir: Redirection) => {
    try {
      const res = await fetch(`${BASE_PATH}/api/redirections/${redir.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...redir, status: !redir.status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchRedirections();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    
    if (bulkAction === 'delete_permanently' && !window.confirm(`Permanently delete ${selectedIds.length} items?`)) return;

    try {
      for (const id of selectedIds) {
        if (bulkAction === 'trash') {
          await fetch(`${BASE_PATH}/api/redirections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isTrashed: true })
          });
        } else if (bulkAction === 'restore') {
          await fetch(`${BASE_PATH}/api/redirections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isTrashed: false })
          });
        } else if (bulkAction === 'delete_permanently') {
          await fetch(`${BASE_PATH}/api/redirections/${id}`, { method: 'DELETE' });
        } else if (bulkAction === 'activate') {
          await fetch(`${BASE_PATH}/api/redirections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: true })
          });
        } else if (bulkAction === 'deactivate') {
          await fetch(`${BASE_PATH}/api/redirections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: false })
          });
        }
      }
      toast.success('Bulk action completed');
      setSelectedIds([]);
      setBulkAction('');
      fetchRedirections();
    } catch (e) {
      toast.error('Some items failed to update');
    }
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRedirections.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const filteredRedirections = redirections.filter(r => {
    if (activeFilter === 'Trash' && !r.isTrashed) return false;
    if (activeFilter !== 'Trash' && r.isTrashed) return false;
    if (activeFilter === 'Active' && !r.status) return false;
    if (activeFilter === 'Inactive' && r.status) return false;
    if (searchQuery && !r.sourceUrl.toLowerCase().includes(searchQuery.toLowerCase()) && !r.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeCount = redirections.filter(r => r.status && !r.isTrashed).length;
  const inactiveCount = redirections.filter(r => !r.status && !r.isTrashed).length;
  const trashCount = redirections.filter(r => r.isTrashed).length;
  const allCount = redirections.filter(r => !r.isTrashed).length;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Redirections</h1>
          <p className="text-gray-500 mt-2">Manage your 301 and 302 redirects</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          Add New
        </button>
      </div>

      <div className="flex justify-between items-center mb-4 text-sm">
        <div className="flex gap-2 text-gray-500">
          <button onClick={() => setActiveFilter('All')} className={activeFilter === 'All' ? 'font-semibold text-gray-900' : 'hover:text-blue-600'}>
            All <span className="text-gray-400">({allCount})</span>
          </button>
          <span>|</span>
          <button onClick={() => setActiveFilter('Active')} className={activeFilter === 'Active' ? 'font-semibold text-gray-900' : 'hover:text-blue-600'}>
            Active <span className="text-gray-400">({activeCount})</span>
          </button>
          <span>|</span>
          <button onClick={() => setActiveFilter('Inactive')} className={activeFilter === 'Inactive' ? 'font-semibold text-gray-900' : 'hover:text-blue-600'}>
            Inactive <span className="text-gray-400">({inactiveCount})</span>
          </button>
          <span>|</span>
          <button onClick={() => setActiveFilter('Trash')} className={activeFilter === 'Trash' ? 'font-semibold text-gray-900' : 'hover:text-blue-600'}>
            Trash <span className="text-gray-400">({trashCount})</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Search redirections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <select 
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white outline-none"
          >
            <option value="">Bulk actions</option>
            {activeFilter === 'Trash' ? (
              <>
                <option value="restore">Restore</option>
                <option value="delete_permanently">Delete Permanently</option>
              </>
            ) : (
              <>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="trash">Move to Trash</option>
              </>
            )}
          </select>
          <button 
            onClick={handleBulkAction}
            className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 font-medium"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading redirections...</div>
        ) : redirections.length === 0 ? (
          <div className="p-16 text-center">
            <div className="bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <ExternalLink size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No redirections found</h3>
            <p className="text-gray-500 mb-6">Create your first redirection to forward traffic.</p>
            <button
              onClick={() => openModal()}
              className="text-blue-600 font-medium hover:underline"
            >
              + Add Redirection
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-8 text-center border-r border-gray-100">
                    <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === filteredRedirections.length && filteredRedirections.length > 0} className="rounded border-gray-300" />
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-sm whitespace-nowrap">Source URL</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-sm whitespace-nowrap">Destination URL</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-sm whitespace-nowrap text-center">Type</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-sm whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRedirections.map((redir) => (
                  <tr key={redir.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-center align-top pt-5">
                      <input type="checkbox" checked={selectedIds.includes(redir.id)} onChange={() => toggleSelect(redir.id)} className="rounded border-gray-300" />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 break-all min-w-[200px]">
                      <span className="text-blue-700 font-medium">{redir.sourceUrl}</span>
                      <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-3 text-xs font-normal">
                        {redir.isTrashed ? (
                          <>
                            <button onClick={() => handleRestore(redir.id)} className="text-blue-600 hover:underline">Restore</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => handleDelete(redir.id)} className="text-red-600 hover:underline">Delete Permanently</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openModal(redir)} className="text-blue-600 hover:underline">Edit</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => handleToggleStatus(redir)} className="text-blue-600 hover:underline">{redir.status ? 'Deactivate' : 'Activate'}</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => handleTrash(redir.id)} className="text-red-600 hover:underline">Trash</button>
                            <span className="text-gray-300">|</span>
                            <a href={redir.sourceUrl.startsWith('http') ? redir.sourceUrl : (redir.sourceUrl.startsWith('/') ? redir.sourceUrl : `/${redir.sourceUrl}`)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View</a>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 break-all min-w-[200px]">{redir.destinationUrl}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {redir.redirectType}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top pt-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        redir.isTrashed ? 'bg-red-100 text-red-800' : (redir.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                      }`}>
                        {redir.isTrashed ? 'Trashed' : (redir.status ? 'Active' : 'Inactive')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Edit Redirection' : 'Add Redirection'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Source URLs */}
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-3 pt-2">
                  <label className="text-sm font-semibold text-gray-900">Source URLs</label>
                </div>
                <div className="col-span-9 space-y-3">
                  <input
                    type="text"
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    placeholder="e.g. /old-page"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input 
                      type="checkbox" 
                      checked={ignoreCase}
                      onChange={e => setIgnoreCase(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    Ignore Case
                  </label>
                </div>
              </div>

              {/* Destination URL */}
              <div className="grid grid-cols-12 gap-4 items-start border-t border-gray-100 pt-6">
                <div className="col-span-3 pt-2">
                  <label className="text-sm font-semibold text-gray-900">Destination URL</label>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    value={destinationUrl}
                    onChange={e => setDestinationUrl(e.target.value)}
                    placeholder="e.g. /new-page"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Type and Category */}
              <div className="grid grid-cols-12 gap-4 items-start border-t border-gray-100 pt-6">
                <div className="col-span-3 pt-2">
                  <label className="text-sm font-semibold text-gray-900">Settings</label>
                </div>
                <div className="col-span-9 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Redirection Type</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setRedirectType('301')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          redirectType === '301' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        301 Permanent Move
                      </button>
                      <button
                        type="button"
                        onClick={() => setRedirectType('302')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          redirectType === '302' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        302 Temporary Move
                      </button>
                      <button
                        type="button"
                        onClick={() => setRedirectType('307')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          redirectType === '307' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        307 Temporary Redirect
                      </button>
                      <button
                        type="button"
                        onClick={() => setRedirectType('410')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          redirectType === '410' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        410 Content Deleted
                      </button>
                      <button
                        type="button"
                        onClick={() => setRedirectType('451')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          redirectType === '451' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        451 Unavailable for Legal Reasons
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-12 gap-4 items-start border-t border-gray-100 pt-6">
                <div className="col-span-3 pt-2">
                  <label className="text-sm font-semibold text-gray-900">Status</label>
                </div>
                <div className="col-span-9 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus(true)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                      status 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(false)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !status 
                        ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' 
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Deactivate
                  </button>
                </div>
              </div>

              <div className="pt-6 flex justify-between items-center border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : (editingId ? 'Update Redirection' : 'Add Redirection')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

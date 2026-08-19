'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Trash2, Edit2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

interface Tag {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  _count?: { posts: number };
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/tags/${editingId}` : '/api/tags';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
        })
      });
      
      if (res.ok) {
        toast.success(editingId ? 'Tag updated' : 'Tag created');
        setName('');
        setSlug('');
        setDescription('');
        setEditingId(null);
        fetchTags();
      } else {
        toast.error('Failed to save tag');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setName(tag.name);
    setSlug(tag.slug);
    setDescription(tag.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    
    try {
      const res = await fetch(`${BASE_PATH}/api/tags/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Tag deleted');
        fetchTags();
      } else {
        toast.error('Failed to delete tag');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pt-4">
      <h1 className="text-2xl font-normal text-[#1d2327] mb-6">Tags</h1>
      
      <div className="flex gap-8 items-start">
        {/* Left Column - Form */}
        <div className="w-[300px] shrink-0">
          <div className="bg-white p-4 border border-[#c3c4c7] shadow-sm">
            <h2 className="text-[14px] font-semibold text-[#1d2327] mb-4">
              {editingId ? 'Edit Tag' : 'Add New Tag'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] text-[#2c3338] mb-1">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner"
                  required
                />
                <p className="text-[12px] text-gray-500 mt-1">The name is how it appears on your site.</p>
              </div>
              
              <div>
                <label className="block text-[13px] text-[#2c3338] mb-1">Slug</label>
                <input 
                  type="text" 
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner"
                />
                <p className="text-[12px] text-gray-500 mt-1">The "slug" is the URL-friendly version of the name. It is usually all lowercase and contains only letters, numbers, and hyphens.</p>
              </div>

              <div>
                <label className="block text-[13px] text-[#2c3338] mb-1">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner resize-y"
                />
                <p className="text-[12px] text-gray-500 mt-1">The description is not prominent by default; however, some themes may show it.</p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#2271b1] hover:bg-[#135e96] text-white px-4 py-1.5 rounded-[3px] text-[13px] font-medium disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : (editingId ? 'Update Tag' : 'Add New Tag')}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={cancelEdit}
                    className="text-[#2271b1] hover:text-[#135e96] px-2 py-1.5 text-[13px] font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        
        {/* Right Column - Table */}
        <div className="flex-1 bg-white border border-[#c3c4c7] shadow-sm rounded-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-[13px]">Loading tags...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#c3c4c7] bg-[#f6f7f7]">
                    <th className="py-2 px-3 text-[13px] font-medium text-[#2c3338]">Name</th>
                    <th className="py-2 px-3 text-[13px] font-medium text-[#2c3338]">Description</th>
                    <th className="py-2 px-3 text-[13px] font-medium text-[#2c3338]">Slug</th>
                    <th className="py-2 px-3 text-[13px] font-medium text-[#2c3338] w-20 text-center">Count</th>
                    <th className="py-2 px-3 text-[13px] font-medium text-[#2c3338] w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 px-3 text-center text-[13px] text-gray-500">
                        No tags found.
                      </td>
                    </tr>
                  ) : (
                    tags.map(tag => (
                      <tr key={tag.id} className="border-b border-[#f0f0f1] hover:bg-[#f6f7f7] group">
                        <td className="py-2.5 px-3 text-[13px] font-medium text-[#2271b1]">
                          {tag.name}
                        </td>
                        <td className="py-2.5 px-3 text-[13px] text-gray-600">
                          {tag.description || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-[13px] text-gray-600">
                          {tag.slug}
                        </td>
                        <td className="py-2.5 px-3 text-[13px] text-[#2271b1] text-center hover:underline cursor-pointer">
                          {tag._count?.posts || 0}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(tag)}
                              className="text-[#2271b1] hover:text-[#135e96]"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(tag.id)}
                              className="text-[#d63638] hover:text-[#b32d2e]"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="p-3 bg-[#f6f7f7] border-t border-[#c3c4c7] text-[12px] text-gray-500">
                Tags can be selectively added to posts using the post editor.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

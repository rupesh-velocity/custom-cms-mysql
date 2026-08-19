'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Trash2, Edit2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  _count: { posts: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          parentId: parentId ? parseInt(parentId, 10) : null
        })
      });
      
      if (res.ok) {
        toast.success(editingId ? 'Category updated' : 'Category created');
        setName('');
        setSlug('');
        setDescription('');
        setParentId('');
        setEditingId(null);
        fetchCategories();
      } else {
        toast.error('Failed to save category');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setParentId(cat.parentId ? cat.parentId.toString() : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setParentId('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const res = await fetch(`${BASE_PATH}/api/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Category deleted');
        fetchCategories();
      } else {
        toast.error('Failed to delete category');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pt-4">
      <h1 className="text-2xl font-normal text-[#1d2327] mb-6">Categories</h1>
      
      <div className="flex gap-8 items-start">
        {/* Left Column - Form */}
        <div className="w-[300px] shrink-0">
          <div className="bg-white p-4 border border-[#c3c4c7] shadow-sm">
            <h2 className="text-[14px] font-semibold text-[#1d2327] mb-4">
              {editingId ? 'Edit Category' : 'Add New Category'}
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
                <label className="block text-[13px] text-[#2c3338] mb-1">Parent Category</label>
                <select 
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner bg-white"
                >
                  <option value="">None</option>
                  {categories.filter(c => c.id !== editingId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-[12px] text-gray-500 mt-1">Categories, unlike tags, can have a hierarchy. You might have a Jazz category, and under that have children categories for Bebop and Big Band.</p>
              </div>
              
              <div>
                <label className="block text-[13px] text-[#2c3338] mb-1">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] focus:border-[#0085ba] focus:ring-1 focus:ring-[#0085ba] outline-none shadow-inner"
                />
                <p className="text-[12px] text-gray-500 mt-1">The description is not prominent by default; however, some themes may show it.</p>
              </div>
              
              <div className="pt-2 flex items-center gap-3">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#2271b1] text-white text-[13px] px-3 py-1.5 rounded-[3px] border border-[#2271b1] hover:bg-[#135e96] transition-colors disabled:opacity-50"
                >
                  {editingId ? 'Update Category' : 'Add New Category'}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={cancelEdit}
                    className="text-[13px] text-[#d63638] hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        
        {/* Right Column - Table */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-[#c3c4c7] shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#c3c4c7] bg-[#f9f9f9]">
                  <th className="py-2 px-4 font-semibold text-[#2c3338]">Name</th>
                  <th className="py-2 px-4 font-semibold text-[#2c3338]">Description</th>
                  <th className="py-2 px-4 font-semibold text-[#2c3338]">Slug</th>
                  <th className="py-2 px-4 font-semibold text-[#2c3338] text-center w-24">Count</th>
                  <th className="py-2 px-4 font-semibold text-[#2c3338] w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f1]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">Loading categories...</td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">No categories found.</td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-[#f6f7f7] group">
                      <td className="py-3 px-4 text-[#2271b1] font-medium">
                        {category.name}
                      </td>
                      <td className="py-3 px-4 text-[#50575e]">
                        {category.description ? (
                          <span className="line-clamp-2">{category.description}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#50575e]">
                        {category.slug}
                      </td>
                      <td className="py-3 px-4 text-[#2271b1] text-center font-medium">
                        {category._count?.posts || 0}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(category)}
                            className="text-[#2271b1] hover:text-[#135e96] p-1"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(category.id)}
                            className="text-[#d63638] hover:text-[#b32d2e] p-1"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}

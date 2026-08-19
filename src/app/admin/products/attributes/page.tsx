'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  
  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      const res = await fetch(`${BASE_PATH}/api/products/attributes`);
      const data = await res.json();
      setAttributes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/products/attributes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug })
      });
      if (res.ok) {
        setName('');
        setSlug('');
        await fetchAttributes();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add attribute');
      }
    } catch (e) {
      alert('Error adding attribute');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this attribute and all its terms?')) return;
    try {
      const res = await fetch(`${BASE_PATH}/api/products/attributes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchAttributes();
      } else {
        alert('Failed to delete');
      }
    } catch (e) {
      alert('Error deleting');
    }
  };

  return (
      <div className="max-w-[1200px] mx-auto font-sans text-[#2c3338]">
        <h1 className="text-2xl font-normal mb-6">Attributes</h1>
        
        <div className="flex gap-8">
          {/* Add New Form */}
          <div className="w-[300px] shrink-0">
            <h2 className="text-[14px] font-semibold mb-4">Add new attribute</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[13px] text-gray-700 block font-semibold">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-[#8c8f94] px-3 py-1.5 text-[14px] outline-none focus:border-[#5e3fde]"
                  required
                />
                <p className="text-xs text-gray-500">Name for the attribute (shown on the front-end).</p>
              </div>
              <div className="space-y-1">
                <label className="text-[13px] text-gray-700 block font-semibold">Slug</label>
                <input 
                  type="text" 
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full border border-[#8c8f94] px-3 py-1.5 text-[14px] outline-none focus:border-[#5e3fde]"
                />
                <p className="text-xs text-gray-500">Unique slug/reference for the attribute; must be no more than 28 characters.</p>
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-[#5e3fde] text-white rounded-[3px] text-[13px] font-medium hover:bg-[#4b32b2] disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add attribute
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="flex-1">
            <table className="w-full bg-white border border-[#c3c4c7] shadow-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-[#c3c4c7]">
                  <th className="p-3 text-[14px] font-semibold text-gray-800 w-[25%]">Name</th>
                  <th className="p-3 text-[14px] font-semibold text-gray-800 w-[25%]">Slug</th>
                  <th className="p-3 text-[14px] font-semibold text-gray-800">Terms</th>
                </tr>
              </thead>
              <tbody className="text-[13px] text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center">Loading...</td>
                  </tr>
                ) : attributes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center">No attributes found.</td>
                  </tr>
                ) : (
                  attributes.map(attr => (
                    <tr key={attr.id} className="border-b border-[#f0f0f1] hover:bg-[#f6f7f7] group">
                      <td className="p-3 align-top">
                        <strong className="text-[#2271b1]">{attr.name}</strong>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 text-xs mt-1">
                          <Link href={`/admin/products/attributes/${attr.id}`} className="text-[#2271b1] hover:underline">Edit</Link>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => handleDelete(attr.id)} className="text-[#d63638] hover:underline">Delete</button>
                        </div>
                      </td>
                      <td className="p-3 align-top">{attr.slug}</td>
                      <td className="p-3 align-top">
                        {attr.terms?.length > 0 ? (
                          <div className="mb-2">
                            {attr.terms.map((t: any) => t.name).join(', ')}
                          </div>
                        ) : (
                          <div className="mb-2 text-gray-400 italic">No terms</div>
                        )}
                        <Link href={`/admin/products/attributes/${attr.id}`} className="text-[#2271b1] text-xs hover:underline">Configure terms</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}

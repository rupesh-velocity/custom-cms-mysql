'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

export default function AttributeTermsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;
  const [attribute, setAttribute] = useState<any>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [attrRes, termsRes] = await Promise.all([
        fetch(`${BASE_PATH}/api/products/attributes/${id}`),
        fetch(`${BASE_PATH}/api/products/attributes/${id}/terms`)
      ]);
      const attrData = await attrRes.json();
      const termsData = await termsRes.json();
      setAttribute(attrData);
      setTerms(termsData);
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
      const res = await fetch(`${BASE_PATH}/api/products/attributes/${id}/terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description })
      });
      if (res.ok) {
        setName('');
        setSlug('');
        setDescription('');
        await fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add term');
      }
    } catch (e) {
      alert('Error adding term');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (termId: number) => {
    if (!confirm('Are you sure you want to delete this term?')) return;
    try {
      const res = await fetch(`${BASE_PATH}/api/products/attributes/${id}/terms/${termId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      } else {
        alert('Failed to delete');
      }
    } catch (e) {
      alert('Error deleting');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!attribute) {
    return <div className="p-6">Attribute not found.</div>;
  }

  return (
      <div className="max-w-[1200px] mx-auto font-sans text-[#2c3338]">
        <div className="mb-6 flex items-center gap-2">
          <h1 className="text-2xl font-normal">Product {attribute.name}</h1>
          <Link href="/admin/products/attributes" className="border border-[#2271b1] text-[#2271b1] px-2 py-1 text-xs rounded-[3px] hover:bg-[#f6f7f7]">Back to Attributes</Link>
        </div>
        
        <div className="flex gap-8">
          {/* Add New Form */}
          <div className="w-[300px] shrink-0">
            <h2 className="text-[14px] font-semibold mb-4">Add new {attribute.name}</h2>
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
                <p className="text-xs text-gray-500">The name is how it appears on your site.</p>
              </div>
              <div className="space-y-1">
                <label className="text-[13px] text-gray-700 block font-semibold">Slug</label>
                <input 
                  type="text" 
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full border border-[#8c8f94] px-3 py-1.5 text-[14px] outline-none focus:border-[#5e3fde]"
                />
                <p className="text-xs text-gray-500">The "slug" is the URL-friendly version of the name. It is usually all lowercase and contains only letters, numbers, and hyphens.</p>
              </div>
              <div className="space-y-1">
                <label className="text-[13px] text-gray-700 block font-semibold">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-[#8c8f94] px-3 py-1.5 text-[14px] outline-none focus:border-[#5e3fde]"
                />
                <p className="text-xs text-gray-500">The description is not prominent by default; however, some themes may show it.</p>
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-[#5e3fde] text-white rounded-[3px] text-[13px] font-medium hover:bg-[#4b32b2] disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add new {attribute.name}
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="flex-1">
            <table className="w-full bg-white border border-[#c3c4c7] shadow-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-[#c3c4c7]">
                  <th className="p-3 text-[14px] font-semibold text-gray-800 w-[30%]">Name</th>
                  <th className="p-3 text-[14px] font-semibold text-gray-800 w-[25%]">Description</th>
                  <th className="p-3 text-[14px] font-semibold text-gray-800 w-[25%]">Slug</th>
                  <th className="p-3 text-[14px] font-semibold text-gray-800 w-[20%]">Count</th>
                </tr>
              </thead>
              <tbody className="text-[13px] text-gray-700">
                {terms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center">No terms found.</td>
                  </tr>
                ) : (
                  terms.map(term => (
                    <tr key={term.id} className="border-b border-[#f0f0f1] hover:bg-[#f6f7f7] group">
                      <td className="p-3 align-top">
                        <strong className="text-[#2271b1]">{term.name}</strong>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 text-xs mt-1">
                          <button onClick={() => handleDelete(term.id)} className="text-[#d63638] hover:underline">Delete</button>
                        </div>
                      </td>
                      <td className="p-3 align-top">{term.description || '—'}</td>
                      <td className="p-3 align-top">{term.slug}</td>
                      <td className="p-3 align-top">0</td>
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

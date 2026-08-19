'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import MediaModal from '@/components/MediaModal';
import { BASE_PATH } from '@/lib/config';

interface FontVariation {
  id: string;
  weight: string;
  style: string;
  woff2Url: string;
}

interface FontFamily {
  id: string;
  name: string;
  variations: FontVariation[];
}

export default function FontsSettings() {
  const [fontFamilies, setFontFamilies] = useState<FontFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalTargetVarId, setModalTargetVarId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.custom_fonts) {
          try {
            setFontFamilies(JSON.parse(data.custom_fonts));
          } catch(e) {}
        }
        setIsLoading(false);
      });
  }, []);

  const handleMediaInsert = (url: string) => {
    if (modalTargetVarId) {
      setFontFamilies(prev => prev.map(family => ({
        ...family,
        variations: family.variations.map(v => v.id === modalTargetVarId ? { ...v, woff2Url: url } : v)
      })));
    }
  };

  const addFontFamily = () => {
    setFontFamilies(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        variations: [
          { id: Math.random().toString(36).substr(2, 9), weight: '400', style: 'normal', woff2Url: '' }
        ]
      }
    ]);
  };

  const removeFontFamily = (id: string) => {
    setFontFamilies(prev => prev.filter(f => f.id !== id));
  };

  const updateFontFamilyName = (id: string, name: string) => {
    setFontFamilies(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  };

  const addVariation = (familyId: string) => {
    setFontFamilies(prev => prev.map(f => {
      if (f.id === familyId) {
        return {
          ...f,
          variations: [...f.variations, { id: Math.random().toString(36).substr(2, 9), weight: '400', style: 'normal', woff2Url: '' }]
        };
      }
      return f;
    }));
  };

  const removeVariation = (familyId: string, variationId: string) => {
    setFontFamilies(prev => prev.map(f => {
      if (f.id === familyId) {
        return { ...f, variations: f.variations.filter(v => v.id !== variationId) };
      }
      return f;
    }));
  };

  const updateVariation = (familyId: string, variationId: string, field: keyof FontVariation, value: string) => {
    setFontFamilies(prev => prev.map(f => {
      if (f.id === familyId) {
        return {
          ...f,
          variations: f.variations.map(v => v.id === variationId ? { ...v, [field]: value } : v)
        };
      }
      return f;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const res = await fetch(`${BASE_PATH}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          custom_fonts: JSON.stringify(fontFamilies),
        }),
      });
      if (res.ok) {
        toast.success('Typography settings saved!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="relative">
      <MediaModal 
        isOpen={modalTargetVarId !== null}
        onClose={() => setModalTargetVarId(null)}
        onInsert={handleMediaInsert}
      />
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-10">
      
      {/* SECTION 1: Typography */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
        <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-xl">Aa</span> Custom Fonts
          </h2>
          <button
            type="button"
            onClick={addFontFamily}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Add Font Family
          </button>
        </div>
        
        <p className="text-sm text-gray-500">
          Upload .woff2 files and define their specific Font Family name. You can upload multiple completely different fonts (e.g. one block for headings, one block for body).
        </p>

        <div className="space-y-6 pt-2">
          {fontFamilies.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-sm">
              No fonts added yet. Click "Add Font Family" to start.
            </div>
          ) : (
            fontFamilies.map((family) => (
              <div key={family.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex-1 max-w-sm">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Font Family Name</label>
                    <input
                      type="text"
                      value={family.name}
                      onChange={(e) => updateFontFamilyName(family.id, e.target.value)}
                      placeholder="e.g. Roboto"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFontFamily(family.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors text-sm flex items-center gap-1 mt-4"
                  >
                    <Trash2 size={16} /> Remove Family
                  </button>
                </div>
                
                <div className="p-5 space-y-4">
                  {family.variations.map((variation, idx) => (
                    <div key={variation.id} className="flex items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div>
                          {idx === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Weight</label>}
                          <select 
                            value={variation.weight}
                            onChange={(e) => updateVariation(family.id, variation.id, 'weight', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                          >
                            <option value="100">100 - Thin</option>
                            <option value="200">200 - Extra Light</option>
                            <option value="300">300 - Light</option>
                            <option value="400">400 - Normal</option>
                            <option value="500">500 - Medium</option>
                            <option value="600">600 - Semi Bold</option>
                            <option value="700">700 - Bold</option>
                            <option value="800">800 - Extra Bold</option>
                            <option value="900">900 - Black</option>
                          </select>
                        </div>
                        <div>
                          {idx === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Style</label>}
                          <select 
                            value={variation.style}
                            onChange={(e) => updateVariation(family.id, variation.id, 'style', e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                          >
                            <option value="normal">Normal</option>
                            <option value="italic">Italic</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex-1">
                        {idx === 0 && <label className="block text-xs font-medium text-gray-500 mb-1">Font File</label>}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-600 truncate h-8 flex items-center">
                            {variation.woff2Url ? variation.woff2Url.split('/').pop() : 'No .woff2 file selected'}
                          </div>
                          <button
                            type="button"
                            onClick={() => setModalTargetVarId(variation.id)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors h-8"
                          >
                            <Upload size={14} /> {variation.woff2Url ? 'Change' : 'Upload'}
                          </button>
                        </div>
                      </div>

                      <div className="pt-[2px]">
                        {idx === 0 && <div className="h-[22px]" />}
                        <button
                          type="button"
                          onClick={() => removeVariation(family.id, variation.id)}
                          disabled={family.variations.length === 1}
                          className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Remove Variation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => addVariation(family.id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Weight/Variation
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Sticky Save Button */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur border-t border-gray-200 p-4 -mx-8 px-8 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-2.5 bg-[#5e3fde] text-white rounded font-medium hover:bg-[#4b32b2] disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>
    </form>
    </div>
  );
}

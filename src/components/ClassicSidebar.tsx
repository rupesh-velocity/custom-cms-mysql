'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, MapPin, Eye, Calendar, HelpCircle } from 'lucide-react';
import MediaModal from './MediaModal';
import { BASE_PATH } from '@/lib/config';

interface ClassicSidebarProps {
  status: string;
  setStatus: (val: string) => void;
  onPublish: (overrideStatus?: string) => void;
  isSaving: boolean;
  score: number;
  hideTitle?: boolean;
  setHideTitle?: (val: boolean) => void;
  visibility?: string;
  setVisibility?: (val: string) => void;
  password?: string;
  setPassword?: (val: string) => void;
  publishDate?: string;
  setPublishDate?: (val: string) => void;
  isNew?: boolean;
  featuredImage?: string | null;
  setFeaturedImage?: (val: string | null) => void;
  categoryIds?: number[];
  setCategoryIds?: (val: number[]) => void;
  tagIds?: number[];
  setTagIds?: (val: number[]) => void;
  isPost?: boolean;
}

export default function ClassicSidebar({ 
  status, setStatus, onPublish, isSaving, score, hideTitle, setHideTitle, 
  visibility = 'Public', setVisibility, password, setPassword, 
  publishDate, setPublishDate, isNew = false,
  featuredImage, setFeaturedImage, categoryIds = [], setCategoryIds, 
  tagIds = [], setTagIds, isPost = false
}: ClassicSidebarProps) {
  const [expanded, setExpanded] = useState({
    publish: true,
    categories: true,
    tags: true,
    contentAI: false,
    pageAttributes: false,
    linkSuggestions: false,
    featuredImage: false,
    pageSettings: false
  });
  
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingVisibility, setEditingVisibility] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [tags, setTags] = useState<{id: number, name: string}[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);


  useEffect(() => {
    if (isPost) {
      fetch(`${BASE_PATH}/api/categories`).then(res => res.json()).then(data => {
        if (Array.isArray(data)) setCategories(data);
      });
      fetch(`${BASE_PATH}/api/tags`).then(res => res.json()).then(data => {
        if (Array.isArray(data)) setTags(data);
      });
    }
  }, [isPost]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName })
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories(prev => [...prev.filter(c => c.id !== newCat.id), newCat].sort((a, b) => a.name.localeCompare(b.name)));
        if (setCategoryIds) {
          setCategoryIds([...categoryIds, newCat.id]);
        }
        setNewCategoryName('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const toggleCategory = (id: number) => {
    if (!setCategoryIds) return;
    if (categoryIds.includes(id)) {
      setCategoryIds(categoryIds.filter(cId => cId !== id));
    } else {
      setCategoryIds([...categoryIds, id]);
    }
  };

  const handleAddTags = async () => {
    if (!newTagName.trim()) return;
    setIsCreatingTag(true);
    
    const tagNames = newTagName.split(',').map(t => t.trim()).filter(Boolean);
    const newTagIds = [...tagIds];

    for (const tagName of tagNames) {
      // Find existing tag (case-insensitive)
      const existingTag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
      if (existingTag) {
        if (!newTagIds.includes(existingTag.id)) {
          newTagIds.push(existingTag.id);
        }
      } else {
        // Create new tag
        try {
          const res = await fetch(`${BASE_PATH}/api/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tagName })
          });
          if (res.ok) {
            const newTag = await res.json();
            setTags(prev => [...prev.filter(t => t.id !== newTag.id), newTag].sort((a, b) => a.name.localeCompare(b.name)));
            newTagIds.push(newTag.id);
          }
        } catch (error) {
          console.error(error);
        }
      }
    }
    
    if (setTagIds) {
      setTagIds(newTagIds);
    }
    setNewTagName('');
    setIsCreatingTag(false);
  };

  const removeTag = (id: number) => {
    if (!setTagIds) return;
    setTagIds(tagIds.filter(tId => tId !== id));
  };

  const toggleAccordion = (section: keyof typeof expanded) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  let scoreColor = 'bg-[#ffaba8] text-[#d63638]';
  if (score > 50) scoreColor = 'bg-[#f0b849] text-[#8a6d3b]';
  if (score >= 80) scoreColor = 'bg-[#c6e1c6] text-[#007017]';

  return (
    <div className="w-full max-w-[280px] font-sans">
      <Accordion id="publish" title="Publish" expanded={expanded.publish} toggleAccordion={() => toggleAccordion('publish')} noPadding>
        <div className="p-3 bg-white">
          <div className={`flex ${status !== 'Published' ? 'justify-between' : 'justify-end'} mb-4`}>
            {status !== 'Published' && (
              <button 
                onClick={() => onPublish('Draft')}
                disabled={isSaving}
                className="bg-white border border-[#5e3fde] text-[#5e3fde] px-3 py-1 rounded-[3px] text-[13px] hover:bg-[#f6f7f7] disabled:opacity-50"
              >
                Save Draft
              </button>
            )}
            <button className="bg-[#f3f5f6] border border-[#0071a1] text-[#0071a1] px-3 py-1 rounded-[3px] text-[13px] hover:bg-[#f1f1f1]">
              Preview
            </button>
          </div>
          
          <div className="space-y-3 text-[13px] text-[#50575e] mb-4">
            {/* Status */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" /> 
                <span>Status: <span className="font-semibold text-[#1d2327]">{status}</span></span>
                {!editingStatus && <button onClick={() => setEditingStatus(true)} className="text-[#0071a1] hover:underline ml-1">Edit</button>}
              </div>
              {editingStatus && (
                <div className="flex items-center gap-2 mt-1">
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="border border-[#8c8f94] rounded-[3px] px-2 py-1 outline-none text-[13px]"
                  >
                    <option value="Published">Published</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Draft">Draft</option>
                  </select>
                  <button onClick={() => setEditingStatus(false)} className="bg-[#f3f5f6] border border-[#8c8f94] px-2 py-1 rounded-[3px]">OK</button>
                  <button onClick={() => setEditingStatus(false)} className="text-[#0071a1] hover:underline">Cancel</button>
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-400" /> 
                <span>Visibility: <span className="font-semibold text-[#1d2327]">{visibility}</span></span>
                {!editingVisibility && setVisibility && <button onClick={() => setEditingVisibility(true)} className="text-[#0071a1] hover:underline ml-1">Edit</button>}
              </div>
              {editingVisibility && setVisibility && (
                <div className="flex flex-col gap-1 mt-1">
                  <label className="flex items-center gap-2"><input type="radio" name="vis" checked={visibility === 'Public'} onChange={() => setVisibility('Public')} /> Public</label>
                  <label className="flex items-center gap-2"><input type="radio" name="vis" checked={visibility === 'Password Protected'} onChange={() => setVisibility('Password Protected')} /> Password Protected</label>
                  {visibility === 'Password Protected' && setPassword && (
                    <div className="pl-6 mt-1 mb-1">
                      <label className="block text-xs text-gray-500 mb-1">Password:</label>
                      <input type="text" value={password || ''} onChange={(e) => setPassword(e.target.value)} className="border border-[#8c8f94] rounded-[3px] px-2 py-1 outline-none text-[13px] w-full" />
                    </div>
                  )}
                  <label className="flex items-center gap-2"><input type="radio" name="vis" checked={visibility === 'Private'} onChange={() => setVisibility('Private')} /> Private</label>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setEditingVisibility(false)} className="bg-[#f3f5f6] border border-[#8c8f94] px-2 py-1 rounded-[3px]">OK</button>
                    <button onClick={() => setEditingVisibility(false)} className="text-[#0071a1] hover:underline">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Publish Date */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" /> 
                <span>Published on: <span className="font-semibold text-[#1d2327]">{publishDate ? new Date(publishDate).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Immediately'}</span></span>
                {!editingDate && setPublishDate && <button onClick={() => setEditingDate(true)} className="text-[#0071a1] hover:underline ml-1">Edit</button>}
              </div>
              {editingDate && setPublishDate && (
                <div className="flex flex-col gap-2 mt-1">
                  <input 
                    type="datetime-local" 
                    value={publishDate ? new Date(new Date(publishDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} 
                    onChange={(e) => setPublishDate(new Date(e.target.value).toISOString())}
                    className="border border-[#8c8f94] rounded-[3px] px-2 py-1 outline-none text-[13px] w-full"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setEditingDate(false)} className="bg-[#f3f5f6] border border-[#8c8f94] px-2 py-1 rounded-[3px]">OK</button>
                    <button onClick={() => {
                       setPublishDate(''); // Reset to immediately
                       setEditingDate(false);
                    }} className="text-[#0071a1] hover:underline">Cancel</button>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>

        <div className={`px-4 py-2 flex items-center gap-2 border-y border-[#c3c4c7] font-semibold text-[13px] ${scoreColor}`}>
           <TrendingUp className="w-4 h-4" /> SEO: {score} / 100
        </div>

        <div className="p-3 bg-[#f6f7f7] flex items-center justify-between rounded-b-[3px]">
           <button onClick={() => onPublish('Trash')} className="text-[#b32d2e] text-[13px] hover:underline disabled:opacity-50" disabled={isSaving}>Move to Trash</button>
           <button 
             onClick={() => onPublish('Published')}
             disabled={isSaving}
             className="bg-[#5e3fde] text-white px-4 py-1.5 rounded-[3px] text-[13px] font-semibold hover:bg-[#4b32b2] disabled:opacity-50"
           >
             {isSaving ? 'Updating...' : (status === 'Published' && !isNew ? 'Update' : 'Publish')}
           </button>
        </div>
      </Accordion>

      {isPost && (
        <Accordion id="categories" title="Categories" expanded={expanded.categories} toggleAccordion={() => toggleAccordion('categories')}>
          <div className="max-h-48 overflow-y-auto mb-2 border border-[#ddd] p-2 bg-white">
            {categories.map(cat => (
              <label key={cat.id} className="flex items-center gap-2 mb-1 text-[13px] text-[#1d2327]">
                <input 
                  type="checkbox" 
                  checked={categoryIds.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  className="w-4 h-4 border-[#8c8f94] rounded-[2px]"
                />
                {cat.name}
              </label>
            ))}
            {categories.length === 0 && <p className="text-xs text-gray-500">No categories found.</p>}
          </div>
          
          {showAddCategory ? (
            <div className="mt-2">
              <input 
                type="text" 
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="New Category Name"
                className="w-full border border-[#8c8f94] rounded-[3px] px-2 py-1 text-[13px] outline-none mb-2"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <button 
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="border border-[#0071a1] text-[#0071a1] px-3 py-1 rounded-[3px] text-[13px] hover:bg-[#f1f1f1] disabled:opacity-50"
              >
                {isCreatingCategory ? 'Adding...' : 'Add New Category'}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAddCategory(true)} className="text-[#0071a1] text-[13px] hover:underline underline-offset-2">
              + Add New Category
            </button>
          )}
        </Accordion>
      )}

      {isPost && (
        <Accordion id="tags" title="Tags" expanded={expanded.tags} toggleAccordion={() => toggleAccordion('tags')}>
          <div className="flex gap-2 mb-2">
            <input 
              type="text" 
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              className="flex-1 border border-[#8c8f94] rounded-[3px] px-2 py-1.5 text-[13px] outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTags();
                }
              }}
            />
            <button 
              onClick={(e) => { e.preventDefault(); handleAddTags(); }}
              disabled={isCreatingTag || !newTagName.trim()}
              className="border border-[#8c8f94] text-[#1d2327] bg-[#f3f5f6] px-3 py-1.5 rounded-[3px] text-[13px] hover:bg-[#f1f1f1] disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="text-[12px] text-gray-500 mb-3 italic">Separate tags with commas</p>
          
          <div className="flex flex-wrap gap-2">
            {tagIds.map(id => {
              const tag = tags.find(t => t.id === id);
              if (!tag) return null;
              return (
                <div key={id} className="flex items-center gap-1 text-[13px] text-[#1d2327]">
                  <button 
                    onClick={(e) => { e.preventDefault(); removeTag(id); }}
                    className="text-[#0071a1] hover:text-red-500 rounded-full bg-gray-100 p-0.5 hover:bg-gray-200 transition-colors flex items-center justify-center w-5 h-5"
                    title="Remove tag"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  </button>
                  {tag.name}
                </div>
              );
            })}
          </div>
        </Accordion>
      )}

      {!isPost && (
        <Accordion id="pageAttributes" title="Page Attributes" expanded={expanded.pageAttributes} toggleAccordion={() => toggleAccordion('pageAttributes')}>
          <div className="text-[13px] text-[#1d2327]">
             <label className="block font-semibold mb-1">Parent</label>
             <select className="w-full border border-[#8c8f94] rounded-[3px] px-2 py-1 outline-none mb-3">
               <option>(no parent)</option>
             </select>
             
             <label className="block font-semibold mb-1">Order</label>
             <input type="number" defaultValue="0" className="w-full border border-[#8c8f94] rounded-[3px] px-2 py-1 outline-none" />
          </div>
        </Accordion>
      )}

      <Accordion id="featuredImage" title="Featured image" expanded={expanded.featuredImage} toggleAccordion={() => toggleAccordion('featuredImage')}>
        {featuredImage ? (
          <div className="text-center">
            <img src={featuredImage} alt="Featured" className="w-full h-auto mb-2 rounded border border-gray-200" />
            <div className="flex gap-2 justify-center">
               <button onClick={() => setIsMediaModalOpen(true)} className="text-[#0071a1] text-[13px] hover:underline">Replace</button>
               {setFeaturedImage && <button onClick={() => setFeaturedImage(null)} className="text-[#b32d2e] text-[13px] hover:underline">Remove</button>}
            </div>
          </div>
        ) : (
          <button onClick={() => setIsMediaModalOpen(true)} className="text-[#0071a1] text-[13px] hover:underline">Set featured image</button>
        )}
        <MediaModal 
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          onInsert={(url) => setFeaturedImage && setFeaturedImage(url)}
        />
      </Accordion>

      {!isPost && (
        <Accordion id="pageSettings" title="Page Settings" expanded={expanded.pageSettings} toggleAccordion={() => toggleAccordion('pageSettings')}>
          <div className="text-[13px] text-[#1d2327]">
             {setHideTitle !== undefined && (
               <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={hideTitle} 
                   onChange={(e) => setHideTitle(e.target.checked)}
                   className="w-4 h-4 border-[#8c8f94] rounded-[2px]"
                 />
                 <span>Hide Page Title on Frontend</span>
               </label>
             )}
          </div>
        </Accordion>
      )}
    </div>
  );
}

// Temporary icon since TrendingUp wasn't imported at top
function TrendingUp(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
}

export function Accordion({ id, title, children, expanded, toggleAccordion, noPadding = false }: { id: string, title: string, children: React.ReactNode, expanded: boolean, toggleAccordion: () => void, noPadding?: boolean }) {
  return (
    <div className="bg-white border border-[#c3c4c7] shadow-sm mb-4">
      <button 
        onClick={toggleAccordion}
        className="w-full flex items-center justify-between px-3 py-2 border-b border-transparent bg-white hover:bg-[#f6f7f7] transition-colors"
      >
        <h2 className="text-[14px] font-semibold text-[#1d2327]">{title}</h2>
        <div className="flex gap-1 text-gray-500">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      {expanded && (
        <div className={`border-t border-[#c3c4c7] ${noPadding ? '' : 'p-3'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Loader2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

function SortableMenuItem({ item, index, onRemove, onIndent, onOutdent, canIndent, onUpdateLabel, onUpdateUrl, moveUp, moveDown, isFirst, isLast, pages, posts }: any) {
  const [expanded, setExpanded] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    position: 'relative' as any,
  };

  const isCustomLink = !pages.some((p: any) => `/${p.slug}` === item.url) && !posts.some((p: any) => `/blog/${p.slug}` === item.url);
  const typeText = isCustomLink ? 'Custom Link' : (item.url.includes('/blog/') ? 'Post' : 'Page');

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-white border ${isDragging ? 'border-blue-500 shadow-md' : 'border-gray-300'} shadow-sm relative`}
    >
      <div className="flex items-center h-12 bg-[#fafafa]">
        <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 px-3 h-full flex items-center border-r border-gray-200">
          <GripVertical size={18} />
        </div>
        
        <div className="flex-1 px-4 font-semibold text-[#5e3fde] text-[13px]">
          {item.label}
        </div>

        <div className="px-3 text-xs text-gray-500 hidden sm:block italic">
          {typeText}
        </div>
        
        <div className="flex items-center px-2 border-l border-gray-200">
          <button 
            onClick={onOutdent} 
            disabled={!item.parentId} 
            className="p-1 text-gray-400 hover:text-[#5e3fde] disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
            title="Outdent (Move Left)"
          >
            &lt;
          </button>
          <button 
            onClick={onIndent} 
            disabled={!canIndent} 
            className="p-1 text-gray-400 hover:text-[#5e3fde] disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
            title="Indent (Make Sub-menu)"
          >
            &gt;
          </button>
        </div>
        
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="px-4 h-full flex items-center text-gray-500 hover:text-gray-900 border-l border-gray-200 transition-colors"
          title="Toggle Details"
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="p-4 border-t border-gray-200 bg-white space-y-4">
          {isCustomLink && (
            <div>
              <label className="block text-[13px] text-[#646970] mb-1">URL</label>
              <input 
                type="text" 
                value={item.url} 
                onChange={(e) => onUpdateUrl(item.id, e.target.value)}
                className="w-full sm:w-1/2 text-[13px] border border-gray-300 px-2 py-1 focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde] outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.07)]"
              />
            </div>
          )}
          <div>
            <label className="block text-[13px] text-[#646970] mb-1">Navigation Label</label>
            <input 
              type="text" 
              value={item.label} 
              onChange={(e) => onUpdateLabel(item.id, e.target.value)}
              className="w-full sm:w-1/2 text-[13px] border border-gray-300 px-2 py-1 focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde] outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.07)]"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-[13px] pt-2">
            <span className="text-[#646970]">Move</span>
            <button onClick={moveUp} disabled={isFirst} className="text-[#5e3fde] hover:underline disabled:text-gray-300 disabled:no-underline">Up one</button>
            <button onClick={moveDown} disabled={isLast} className="text-[#5e3fde] hover:underline disabled:text-gray-300 disabled:no-underline">Down one</button>
            <button onClick={onIndent} disabled={!canIndent} className="text-[#5e3fde] hover:underline disabled:text-gray-300 disabled:no-underline">Indent</button>
            <button onClick={onOutdent} disabled={!item.parentId} className="text-[#5e3fde] hover:underline disabled:text-gray-300 disabled:no-underline">Outdent</button>
          </div>

          <div className="flex items-center gap-4 text-[13px] pt-4 border-t border-gray-100">
            <div className="text-[#646970]">Original: <span className="italic">{item.url}</span></div>
            <button 
              onClick={() => onRemove(item.id)} 
              className="text-[#d63638] hover:underline ml-auto"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Accordion Panel for Left Sidebar
function AddMenuAccordion({ title, isOpen, onToggle, children }: any) {
  return (
    <div className="border border-[#c3c4c7] bg-white">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-white hover:bg-[#f6f7f7] font-semibold text-[#2c3338] text-[14px]"
      >
        {title}
        {isOpen ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
      </button>
      {isOpen && (
        <div className="p-4 border-t border-[#c3c4c7] bg-[#f6f7f7]">
          {children}
        </div>
      )}
    </div>
  );
}

export default function MenusPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [newMenuName, setNewMenuName] = useState('');
  
  // Accordion state
  const [openPanel, setOpenPanel] = useState<string>('pages');

  // Add Item State
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [menusRes, pagesRes, postsRes] = await Promise.all([
      fetch(`${BASE_PATH}/api/menus`).then(r => r.json()),
      fetch(`${BASE_PATH}/api/pages`).then(r => r.json()),
      fetch(`${BASE_PATH}/api/posts`).then(r => r.json())
    ]);
    setMenus(Array.isArray(menusRes) ? menusRes : []);
    setPages(Array.isArray(pagesRes) ? pagesRes : []);
    setPosts(Array.isArray(postsRes) ? postsRes : []);
    
    if (menusRes && menusRes.length > 0 && !activeMenuId) {
      handleSelectMenu(menusRes[0].id, menusRes);
    } else if (activeMenuId && menusRes) {
      handleSelectMenu(activeMenuId, menusRes);
    } else {
      setIsLoading(false);
    }
  };

  const handleSelectMenu = (id: number, menusList = menus) => {
    setActiveMenuId(id);
    const menu = menusList.find((m: any) => m.id === id);
    if (menu && menu.items) {
      setMenuItems([...menu.items]);
    } else {
      setMenuItems([]);
    }
    setIsLoading(false);
  };

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName) return;
    
    // Auto-generate slug from name
    const slug = newMenuName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const res = await fetch(`${BASE_PATH}/api/menus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMenuName, slug })
    });
    
    if (res.ok) {
      setNewMenuName('');
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to create menu');
    }
  };

  const handleDeleteMenu = async () => {
    if (!activeMenuId) return;
    if (!confirm('Are you sure you want to delete this entire menu?')) return;
    
    const res = await fetch(`${BASE_PATH}/api/menus/${activeMenuId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      setActiveMenuId(null);
      fetchData();
    }
  };

  // Generic add items helper
  const addItemsToMenu = (itemsToAdd: any[]) => {
    setMenuItems(prev => [...prev, ...itemsToAdd.map((item, index) => ({
      ...item,
      id: `new-${Date.now()}-${index}`,
      parentId: null,
      order: prev.length + index
    }))]);
  };

  const handleAddPages = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPages.length === 0) return;
    const items = selectedPages.map(pageId => {
      const p = pages.find(x => x.id === pageId);
      return { label: p.title, url: `/${p.slug}` };
    });
    addItemsToMenu(items);
    setSelectedPages([]);
  };

  const handleAddPosts = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPosts.length === 0) return;
    const items = selectedPosts.map(postId => {
      const p = posts.find(x => x.id === postId);
      return { label: p.title, url: `/blog/${p.slug}` }; // Assuming blog posts are at /blog/
    });
    addItemsToMenu(items);
    setSelectedPosts([]);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel || !customUrl) return;
    addItemsToMenu([{ label: customLabel, url: customUrl }]);
    setCustomLabel('');
    setCustomUrl('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        return newItems.map((item, idx) => {
          let parentIdx = newItems.findIndex(i => i.id === item.parentId);
          let newParentId = item.parentId;
          if (parentIdx >= idx) newParentId = null;
          return { ...item, order: idx, parentId: newParentId };
        });
      });
    }
  };

  const updateLabel = (id: string, newLabel: string) => {
    setMenuItems(items => items.map(i => i.id === id ? { ...i, label: newLabel } : i));
  };

  const updateUrl = (id: string, newUrl: string) => {
    setMenuItems(items => items.map(i => i.id === id ? { ...i, url: newUrl } : i));
  };

  const removeItem = (id: any) => {
    setMenuItems(items => items.filter(i => i.id !== id).map(i => 
      i.parentId === id ? { ...i, parentId: null } : i
    ));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    setMenuItems(items => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const newItems = arrayMove(items, index, newIndex);
      return newItems.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  const indentItem = (index: number) => {
    if (index === 0) return;
    setMenuItems(items => {
      const newItems = [...items];
      const potentialParent = newItems[index - 1];
      newItems[index] = { ...newItems[index], parentId: potentialParent.id };
      return newItems;
    });
  };

  const outdentItem = (index: number) => {
    setMenuItems(items => {
      const newItems = [...items];
      const item = newItems[index];
      if (!item.parentId) return items;
      
      const parent = items.find(i => i.id === item.parentId);
      newItems[index] = { ...item, parentId: parent?.parentId || null };
      return newItems;
    });
  };

  const handleSaveMenu = async () => {
    if (!activeMenuId) return;
    setIsSaving(true);
    
    try {
      const res = await fetch(`${BASE_PATH}/api/menus/${activeMenuId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: menuItems }),
      });
      if (res.ok) {
        toast.success('Menu saved successfully!');
        fetchData();
      } else {
        toast.error('Failed to save menu');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>;
  }

  const activeMenu = menus.find(m => m.id === activeMenuId);

  const getDepth = (item: any, allItems: any[]) => {
    let depth = 0;
    let current = item;
    while (current?.parentId) {
      depth++;
      current = allItems.find(i => i.id === current.parentId);
    }
    return depth;
  };

  return (
    <div className="max-w-[1100px] text-[#2c3338]">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-normal">Menus</h1>
      </div>

      <div className="bg-white border border-[#c3c4c7] p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="font-semibold text-[13px]">Select a menu to edit:</label>
          <select
            value={activeMenuId || ''}
            onChange={(e) => handleSelectMenu(parseInt(e.target.value))}
            className="border border-[#8c8f94] rounded-[3px] px-2 py-1 text-[13px] outline-none focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde]"
          >
            {menus.map(menu => (
              <option key={menu.id} value={menu.id}>{menu.name}</option>
            ))}
          </select>
          <button className="px-3 py-1 border border-[#c3c4c7] text-[#5e3fde] bg-[#f6f7f7] rounded-[3px] text-[13px] hover:bg-[#f0f0f1]">Select</button>
        </div>
        <div className="text-[13px]">
          or <a href="#" onClick={(e) => { e.preventDefault(); setActiveMenuId(null); }} className="text-[#5e3fde] hover:underline">create a new menu</a>.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        
        {/* Left Column - Add Items */}
        <div>
          <h2 className="font-semibold text-[14px] mb-3">Add menu items</h2>
          
          <div className="space-y-[-1px]">
            {/* Pages Accordion */}
            <AddMenuAccordion title="Pages" isOpen={openPanel === 'pages'} onToggle={() => setOpenPanel(openPanel === 'pages' ? '' : 'pages')}>
              <div className="max-h-48 overflow-y-auto bg-white border border-[#c3c4c7] p-2 mb-3">
                {pages.length === 0 ? <p className="text-[13px] text-gray-500">No pages found.</p> : pages.map(page => (
                  <label key={page.id} className="flex items-start gap-2 mb-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={selectedPages.includes(page.id)}
                      onChange={() => setSelectedPages(prev => prev.includes(page.id) ? prev.filter(x => x !== page.id) : [...prev, page.id])}
                    />
                    <span className="text-[13px] text-[#2c3338]">{page.title}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={handleAddPages} className="px-3 py-1 bg-white border border-[#c3c4c7] text-[#5e3fde] rounded-[3px] text-[13px] hover:bg-[#f6f7f7]">Add to Menu</button>
              </div>
            </AddMenuAccordion>

            {/* Posts Accordion */}
            <AddMenuAccordion title="Posts" isOpen={openPanel === 'posts'} onToggle={() => setOpenPanel(openPanel === 'posts' ? '' : 'posts')}>
              <div className="max-h-48 overflow-y-auto bg-white border border-[#c3c4c7] p-2 mb-3">
                {posts.length === 0 ? <p className="text-[13px] text-gray-500">No posts found.</p> : posts.map(post => (
                  <label key={post.id} className="flex items-start gap-2 mb-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={selectedPosts.includes(post.id)}
                      onChange={() => setSelectedPosts(prev => prev.includes(post.id) ? prev.filter(x => x !== post.id) : [...prev, post.id])}
                    />
                    <span className="text-[13px] text-[#2c3338]">{post.title}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={handleAddPosts} className="px-3 py-1 bg-white border border-[#c3c4c7] text-[#5e3fde] rounded-[3px] text-[13px] hover:bg-[#f6f7f7]">Add to Menu</button>
              </div>
            </AddMenuAccordion>

            {/* Custom Links Accordion */}
            <AddMenuAccordion title="Custom Links" isOpen={openPanel === 'custom'} onToggle={() => setOpenPanel(openPanel === 'custom' ? '' : 'custom')}>
              <div className="space-y-3 mb-3">
                <div>
                  <label className="block text-[13px] text-[#646970] mb-1">URL</label>
                  <input type="text" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="http://" className="w-full text-[13px] border border-[#8c8f94] px-2 py-1 outline-none focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde]" />
                </div>
                <div>
                  <label className="block text-[13px] text-[#646970] mb-1">Link Text</label>
                  <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="w-full text-[13px] border border-[#8c8f94] px-2 py-1 outline-none focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde]" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleAddCustom} className="px-3 py-1 bg-white border border-[#c3c4c7] text-[#5e3fde] rounded-[3px] text-[13px] hover:bg-[#f6f7f7]">Add to Menu</button>
              </div>
            </AddMenuAccordion>
          </div>
        </div>

        {/* Right Column - Menu Structure */}
        <div>
          <h2 className="font-semibold text-[14px] mb-3">Menu structure</h2>
          
          <div className="bg-white border border-[#c3c4c7] min-h-[400px] flex flex-col">
            
            {/* Menu Header Edit Name */}
            <div className="bg-[#f6f7f7] border-b border-[#c3c4c7] p-4 flex flex-wrap items-center justify-between gap-4">
              {activeMenu ? (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <label className="font-semibold text-[13px]">Menu Name</label>
                  <input 
                    type="text" 
                    value={activeMenu.name}
                    disabled
                    className="border border-[#8c8f94] rounded-[3px] px-2 py-1 text-[13px] w-full sm:w-64 bg-gray-50"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <label className="font-semibold text-[13px]">Menu Name</label>
                  <input 
                    type="text" 
                    value={newMenuName}
                    onChange={(e) => setNewMenuName(e.target.value)}
                    placeholder="Enter menu name here"
                    className="border border-[#8c8f94] rounded-[3px] px-2 py-1 text-[13px] w-full sm:w-64 outline-none focus:border-[#5e3fde] focus:ring-1 focus:ring-[#5e3fde]"
                  />
                  <button onClick={handleCreateMenu} className="px-4 py-1.5 bg-[#5e3fde] text-white rounded-[3px] text-[13px] hover:bg-[#4b32b2] whitespace-nowrap">Create Menu</button>
                </div>
              )}
              
              {activeMenu && (
                <button
                  onClick={handleSaveMenu}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-[#5e3fde] text-white rounded-[3px] text-[13px] hover:bg-[#4b32b2] disabled:opacity-50 flex items-center gap-2 ml-auto"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  Save Menu
                </button>
              )}
            </div>

            {/* Menu Canvas */}
            <div className="flex-1 p-4 bg-[#f0f0f1]">
              {!activeMenu ? (
                <div className="text-[13px] text-[#646970]">
                  Give your menu a name, then click Create Menu.
                </div>
              ) : menuItems.length === 0 ? (
                <div className="text-[13px] text-[#646970]">
                  Drag the items into the order you prefer. Click the arrow on the right of the item to reveal additional configuration options.
                </div>
              ) : (
                <div className="max-w-[500px]">
                  <p className="text-[13px] text-[#646970] mb-4">
                    Drag the items into the order you prefer. Click the arrow on the right of the item to reveal additional configuration options.
                  </p>
                  
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={menuItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-[-1px]">
                        {menuItems.map((item, index) => {
                          const depth = getDepth(item, menuItems);
                          const canIndent = index > 0 && depth < 3;
                          return (
                            <div key={item.id} style={{ marginLeft: `${depth * 30}px` }}>
                                <SortableMenuItem 
                                  item={item} 
                                  index={index}
                                  canIndent={canIndent}
                                  onIndent={() => indentItem(index)}
                                  onOutdent={() => outdentItem(index)}
                                  onRemove={() => removeItem(item.id)}
                                  onUpdateLabel={updateLabel}
                                  onUpdateUrl={updateUrl}
                                  moveUp={() => moveItem(index, 'up')}
                                  moveDown={() => moveItem(index, 'down')}
                                  isFirst={index === 0}
                                  isLast={index === menuItems.length - 1}
                                  pages={pages}
                                  posts={posts}
                                />
                            </div>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>

            {/* Menu Footer */}
            {activeMenu && (
              <div className="bg-[#f6f7f7] border-t border-[#c3c4c7] p-4 flex items-center justify-between">
                <button onClick={handleDeleteMenu} className="text-[#d63638] hover:underline text-[13px]">
                  Delete Menu
                </button>
                <button
                  onClick={handleSaveMenu}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-[#5e3fde] text-white rounded-[3px] text-[13px] hover:bg-[#4b32b2] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  Save Menu
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

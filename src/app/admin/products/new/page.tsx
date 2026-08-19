'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Image as ImageIcon, MapPin, Eye, Calendar } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import TipTapEditor from '@/components/TipTapEditor';
import MediaModal from '@/components/MediaModal';
import { Accordion } from '@/components/ClassicSidebar';
import { BASE_PATH } from '@/lib/config';

export default function NewProductPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [tempSlug, setTempSlug] = useState('');
  
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingVisibility, setEditingVisibility] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [visibility, setVisibility] = useState('Public');
  const [password, setPassword] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [seoScore, setSeoScore] = useState(0);

  const [origin, setOrigin] = useState('');
  const [globalAttributes, setGlobalAttributes] = useState<any[]>([]);
  const [selectedGlobalAttr, setSelectedGlobalAttr] = useState('');
  
  const [courses, setCourses] = useState<any[]>([]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    fetch(`${BASE_PATH}/api/products/attributes`)
      .then(res => res.json())
      .then(data => setGlobalAttributes(data))
      .catch(console.error);
      
    fetch(`${BASE_PATH}/api/courses`)
      .then(res => res.json())
      .then(data => setCourses(data))
      .catch(console.error);
  }, []);
  
  const [product, setProduct] = useState({
    title: '',
    slug: '',
    description: '',
    type: 'SIMPLE',
    price: '',
    salePrice: '',
    sku: '',
    manageStock: false,
    stockQuantity: 0,
    status: 'Published',
    featuredImage: '',
    linkedCourseId: '',
    attributes: [] as { name: string; options: string; visible: boolean; variation: boolean; isGlobal: boolean }[],
    variations: [] as { attributes: string; price: string; salePrice: string; sku: string; manageStock: boolean; stockQuantity: number }[]
  });

  const [expanded, setExpanded] = useState({
    publish: true,
    productImage: true,
    productGallery: true,
    categories: true
  });
  const toggleAccordion = (section: keyof typeof expanded) => setExpanded(prev => ({...prev, [section]: !prev[section]}));

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (overrideStatus?: string) => {
    if (!product.title) {
      toast.error('Product title is required');
      return;
    }

    setIsSaving(true);
    const finalStatus = overrideStatus || product.status;
    try {
      const res = await fetch(`${BASE_PATH}/api/products/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, status: finalStatus, createdAt: publishDate || undefined })
      });
      
      if (!res.ok) throw new Error('Failed to create product');
      const data = await res.json();
      
      toast.success('Product created successfully');
      router.push(`/admin/products/${data.id}/edit`);
    } catch (error) {
      toast.error('Error creating product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1200px] text-[#2c3338]">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/products" className="p-2 border border-[#c3c4c7] rounded hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-normal flex-1">Add New Product</h1>
        <button
          onClick={() => handleSave()}
          disabled={isSaving}
          className="px-4 py-2 bg-[#5e3fde] text-white rounded-[3px] text-[13px] font-medium hover:bg-[#4b32b2] disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Product
        </button>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-[#c3c4c7] p-0">
            <input
              type="text"
              name="title"
              value={product.title}
              onChange={handleChange}
              placeholder="Product Name"
              className="w-full text-xl px-4 py-3 outline-none border-b border-[#c3c4c7]"
            />
            {product.title && (
              <div className="px-4 py-2 flex items-center gap-1 text-[13px] text-[#50575e] border-b border-[#c3c4c7]">
                <span className="font-semibold">Permalink:</span>
                <span className="text-[#0073aa]">
                  {origin ? origin : 'http://localhost:3000'}/product/
                  {isEditingSlug ? (
                    <input 
                      type="text" 
                      value={tempSlug} 
                      onChange={(e) => setTempSlug(e.target.value)}
                      className="border border-[#8c8f94] rounded-[3px] px-1 h-[22px] bg-white ml-1 text-black outline-none"
                    />
                  ) : (
                    <span>{product.slug || product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}</span>
                  )}
                  /
                </span>
                {isEditingSlug ? (
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => {
                      setProduct(prev => ({...prev, slug: tempSlug}));
                      setIsEditingSlug(false);
                    }} className="bg-[#f3f5f6] border border-[#0071a1] text-[#0071a1] px-2 py-0.5 rounded-[3px] hover:bg-[#f1f1f1]">OK</button>
                    <button onClick={() => setIsEditingSlug(false)} className="text-[#0071a1] underline px-2 py-0.5 hover:text-[#005a80]">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => {
                    setTempSlug(product.slug || product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                    setIsEditingSlug(true);
                  }} className="ml-2 bg-[#f3f5f6] border border-[#0071a1] text-[#0071a1] px-2 py-0.5 rounded-[3px] hover:bg-[#f1f1f1]">Edit</button>
                )}
              </div>
            )}
            <div className="p-4 h-[400px]">
              <TipTapEditor 
                content={product.description} 
                onChange={(content) => setProduct(prev => ({ ...prev, description: content }))}
              />
            </div>
          </div>

          {/* Product Data Meta Box */}
          <div className="bg-white border border-[#c3c4c7]">
            <div className="px-4 py-3 border-b border-[#c3c4c7] bg-[#f6f7f7] flex items-center gap-4">
              <h2 className="text-[14px] font-semibold text-gray-800">Product Data — </h2>
              <select 
                name="type" 
                value={product.type} 
                onChange={handleChange}
                className="border border-[#8c8f94] rounded-[3px] px-2 py-1 text-[13px] outline-none focus:border-[#5e3fde]"
              >
                <option value="SIMPLE">Simple product</option>
                <option value="VARIABLE">Variable product</option>
              </select>
            </div>
            
            <div className="flex min-h-[250px]">
              {/* Tabs Sidebar */}
              <div className="w-48 bg-[#f6f7f7] border-r border-[#c3c4c7] flex flex-col">
                <button 
                  onClick={() => setActiveTab('general')}
                  className={`text-left px-4 py-2.5 text-[13px] ${activeTab === 'general' ? 'bg-white font-semibold border-l-4 border-[#5e3fde] text-[#5e3fde]' : 'hover:bg-[#f0f0f1] text-gray-700'}`}
                >
                  General
                </button>
                <button 
                  onClick={() => setActiveTab('inventory')}
                  className={`text-left px-4 py-2.5 text-[13px] ${activeTab === 'inventory' ? 'bg-white font-semibold border-l-4 border-[#5e3fde] text-[#5e3fde]' : 'hover:bg-[#f0f0f1] text-gray-700'}`}
                >
                  Inventory
                </button>
                <button 
                  onClick={() => setActiveTab('attributes')}
                  className={`text-left px-4 py-2.5 text-[13px] ${activeTab === 'attributes' ? 'bg-white font-semibold border-l-4 border-[#5e3fde] text-[#5e3fde]' : 'hover:bg-[#f0f0f1] text-gray-700'}`}
                >
                  Attributes
                </button>
                {product.type === 'VARIABLE' && (
                  <button 
                    onClick={() => setActiveTab('variations')}
                    className={`text-left px-4 py-2.5 text-[13px] ${activeTab === 'variations' ? 'bg-white font-semibold border-l-4 border-[#5e3fde] text-[#5e3fde]' : 'hover:bg-[#f0f0f1] text-gray-700'}`}
                  >
                    Variations
                  </button>
                )}
              </div>
              
              {/* Tab Content */}
              <div className="flex-1 p-6">
                {activeTab === 'general' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                      <label className="text-[13px] text-gray-600 text-right">Regular price ($)</label>
                      <input 
                        type="number" 
                        name="price" 
                        value={product.price} 
                        onChange={handleChange}
                        className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-48 outline-none focus:border-[#5e3fde]" 
                        step="0.01"
                      />
                    </div>
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                      <label className="text-[13px] text-gray-600 text-right">Sale price ($)</label>
                      <input 
                        type="number" 
                        name="salePrice" 
                        value={product.salePrice} 
                        onChange={handleChange}
                        className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-48 outline-none focus:border-[#5e3fde]" 
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="w-32 text-right text-[13px] text-[#50575e]">Linked Course</label>
                      <select
                        name="linkedCourseId"
                        value={product.linkedCourseId}
                        onChange={handleChange}
                        className="w-1/2 border border-[#8c8f94] rounded-[3px] px-2 py-1 text-[13px] outline-none focus:border-[#5e3fde]"
                      >
                        <option value="">None</option>
                        {courses.map((course: any) => (
                          <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                {activeTab === 'inventory' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                      <label className="text-[13px] text-gray-600 text-right">SKU</label>
                      <input 
                        type="text" 
                        name="sku" 
                        value={product.sku} 
                        onChange={handleChange}
                        className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-48 outline-none focus:border-[#5e3fde]" 
                      />
                    </div>
                    <div className="grid grid-cols-[150px_1fr] items-center gap-4 pt-4 border-t border-gray-100">
                      <label className="text-[13px] text-gray-600 text-right">Manage stock?</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          name="manageStock" 
                          checked={product.manageStock} 
                          onChange={handleChange}
                          className="w-4 h-4 text-[#5e3fde] focus:ring-[#5e3fde] rounded" 
                        />
                        <span className="text-[13px] text-gray-600">Track stock quantity for this product</span>
                      </label>
                    </div>
                    
                    {product.manageStock && (
                      <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <label className="text-[13px] text-gray-600 text-right">Stock quantity</label>
                        <input 
                          type="number" 
                          name="stockQuantity" 
                          value={product.stockQuantity} 
                          onChange={handleChange}
                          className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-48 outline-none focus:border-[#5e3fde]" 
                        />
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'attributes' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 mb-4">Add descriptive pieces of information that customers can use to search for this product on your store, such as "Material" or "Size".</p>
                    
                    <div className="flex gap-2 mb-4 p-3 bg-gray-50 border border-[#c3c4c7] items-center">
                      <select 
                        value={selectedGlobalAttr} 
                        onChange={(e) => setSelectedGlobalAttr(e.target.value)}
                        className="border border-[#8c8f94] px-2 py-1.5 text-[13px] outline-none min-w-[200px]"
                      >
                        <option value="">Custom product attribute</option>
                        {globalAttributes.map(ga => (
                          <option key={ga.id} value={ga.id}>{ga.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => {
                          if (!selectedGlobalAttr) {
                            setProduct(prev => ({
                              ...prev, 
                              attributes: [...prev.attributes, { name: '', options: '', visible: true, variation: false, isGlobal: false }]
                            }));
                          } else {
                            const ga = globalAttributes.find(a => a.id === parseInt(selectedGlobalAttr));
                            if (ga && !product.attributes.find(a => a.name === ga.name)) {
                              setProduct(prev => ({
                                ...prev, 
                                attributes: [...prev.attributes, { name: ga.name, options: '', visible: true, variation: false, isGlobal: true }]
                              }));
                            }
                          }
                          setSelectedGlobalAttr('');
                        }}
                        className="border border-[#c3c4c7] px-4 py-1.5 text-[13px] bg-white hover:bg-gray-100 font-medium"
                      >
                        Add
                      </button>
                    </div>

                    {product.attributes.map((attr, idx) => (
                      <div key={idx} className="border border-[#c3c4c7] p-3 bg-gray-50 mb-2">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#c3c4c7]">
                          <span className="font-semibold text-[13px]">{attr.name || 'New Attribute'}</span>
                          <button 
                            onClick={() => {
                              const newAttrs = product.attributes.filter((_, i) => i !== idx);
                              setProduct(prev => ({...prev, attributes: newAttrs}));
                            }}
                            className="text-red-500 text-xs hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex gap-6 items-start">
                          <div className="w-[200px] shrink-0 space-y-4">
                            <input 
                              type="text" 
                              placeholder="Name (e.g. Size)" 
                              value={attr.name}
                              onChange={(e) => {
                                const newAttrs = [...product.attributes];
                                newAttrs[idx].name = e.target.value;
                                setProduct(prev => ({...prev, attributes: newAttrs}));
                              }}
                              readOnly={attr.isGlobal}
                              className={`w-full border border-[#8c8f94] px-2 py-1.5 text-[13px] outline-none ${attr.isGlobal ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                            />
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-[12px] text-gray-700">
                                <input 
                                  type="checkbox" 
                                  checked={attr.visible} 
                                  onChange={(e) => {
                                    const newAttrs = [...product.attributes];
                                    newAttrs[idx].visible = e.target.checked;
                                    setProduct(prev => ({...prev, attributes: newAttrs}));
                                  }}
                                  className="w-3.5 h-3.5 text-[#5e3fde] rounded-sm focus:ring-0"
                                />
                                Visible on the product page
                              </label>
                              <label className="flex items-center gap-2 text-[12px] text-gray-700">
                                <input 
                                  type="checkbox" 
                                  checked={attr.variation} 
                                  onChange={(e) => {
                                    const newAttrs = [...product.attributes];
                                    newAttrs[idx].variation = e.target.checked;
                                    setProduct(prev => ({...prev, attributes: newAttrs}));
                                  }}
                                  className="w-3.5 h-3.5 text-[#5e3fde] rounded-sm focus:ring-0"
                                />
                                Used for variations
                              </label>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            {attr.isGlobal ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        const terms = globalAttributes.find(ga => ga.name === attr.name)?.terms || [];
                                        const newAttrs = [...product.attributes];
                                        newAttrs[idx].options = terms.map((t: any) => t.name).join(' | ');
                                        setProduct(prev => ({...prev, attributes: newAttrs}));
                                      }}
                                      className="bg-[#f3f5f6] border border-[#0071a1] text-[#0071a1] px-2 py-0.5 rounded-[3px] text-[12px] hover:bg-[#f1f1f1]"
                                    >Select all</button>
                                    <button 
                                      onClick={() => {
                                        const newAttrs = [...product.attributes];
                                        newAttrs[idx].options = '';
                                        setProduct(prev => ({...prev, attributes: newAttrs}));
                                      }}
                                      className="bg-[#f3f5f6] border border-[#0071a1] text-[#0071a1] px-2 py-0.5 rounded-[3px] text-[12px] hover:bg-[#f1f1f1]"
                                    >Select none</button>
                                  </div>
                                </div>
                                {globalAttributes.find(ga => ga.name === attr.name)?.terms?.length ? (
                                  <select 
                                    multiple
                                    value={attr.options.split('|').map(s => s.trim()).filter(Boolean)}
                                    onChange={(e) => {
                                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                                      const newAttrs = [...product.attributes];
                                      newAttrs[idx].options = selected.join(' | ');
                                      setProduct(prev => ({...prev, attributes: newAttrs}));
                                    }}
                                    className="w-full border border-[#8c8f94] px-2 py-1 text-[13px] outline-none h-[120px]"
                                  >
                                    {globalAttributes.find(ga => ga.name === attr.name)?.terms?.map((t: any) => (
                                      <option key={t.id} value={t.name}>{t.name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="w-full border border-[#8c8f94] bg-white text-gray-500 flex items-center justify-center text-[13px] h-[120px]">
                                    No terms exist. <Link href={`/admin/products/attributes/${globalAttributes.find(ga => ga.name === attr.name)?.id}`} target="_blank" className="text-[#0071a1] ml-1 hover:underline">Add new terms</Link>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <textarea 
                                placeholder="Values (e.g. Small | Medium | Large). Separate options with a pipe (|)." 
                                value={attr.options}
                                onChange={(e) => {
                                  const newAttrs = [...product.attributes];
                                  newAttrs[idx].options = e.target.value;
                                  setProduct(prev => ({...prev, attributes: newAttrs}));
                                }}
                                className="w-full border border-[#8c8f94] px-2 py-1 text-[13px] outline-none h-[120px]"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'variations' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 mb-4">Add variations manually after you have defined attributes.</p>
                    {product.variations.map((v, idx) => (
                      <div key={idx} className="border border-[#c3c4c7] p-3 bg-gray-50 mb-4 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-[13px]">Variation #{idx + 1}</span>
                          <button 
                            onClick={() => {
                              const newVars = product.variations.filter((_, i) => i !== idx);
                              setProduct(prev => ({...prev, variations: newVars}));
                            }}
                            className="text-red-500 text-xs hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2 mb-2">
                            <label className="text-[13px] font-semibold text-gray-700 block">Variation Attributes</label>
                            {product.attributes.filter(a => a.variation).length === 0 && (
                              <p className="text-xs text-red-500">Please define attributes and check "Used for variations" first.</p>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              {product.attributes.filter(a => a.variation).map(attr => {
                                if (!attr.name) return null;
                                const opts = (attr.options || '').split('|').map(s => s.trim()).filter(Boolean);
                                if (opts.length === 0) return null;
                                
                                let currentVal = '';
                                try {
                                  const parsed = JSON.parse(v.attributes || '{}');
                                  currentVal = parsed[attr.name] || '';
                                } catch(e) {}

                                return (
                                  <div key={attr.name} className="space-y-1">
                                    <label className="text-[12px] text-gray-600 block">{attr.name}</label>
                                    <select
                                      value={currentVal}
                                      onChange={(e) => {
                                        const newVars = [...product.variations];
                                        try {
                                          const parsed = JSON.parse(v.attributes || '{}');
                                          if (e.target.value) {
                                            parsed[attr.name] = e.target.value;
                                          } else {
                                            delete parsed[attr.name];
                                          }
                                          newVars[idx].attributes = JSON.stringify(parsed);
                                          setProduct(prev => ({...prev, variations: newVars}));
                                        } catch(err) {}
                                      }}
                                      className="w-full border border-[#8c8f94] px-2 py-1 text-[13px] bg-white outline-none"
                                    >
                                      <option value="">Any {attr.name}...</option>
                                      {opts.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[12px] text-gray-600 block">SKU</label>
                            <input 
                              type="text"
                              value={v.sku}
                              onChange={(e) => {
                                const newVars = [...product.variations];
                                newVars[idx].sku = e.target.value;
                                setProduct(prev => ({...prev, variations: newVars}));
                              }}
                              className="w-full border border-[#8c8f94] px-2 py-1 text-[13px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[12px] text-gray-600 block">Regular Price</label>
                            <input 
                              type="number"
                              value={v.price}
                              onChange={(e) => {
                                const newVars = [...product.variations];
                                newVars[idx].price = e.target.value;
                                setProduct(prev => ({...prev, variations: newVars}));
                              }}
                              className="w-full border border-[#8c8f94] px-2 py-1 text-[13px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[12px] text-gray-600 block">Sale Price</label>
                            <input 
                              type="number"
                              value={v.salePrice}
                              onChange={(e) => {
                                const newVars = [...product.variations];
                                newVars[idx].salePrice = e.target.value;
                                setProduct(prev => ({...prev, variations: newVars}));
                              }}
                              className="w-full border border-[#8c8f94] px-2 py-1 text-[13px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        setProduct(prev => ({
                          ...prev, 
                          variations: [...prev.variations, { attributes: '{}', price: '', salePrice: '', sku: '', manageStock: false, stockQuantity: 0 }]
                        }));
                      }}
                      className="border border-[#c3c4c7] px-3 py-1.5 text-[13px] bg-white hover:bg-gray-50"
                    >
                      Add Variation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[280px] shrink-0 font-sans">
          {/* Publish Box */}
          <Accordion id="publish" title="Publish" expanded={expanded.publish} toggleAccordion={() => toggleAccordion('publish')} noPadding>
            <div className="p-3 bg-white">
              <div className="flex justify-between mb-4">
                <button 
                  onClick={() => {
                    const newStatus = 'Draft';
                    setProduct(prev => ({...prev, status: newStatus}));
                    handleSave(newStatus);
                  }}
                  disabled={isSaving}
                  className="bg-white border border-[#5e3fde] text-[#5e3fde] px-3 py-1 rounded-[3px] text-[13px] hover:bg-[#f6f7f7] disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button className="bg-[#f3f5f6] border border-[#0071a1] text-[#0071a1] px-3 py-1 rounded-[3px] text-[13px] hover:bg-[#f1f1f1]">
                  Preview
                </button>
              </div>
              
              <div className="space-y-3 text-[13px] text-[#50575e] mb-4">
                {/* Status */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" /> 
                    <span>Status: <span className="font-semibold text-[#1d2327]">{product.status}</span></span>
                    {!editingStatus && <button onClick={() => setEditingStatus(true)} className="text-[#0071a1] hover:underline ml-1">Edit</button>}
                  </div>
                  {editingStatus && (
                    <div className="flex items-center gap-2 mt-1">
                      <select 
                        value={product.status} 
                        onChange={(e) => setProduct(prev => ({...prev, status: e.target.value}))}
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
                    {!editingVisibility && <button onClick={() => setEditingVisibility(true)} className="text-[#0071a1] hover:underline ml-1">Edit</button>}
                  </div>
                  {editingVisibility && (
                    <div className="flex flex-col gap-1 mt-1">
                      <label className="flex items-center gap-2"><input type="radio" name="vis" checked={visibility === 'Public'} onChange={() => setVisibility('Public')} /> Public</label>
                      <label className="flex items-center gap-2"><input type="radio" name="vis" checked={visibility === 'Password Protected'} onChange={() => setVisibility('Password Protected')} /> Password Protected</label>
                      {visibility === 'Password Protected' && (
                        <div className="pl-6 mt-1 mb-1">
                          <label className="block text-xs text-gray-500 mb-1">Password:</label>
                          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="border border-[#8c8f94] rounded-[3px] px-2 py-1 outline-none text-[13px] w-full" />
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
                    {!editingDate && <button onClick={() => setEditingDate(true)} className="text-[#0071a1] hover:underline ml-1">Edit</button>}
                  </div>
                  {editingDate && (
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
                           setPublishDate('');
                           setEditingDate(false);
                        }} className="text-[#0071a1] hover:underline">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className={`p-2 text-center text-[13px] font-semibold border-t border-[#c3c4c7] ${seoScore > 50 ? (seoScore >= 80 ? 'bg-[#c6e1c6] text-[#007017]' : 'bg-[#f0b849] text-[#8a6d3b]') : 'bg-[#ffaba8] text-[#d63638]'}`}>
              <div className="flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                SEO: {seoScore} / 100
              </div>
            </div>

            <div className="p-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex justify-between items-center">
              <button className="text-[#b32d2e] text-[13px] hover:underline">Move to Trash</button>
              <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="bg-[#5e3fde] text-white px-4 py-1.5 rounded-[3px] text-[13px] font-semibold hover:bg-[#4b32b2] disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : (product.status === 'Published' ? 'Update' : 'Publish')}
              </button>
            </div>
          </Accordion>

          {/* Product Image */}
          <Accordion id="productImage" title="Product image" expanded={expanded.productImage} toggleAccordion={() => toggleAccordion('productImage')}>
            {product.featuredImage ? (
              <div className="text-center">
                <img src={product.featuredImage} alt="Product image" className="w-full h-auto mb-2 rounded border border-gray-200" />
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setIsMediaModalOpen(true)} className="text-[#0071a1] text-[13px] hover:underline">Replace image</button>
                  <button onClick={() => setProduct(prev => ({ ...prev, featuredImage: '' }))} className="text-[#b32d2e] text-[13px] hover:underline">Remove product image</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsMediaModalOpen(true)} className="text-[#0071a1] text-[13px] hover:underline">Set product image</button>
            )}
          </Accordion>
          
          {/* Product Gallery */}
          <Accordion id="productGallery" title="Product gallery" expanded={expanded.productGallery} toggleAccordion={() => toggleAccordion('productGallery')}>
            <button onClick={() => setIsMediaModalOpen(true)} className="text-[#0071a1] text-[13px] hover:underline">Add product gallery images</button>
          </Accordion>
          
          {/* Product Categories */}
          <Accordion id="categories" title="Product categories" expanded={expanded.categories} toggleAccordion={() => toggleAccordion('categories')}>
            <p className="text-xs text-gray-500">Categories coming soon.</p>
          </Accordion>
        </div>
      </div>
      
      <MediaModal 
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onInsert={(url) => setProduct(prev => ({ ...prev, featuredImage: url }))}
      />
    </div>
  );
}

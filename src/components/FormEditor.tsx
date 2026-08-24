'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Save, Plus, Trash2, ArrowLeft, ArrowUp, ArrowDown, Settings, GripVertical, CheckSquare, Type, Mail, AlignLeft, ChevronDown, List, CircleDot, Hash, Phone, Calendar, UploadCloud, Code, Globe } from 'lucide-react';
import Link from 'next/link';
import FormNav from './FormNav';
import { BASE_PATH } from '@/lib/config';

const FIELD_TYPES = [
  { id: 'text', label: 'Single Line Text', icon: Type },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'textarea', label: 'Paragraph Text', icon: AlignLeft },
  { id: 'select', label: 'Dropdown', icon: ChevronDown },
  { id: 'radio', label: 'Radio Buttons', icon: CircleDot },
  { id: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
  { id: 'number', label: 'Number', icon: Hash },
  { id: 'tel', label: 'Phone', icon: Phone },
  { id: 'date', label: 'Date', icon: Calendar },
  { id: 'file', label: 'File Upload', icon: UploadCloud },
  { id: 'html', label: 'HTML Block', icon: Code },
  { id: 'consent', label: 'Consent Checkbox', icon: CheckSquare },
  { id: 'url', label: 'URL / Website', icon: Globe },
];

export default function FormEditor({ form }: { form?: any }) {
  const router = useRouter();
  const [title, setTitle] = useState(form?.title || 'Untitled Form');
  const [notificationEmail, setNotificationEmail] = useState(form?.notificationEmail || '');
  const [fields, setFields] = useState<any[]>(
    form?.fields ? JSON.parse(form.fields) : []
  );
  const [status, setStatus] = useState(form?.status || 'Published');
  const [settings, setSettings] = useState<any>(
    form?.settings ? JSON.parse(form.settings) : {
      submitText: 'Submit Form',
      successAction: 'message',
      successMessage: 'Your submission has been received successfully.',
      redirectUrl: '',
      enableHoneypot: true,
      enableRecaptchaV3: false,
      recaptchaSiteKey: '',
      recaptchaSecretKey: ''
    }
  );
  
  const [isSaving, setIsSaving] = useState(false);
  
  // UI State
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'add' | 'settings'>('add');

  const addField = (type: string) => {
    const newId = `field_${Date.now()}`;
    const typeLabel = FIELD_TYPES.find(f => f.id === type)?.label || 'Field';
    setFields([
      ...fields, 
      { 
        id: newId, 
        type, 
        label: `New ${typeLabel}`, 
        required: false,
        options: ['select', 'radio', 'checkbox'].includes(type) ? 'Option 1, Option 2, Option 3' : undefined,
        width: '100'
      }
    ]);
    setActiveFieldId(newId);
    setSidebarTab('settings');
  };

  const updateField = (id: string, key: string, value: any) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeField = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFields(fields.filter(f => f.id !== id));
    if (activeFieldId === id) {
      setActiveFieldId(null);
      setSidebarTab('add');
    }
  };

  const moveField = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;
    
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!title) {
      toast.error('Title is required');
      return;
    }
    
    setIsSaving(true);
    try {
      const payload: any = { title, notificationEmail, fields, settings, status };
      if (form) payload.id = form.id; // Include ID so the server knows to update
      
      const url = `${BASE_PATH}/api/forms`; // Always use the root URL that your host allows
      const method = 'POST'; // Always use POST
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      const savedForm = await res.json();
      toast.success(form ? 'Form updated' : 'Form created');
      
      if (!form && savedForm.id) {
        router.push(`/admin/forms/${savedForm.id}/edit`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error('Error saving form');
    } finally {
      setIsSaving(false);
    }
  };

  const activeField = fields.find(f => f.id === activeFieldId);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/forms" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{form ? 'Edit Form' : 'Create New Form'}</h1>
        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4b32b2] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      </div>
      
      {form && <FormNav formId={form.id} title={form.title} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT PANE: CANVAS */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8 min-h-[600px]">
            <input 
              type="text" 
              placeholder="Form Title" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-2xl font-bold border-none outline-none placeholder-gray-300 focus:ring-0 px-0 mb-6 text-gray-900"
            />

            {fields.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center mt-4">
                <p className="text-gray-500 mb-4">Your form is empty.</p>
                <button 
                  onClick={() => setSidebarTab('add')}
                  className="bg-[#5e3fde] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#4b32b2] transition"
                >
                  Add your first field
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap -mx-2">
                {fields.map((field, index) => {
                  let widthClass = "w-full";
                  if (field.width === '50') widthClass = "w-full sm:w-1/2";
                  else if (field.width === '33') widthClass = "w-full sm:w-1/3";
                  else if (field.width === '25') widthClass = "w-full sm:w-1/4";

                  const isActive = activeFieldId === field.id;

                  return (
                    <div key={field.id} className={`${widthClass} px-2 mb-4`}>
                      <div 
                        onClick={() => {
                          setActiveFieldId(field.id);
                          setSidebarTab('settings');
                        }}
                        className={`relative group p-4 rounded-xl border-2 transition-all cursor-pointer ${isActive ? 'border-[#5e3fde] bg-blue-50/30' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
                      >
                        {/* Hover Actions */}
                        <div className={`absolute -right-2 -top-2 flex flex-col gap-1 shadow-sm rounded-lg overflow-hidden bg-white border border-gray-200 transition-opacity z-10 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <button onClick={(e) => moveField(index, 'up', e)} disabled={index === 0} className="p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowUp size={14} /></button>
                          <button onClick={(e) => moveField(index, 'down', e)} disabled={index === fields.length - 1} className="p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowDown size={14} /></button>
                          <button onClick={(e) => removeField(field.id, e)} className="p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                        </div>

                        <label className="block text-sm font-semibold text-gray-700 mb-1 cursor-pointer">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.description && <p className="text-[11px] text-gray-500 mb-2">{field.description}</p>}
                        
                        <div className="pointer-events-none">
                          {['textarea'].includes(field.type) ? (
                            <textarea placeholder={field.placeholder} disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400" rows={2} />
                          ) : ['select'].includes(field.type) ? (
                            <select disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400">
                              <option>Select an option</option>
                            </select>
                          ) : ['radio', 'checkbox'].includes(field.type) ? (
                            <div className="space-y-1">
                              {field.options?.split(',').slice(0, 3).map((opt: string, i: number) => (
                                <label key={i} className="flex items-center gap-2 text-sm text-gray-400"><input type={field.type} disabled /> {opt.trim()}</label>
                              ))}
                            </div>
                          ) : field.type === 'file' ? (
                            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 border-dashed rounded-lg text-sm text-gray-400 text-center">Choose File...</div>
                          ) : (
                            <input type={field.type} placeholder={field.placeholder} disabled className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 px-6">
              <div 
                onClick={() => {
                  setActiveFieldId('submit');
                  setSidebarTab('settings');
                }}
                className={`inline-block relative group p-2 rounded-xl border-2 transition-all cursor-pointer ${activeFieldId === 'submit' ? 'border-[#5e3fde] bg-blue-50/30' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
              >
                <button className="bg-[#5e3fde] text-white font-semibold py-3 px-6 rounded-xl text-[15px] opacity-80 pointer-events-none">
                  {settings.submitText || 'Submit Form'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: SIDEBAR */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl sticky top-8 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button 
                onClick={() => setSidebarTab('add')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${sidebarTab === 'add' ? 'border-[#5e3fde] text-[#5e3fde] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                Add Fields
              </button>
              <button 
                onClick={() => setSidebarTab('settings')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${sidebarTab === 'settings' ? 'border-[#5e3fde] text-[#5e3fde] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                Field Settings
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {sidebarTab === 'add' && (
                <div className="grid grid-cols-2 gap-3">
                  {FIELD_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => addField(type.id)}
                      className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-[#5e3fde] hover:bg-blue-50/50 transition-all gap-2 group"
                    >
                      <type.icon size={20} className="text-gray-400 group-hover:text-[#5e3fde] transition-colors" />
                      <span className="text-xs font-medium text-gray-600 group-hover:text-[#5e3fde] transition-colors text-center leading-tight">
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {sidebarTab === 'settings' && (
                <div>
                  {activeFieldId === 'submit' ? (
                    <div className="space-y-5 pb-8">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Submit Button Text</label>
                        <input 
                          type="text" 
                          value={settings.submitText || 'Submit Form'}
                          onChange={e => setSettings({...settings, submitText: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                        />
                      </div>
                    </div>
                  ) : !activeField ? (
                    <div className="text-center py-12 text-gray-500">
                      <Settings size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Click a field on the canvas to edit its settings.</p>
                    </div>
                  ) : (
                    <div className="space-y-5 pb-8">
                      {activeField.type !== 'html' && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Field Label</label>
                            <input 
                              type="text" 
                              value={activeField.label} 
                              onChange={e => updateField(activeField.id, 'label', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                            />
                            <label className="flex items-center gap-2 cursor-pointer mt-2 text-xs text-gray-600">
                              <input 
                                type="checkbox" 
                                checked={activeField.hideLabel || false}
                                onChange={e => updateField(activeField.id, 'hideLabel', e.target.checked)}
                                className="rounded text-[#5e3fde] focus:ring-[#5e3fde] w-3.5 h-3.5"
                              />
                              Hide label on the live form
                            </label>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Description</label>
                            <textarea 
                              value={activeField.description || ''} 
                              onChange={e => updateField(activeField.id, 'description', e.target.value)}
                              placeholder="Help text for the user"
                              rows={2}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Custom CSS Class</label>
                            <input 
                              type="text" 
                              value={activeField.customClass || ''} 
                              onChange={e => updateField(activeField.id, 'customClass', e.target.value)}
                              placeholder="e.g., hidden md:block"
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow font-mono"
                            />
                          </div>
                        </>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Field Type</label>
                          <select 
                            value={activeField.type}
                            onChange={e => updateField(activeField.id, 'type', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                          >
                            {FIELD_TYPES.map(type => (
                              <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Width</label>
                          <select 
                            value={activeField.width || '100'}
                            onChange={e => updateField(activeField.id, 'width', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                          >
                            <option value="100">100% (Full Width)</option>
                            <option value="50">50% (Half Width)</option>
                            <option value="33">33% (One Third)</option>
                            <option value="25">25% (One Quarter)</option>
                          </select>
                        </div>
                      </div>

                      {['select', 'radio', 'checkbox'].includes(activeField.type) && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Choices (comma separated)</label>
                          <textarea 
                            value={activeField.options || ''} 
                            onChange={e => updateField(activeField.id, 'options', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                          />
                        </div>
                      )}
                      
                      {activeField.type === 'html' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">HTML Content</label>
                          <textarea 
                            value={activeField.options || ''} 
                            onChange={e => updateField(activeField.id, 'options', e.target.value)}
                            placeholder="<p>Enter HTML here...</p>"
                            rows={8}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow font-mono"
                          />
                        </div>
                      )}

                      {activeField.type === 'consent' && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Consent Text (HTML allowed)</label>
                            <textarea 
                              value={activeField.options || ''} 
                              onChange={e => updateField(activeField.id, 'options', e.target.value)}
                              placeholder="I agree to the <a href='/privacy'>Privacy Policy</a>."
                              rows={3}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Custom Error Message</label>
                            <input 
                              type="text" 
                              value={activeField.placeholder || ''} 
                              onChange={e => updateField(activeField.id, 'placeholder', e.target.value)}
                              placeholder="You must agree to continue."
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                            />
                          </div>
                        </>
                      )}
                      
                      {!['select', 'radio', 'checkbox', 'file', 'html', 'consent'].includes(activeField.type) && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Placeholder</label>
                          <input 
                            type="text" 
                            value={activeField.placeholder || ''} 
                            onChange={e => updateField(activeField.id, 'placeholder', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                          />
                        </div>
                      )}

                      <div className="pt-4 border-t border-gray-100">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={activeField.required}
                            onChange={e => updateField(activeField.id, 'required', e.target.checked)}
                            className="rounded text-[#5e3fde] focus:ring-[#5e3fde] w-4 h-4"
                          />
                          <span className="text-sm font-semibold text-gray-700">Required Field</span>
                        </label>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                          <input 
                            type="checkbox" 
                            checked={activeField.conditionalLogic?.enabled || false}
                            onChange={e => updateField(activeField.id, 'conditionalLogic', { ...activeField.conditionalLogic, enabled: e.target.checked })}
                            className="rounded text-[#5e3fde] focus:ring-[#5e3fde]"
                          />
                          <span className="text-sm font-semibold text-gray-700">Enable Conditional Logic</span>
                        </label>
                        
                        {activeField.conditionalLogic?.enabled && (
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-blue-800 uppercase tracking-wider mb-1">Show this field if</label>
                              <select 
                                value={activeField.conditionalLogic.fieldId || ''}
                                onChange={e => updateField(activeField.id, 'conditionalLogic', { ...activeField.conditionalLogic, fieldId: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                              >
                                <option value="">Select a field...</option>
                                {fields.filter((f: any) => f.id !== activeField.id).map((f: any) => (
                                  <option key={f.id} value={f.id}>{f.label || f.id}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-blue-800 uppercase tracking-wider mb-1">Equals Value</label>
                              <input 
                                type="text"
                                value={activeField.conditionalLogic.equals || ''}
                                onChange={e => updateField(activeField.id, 'conditionalLogic', { ...activeField.conditionalLogic, equals: e.target.value })}
                                placeholder="Type expected value..."
                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

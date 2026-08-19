'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Save, Loader2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { countries } from '@/lib/countries';
import { BASE_PATH } from '@/lib/config';

export default function ShippingZonesManager() {
  const [zones, setZones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingZone, setEditingZone] = useState<any>(null); // null means list view, object means edit view

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/shipping`);
      if (res.ok) {
        const data = await res.json();
        setZones(data);
      }
    } catch (err) {
      toast.error('Failed to load shipping zones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddZone = async () => {
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Shipping Zone', regions: [] })
      });
      if (res.ok) {
        const newZone = await res.json();
        setZones([...zones, newZone]);
        setEditingZone(newZone); // Open it immediately for editing
      }
    } catch (err) {
      toast.error('Failed to create zone');
    }
  };

  const handleDeleteZone = async (id: number) => {
    if (!confirm('Are you sure you want to delete this shipping zone?')) return;
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/shipping/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setZones(zones.filter(z => z.id !== id));
        toast.success('Zone deleted');
      }
    } catch (err) {
      toast.error('Failed to delete zone');
    }
  };

  const handleSaveZone = async () => {
    if (!editingZone) return;
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/shipping/${editingZone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingZone)
      });
      if (res.ok) {
        const updatedZone = await res.json();
        setZones(zones.map(z => z.id === updatedZone.id ? updatedZone : z));
        toast.success('Zone saved successfully');
        setEditingZone(null); // Return to list view
      } else {
        toast.error('Failed to save zone');
      }
    } catch (err) {
      toast.error('Failed to save zone');
    }
  };

  const addMethod = () => {
    setEditingZone({
      ...editingZone,
      methods: [
        ...editingZone.methods,
        { name: 'Flat Rate', type: 'FLAT_RATE', cost: 0, enabled: true, isNew: true }
      ]
    });
  };

  const updateMethod = (index: number, field: string, value: any) => {
    const newMethods = [...editingZone.methods];
    newMethods[index] = { ...newMethods[index], [field]: value };
    setEditingZone({ ...editingZone, methods: newMethods });
  };

  const removeMethod = (index: number) => {
    const newMethods = [...editingZone.methods];
    newMethods.splice(index, 1);
    setEditingZone({ ...editingZone, methods: newMethods });
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block text-gray-400" /></div>;

  if (editingZone) {
    const selectedRegions = Array.isArray(editingZone.regions) 
      ? editingZone.regions 
      : (typeof editingZone.regions === 'string' ? JSON.parse(editingZone.regions || '[]') : []);

    return (
      <div className="bg-white border border-[#c3c4c7] rounded shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Globe className="text-[#5e3fde]" size={20} />
            <h2 className="text-lg font-semibold text-gray-800">Edit Shipping Zone</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingZone(null)} className="px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded bg-white">Cancel</button>
            <button onClick={handleSaveZone} className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#5e3fde] hover:bg-[#4b32b2] rounded flex items-center gap-2">
              <Save size={14} /> Save Zone
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Zone Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="text-[13px] font-semibold text-gray-700 mt-1">Zone name</label>
              <input 
                type="text" 
                value={editingZone.name} 
                onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full max-w-md focus:border-[#5e3fde] outline-none"
                placeholder="e.g. Domestic, Europe, Local Pickup"
              />
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4 items-start">
              <label className="text-[13px] font-semibold text-gray-700 mt-1">Zone regions</label>
              <div className="w-full max-w-md">
                <select
                  multiple
                  value={selectedRegions}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setEditingZone({ ...editingZone, regions: selected });
                  }}
                  className="border border-[#8c8f94] rounded-[3px] px-3 py-1.5 text-[13px] w-full focus:border-[#5e3fde] outline-none min-h-[150px]"
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple countries.</div>
                
                {selectedRegions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRegions.map((code: string) => {
                      const countryName = countries.find(c => c.code === code)?.name || code;
                      return (
                        <div key={code} className="inline-flex items-center gap-1 bg-[#5e3fde]/10 text-[#5e3fde] px-2 py-1 rounded text-xs font-medium">
                          {countryName}
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingZone({ ...editingZone, regions: selectedRegions.filter((c: string) => c !== code) });
                            }}
                            className="hover:text-[#4b32b2] ml-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Shipping Methods */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-gray-800">Shipping methods</h3>
                <p className="text-[12px] text-gray-500">Methods control how much customers pay for shipping to this zone.</p>
              </div>
              <button 
                onClick={addMethod}
                className="px-3 py-1.5 border border-gray-300 rounded text-[13px] font-medium hover:bg-gray-50 flex items-center gap-1"
              >
                <Plus size={14} /> Add shipping method
              </button>
            </div>

            {editingZone.methods?.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded border border-dashed border-gray-300 text-sm text-gray-500">
                You can add multiple shipping methods within this zone. Only customers within the zone will see them.
              </div>
            ) : (
              <table className="w-full text-left border border-gray-200 rounded overflow-hidden">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-2 px-4 text-[12px] font-semibold text-gray-600">Method Title</th>
                    <th className="py-2 px-4 text-[12px] font-semibold text-gray-600 w-48">Type</th>
                    <th className="py-2 px-4 text-[12px] font-semibold text-gray-600 w-32">Cost</th>
                    <th className="py-2 px-4 text-[12px] font-semibold text-gray-600 w-24 text-center">Enabled</th>
                    <th className="py-2 px-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {editingZone.methods.map((method: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="py-2 px-4">
                        <input 
                          type="text" value={method.name} 
                          onChange={(e) => updateMethod(index, 'name', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 w-full outline-none focus:border-[#5e3fde]"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <select 
                          value={method.type} 
                          onChange={(e) => updateMethod(index, 'type', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 w-full outline-none focus:border-[#5e3fde]"
                        >
                          <option value="FLAT_RATE">Flat Rate</option>
                          <option value="FREE_SHIPPING">Free Shipping</option>
                        </select>
                      </td>
                      <td className="py-2 px-4">
                        {method.type === 'FLAT_RATE' ? (
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-gray-400">$</span>
                            <input 
                              type="number" step="0.01" min="0" value={method.cost} 
                              onChange={(e) => updateMethod(index, 'cost', e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 pl-6 w-full outline-none focus:border-[#5e3fde]"
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 italic px-2">N/A</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <input 
                          type="checkbox" checked={method.enabled !== false}
                          onChange={(e) => updateMethod(index, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded text-[#5e3fde] focus:ring-[#5e3fde] cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button onClick={() => removeMethod(index)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Shipping zones</h2>
          <p className="text-[13px] text-gray-500">A shipping zone is a geographic region where a certain set of shipping methods and rates apply.</p>
        </div>
        <button 
          onClick={handleAddZone}
          className="px-4 py-2 bg-[#5e3fde] text-white rounded-[3px] text-[13px] font-medium hover:bg-[#4b32b2] transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> Add shipping zone
        </button>
      </div>
      
      {zones.length === 0 ? (
        <div className="border border-[#c3c4c7] rounded bg-[#f6f7f7] p-12 text-center text-gray-500 text-[14px]">
          No shipping zones have been created yet. Customers will not be able to checkout with physical products until a zone covers their country.
        </div>
      ) : (
        <div className="border border-[#c3c4c7] rounded bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-[#c3c4c7]">
              <tr>
                <th className="py-3 px-4 text-[13px] font-semibold text-gray-700">Zone name</th>
                <th className="py-3 px-4 text-[13px] font-semibold text-gray-700">Regions</th>
                <th className="py-3 px-4 text-[13px] font-semibold text-gray-700">Shipping methods</th>
                <th className="py-3 px-4 text-[13px] font-semibold text-gray-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {zones.map((zone) => {
                const regions = Array.isArray(zone.regions) ? zone.regions : JSON.parse(zone.regions || '[]');
                const regionText = regions.length === 0 ? 'Everywhere' : `${regions.length} region(s)`;
                
                return (
                  <tr key={zone.id} className="border-b border-gray-100 hover:bg-gray-50/50 last:border-0">
                    <td className="py-3 px-4 font-medium text-[#5e3fde]">
                      <button onClick={() => setEditingZone(zone)} className="hover:underline text-left">
                        {zone.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{regionText}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {zone.methods?.length || 0} method(s)
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingZone(zone)} className="text-gray-500 hover:text-[#5e3fde] transition-colors" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteZone(zone.id)} className="text-gray-500 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

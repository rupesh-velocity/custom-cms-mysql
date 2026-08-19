'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Save, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { countries } from '@/lib/countries';
import { BASE_PATH } from '@/lib/config';

export default function TaxManager() {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/taxes`);
      if (res.ok) {
        const data = await res.json();
        setTaxes(data);
      }
    } catch (err) {
      toast.error('Failed to load tax rates');
    } finally {
      setIsLoading(false);
    }
  };

  const addTaxRate = () => {
    setTaxes([
      ...taxes,
      { id: 'new_' + Date.now(), country: 'US', state: '*', city: '*', zip: '*', rate: 0, name: 'State Tax', isNew: true }
    ]);
  };

  const updateTax = (index: number, field: string, value: any) => {
    const newTaxes = [...taxes];
    newTaxes[index] = { ...newTaxes[index], [field]: value };
    setTaxes(newTaxes);
  };

  const removeTax = async (index: number, id: string | number) => {
    if (typeof id === 'string' && id.startsWith('new_')) {
      const newTaxes = [...taxes];
      newTaxes.splice(index, 1);
      setTaxes(newTaxes);
      return;
    }

    if (!confirm('Are you sure you want to delete this tax rate?')) return;
    
    try {
      const res = await fetch(`${BASE_PATH}/api/settings/taxes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const newTaxes = [...taxes];
        newTaxes.splice(index, 1);
        setTaxes(newTaxes);
        toast.success('Tax rate deleted');
      }
    } catch (err) {
      toast.error('Failed to delete tax rate');
    }
  };

  const saveTax = async (index: number) => {
    const tax = taxes[index];
    try {
      setIsSaving(true);
      const isNew = typeof tax.id === 'string' && tax.id.startsWith('new_');
      const url = isNew ? '/api/settings/taxes' : `/api/settings/taxes/${tax.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tax)
      });

      if (res.ok) {
        const savedTax = await res.json();
        const newTaxes = [...taxes];
        newTaxes[index] = savedTax;
        setTaxes(newTaxes);
        toast.success('Tax rate saved');
      } else {
        toast.error('Failed to save tax rate');
      }
    } catch (err) {
      toast.error('Failed to save tax rate');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block text-gray-400" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Tax Rates</h2>
          <p className="text-[13px] text-gray-500">Configure tax rates for different countries and states.</p>
        </div>
        <button 
          onClick={addTaxRate}
          className="px-4 py-2 bg-[#5e3fde] text-white rounded-[3px] text-[13px] font-medium hover:bg-[#4b32b2] transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> Add Tax Rate
        </button>
      </div>
      
      <div className="border border-[#c3c4c7] rounded bg-white overflow-hidden shadow-sm">
        {taxes.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-[14px]">
            No tax rates configured. Click "Add Tax Rate" to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-[800px]">
              <thead className="bg-gray-50 border-b border-[#c3c4c7]">
                <tr>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-700 w-48">Country Code</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-700 w-32">State Code</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-700 w-32">ZIP/Postcode</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-700 w-32">City</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-700 w-24">Rate %</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-700">Tax Name</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-gray-700 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {taxes.map((tax, index) => (
                  <tr key={tax.id} className="border-b border-gray-100 hover:bg-gray-50/50 last:border-0">
                    <td className="py-2 px-4">
                      <select 
                        value={tax.country} 
                        onChange={(e) => updateTax(index, 'country', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full outline-none focus:border-[#5e3fde] text-xs"
                      >
                        <option value="*">* (Any)</option>
                        {countries.map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="text" value={tax.state} 
                        placeholder="*"
                        onChange={(e) => updateTax(index, 'state', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full outline-none focus:border-[#5e3fde] text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="text" value={tax.zip} 
                        placeholder="*"
                        onChange={(e) => updateTax(index, 'zip', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full outline-none focus:border-[#5e3fde] text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="text" value={tax.city} 
                        placeholder="*"
                        onChange={(e) => updateTax(index, 'city', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full outline-none focus:border-[#5e3fde] text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="number" step="0.001" min="0" value={tax.rate} 
                        onChange={(e) => updateTax(index, 'rate', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full outline-none focus:border-[#5e3fde] text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="text" value={tax.name} 
                        placeholder="e.g. VAT"
                        onChange={(e) => updateTax(index, 'name', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full outline-none focus:border-[#5e3fde] text-xs"
                      />
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => saveTax(index)} 
                          disabled={isSaving}
                          className="p-1.5 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50 transition-colors"
                          title="Save this tax rate"
                        >
                          <Save size={16} />
                        </button>
                        <button 
                          onClick={() => removeTax(index, tax.id)} 
                          disabled={isSaving}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

export default function FormConfirmationsEditor({ form }: { form: any }) {
  const router = useRouter();
  const settingsObj = typeof form.settings === 'string' ? JSON.parse(form.settings || '{}') : (form.settings || {});
  const [confirmations, setConfirmations] = useState<any[]>(settingsObj.confirmations || [{ 
    name: 'Default Confirmation', 
    action: settingsObj.successAction || 'message', 
    message: settingsObj.successMessage || 'Your submission has been received successfully.', 
    redirectUrl: settingsObj.redirectUrl || '' 
  }]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = { 
        settings: { ...settingsObj, confirmations, successAction: confirmations[0]?.action, successMessage: confirmations[0]?.message, redirectUrl: confirmations[0]?.redirectUrl },

        status: form.status,
        notificationEmail: form.notificationEmail,
        fields: typeof form.fields === 'string' ? JSON.parse(form.fields || '[]') : form.fields,
        title: form.title
      };
      
      // Inject the ID so the server knows it's an update, and hit the allowed root endpoint
      payload.id = form.id;
      const res = await fetch(`${BASE_PATH}/api/forms`, {
        method: 'POST', // Changed from PUT to POST to bypass host restrictions
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      
      toast.success('Confirmations saved');
      router.refresh();
    } catch (error) {
      toast.error('Error saving confirmations');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm max-w-3xl">
      <div className="flex justify-between items-center border-b border-gray-100 pb-5 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Default Confirmation</h2>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4b32b2] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Confirmations'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Configured Confirmations</h3>
          <button 
            onClick={() => setConfirmations([...confirmations, { name: 'New Confirmation', action: 'message', message: 'Success' }])}
            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
          >
            + Add Confirmation
          </button>
        </div>

        {confirmations.map((conf: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-5 relative group">
            {index !== 0 && (
              <button 
                onClick={() => setConfirmations(confirmations.filter((_: any, i: number) => i !== index))}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                Delete
              </button>
            )}
            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Confirmation Name</label>
                <input 
                  type="text" 
                  value={conf.name}
                  disabled={index === 0}
                  onChange={e => {
                    const newC = [...confirmations];
                    newC[index].name = e.target.value;
                    setConfirmations(newC);
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] outline-none disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">On Success</label>
                <select 
                  value={conf.action}
                  onChange={e => {
                    const newC = [...confirmations];
                    newC[index].action = e.target.value;
                    setConfirmations(newC);
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] outline-none"
                >
                  <option value="message">Show Message</option>
                  <option value="redirect">Redirect to URL</option>
                </select>
              </div>
              {conf.action === 'message' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Success Message</label>
                  <textarea 
                    value={conf.message}
                    onChange={e => {
                      const newC = [...confirmations];
                      newC[index].message = e.target.value;
                      setConfirmations(newC);
                    }}
                    rows={3}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Redirect URL</label>
                  <input 
                    type="url" 
                    value={conf.redirectUrl || ''}
                    onChange={e => {
                      const newC = [...confirmations];
                      newC[index].redirectUrl = e.target.value;
                      setConfirmations(newC);
                    }}
                    placeholder="https://example.com/thank-you"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm focus:ring-[#5e3fde]/20 focus:border-[#5e3fde] outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
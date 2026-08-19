'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

export default function FormNotificationsEditor({ form }: { form: any }) {
  const router = useRouter();
  const settingsObj = typeof form.settings === 'string' ? JSON.parse(form.settings || '{}') : (form.settings || {});
  const [notifications, setNotifications] = useState<any[]>(settingsObj.notifications || [{ 
    name: 'Admin Notification', 
    to: form.notificationEmail || '{admin_email}', 
    fromName: '{site_name}',
    fromEmail: '{admin_email}',
    replyTo: '{email}',
    bcc: '',
    subject: 'New Submission', 
    message: '{all_fields}' 
  }]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = { 
        settings: { ...settingsObj, notifications },
        status: form.status,
        fields: typeof form.fields === 'string' ? JSON.parse(form.fields || '[]') : form.fields,
        title: form.title,
        notificationEmail: notifications[0]?.to || ''
      };
      
      // Inject the ID so the server knows it's an update, and hit the allowed root endpoint
      payload.id = form.id;
      const res = await fetch(`${BASE_PATH}/api/forms`, {
        method: 'POST', // Changed from PUT to POST to bypass host restrictions
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      
      toast.success('Notifications saved');
      router.refresh();
    } catch (error) {
      toast.error('Error saving notifications');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm max-w-4xl">
      <div className="flex justify-between items-center border-b border-gray-100 pb-5 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4b32b2] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Notifications'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Configured Notifications</h3>
          <button 
            onClick={() => setNotifications([...notifications, { 
              name: 'New Notification', 
              to: '{email}', 
              fromName: '{site_name}',
              fromEmail: '{admin_email}',
              replyTo: '',
              bcc: '',
              subject: 'New Submission', 
              message: '{all_fields}' 
            }])}
            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            + Add Notification
          </button>
        </div>

        {notifications.map((notif: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-6 relative group bg-white shadow-sm hover:border-[#5e3fde]/30 transition-colors">
            {index !== 0 && (
              <button 
                onClick={() => setNotifications(notifications.filter((_: any, i: number) => i !== index))}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                title="Delete Notification"
              >
                Delete
              </button>
            )}
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Name (Required)</label>
                <input 
                  type="text" 
                  value={notif.name || ''}
                  onChange={e => {
                    const newN = [...notifications];
                    newN[index].name = e.target.value;
                    setNotifications(newN);
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Send To Email (Required)</label>
                <input 
                  type="text" 
                  value={notif.to || ''}
                  onChange={e => {
                    const newN = [...notifications];
                    newN[index].to = e.target.value;
                    setNotifications(newN);
                  }}
                  placeholder="admin@example.com or {email}"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">From Name</label>
                  <input 
                    type="text" 
                    value={notif.fromName || ''}
                    onChange={e => {
                      const newN = [...notifications];
                      newN[index].fromName = e.target.value;
                      setNotifications(newN);
                    }}
                    placeholder="e.g. {site_name} or John Doe"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">From Email</label>
                  <input 
                    type="text" 
                    value={notif.fromEmail || ''}
                    onChange={e => {
                      const newN = [...notifications];
                      newN[index].fromEmail = e.target.value;
                      setNotifications(newN);
                    }}
                    placeholder="e.g. {admin_email}"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Reply To</label>
                  <input 
                    type="text" 
                    value={notif.replyTo || ''}
                    onChange={e => {
                      const newN = [...notifications];
                      newN[index].replyTo = e.target.value;
                      setNotifications(newN);
                    }}
                    placeholder="e.g. {email}"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">BCC</label>
                  <input 
                    type="text" 
                    value={notif.bcc || ''}
                    onChange={e => {
                      const newN = [...notifications];
                      newN[index].bcc = e.target.value;
                      setNotifications(newN);
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Subject (Required)</label>
                <input 
                  type="text" 
                  value={notif.subject || ''}
                  onChange={e => {
                    const newN = [...notifications];
                    newN[index].subject = e.target.value;
                    setNotifications(newN);
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Message (Required)</label>
                <textarea 
                  value={notif.message || ''}
                  onChange={e => {
                    const newN = [...notifications];
                    newN[index].message = e.target.value;
                    setNotifications(newN);
                  }}
                  rows={6}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#5e3fde] focus:border-[#5e3fde] outline-none transition-shadow font-mono"
                />
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Available merge tags: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{all_fields}"}</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{embed_url}"}</code>, or use field labels like <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{"{Email}"}</code>.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
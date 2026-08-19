'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { BASE_PATH } from '@/lib/config';

type NotFoundLog = {
  id: number;
  url: string;
  hits: number;
  lastAccessed: string;
  createdAt: string;
};

export default function NotFoundMonitorPage() {
  const [logs, setLogs] = useState<NotFoundLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/seo/not-found-logs`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      toast.error('Failed to load 404 logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this log entry?')) return;
    try {
      const res = await fetch(`${BASE_PATH}/api/seo/not-found-logs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Log entry deleted');
      fetchLogs();
    } catch (err) {
      toast.error('Failed to delete log entry');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all 404 logs? This cannot be undone.')) return;
    try {
      const res = await fetch(`${BASE_PATH}/api/seo/not-found-logs?clearAll=true`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear logs');
      toast.success('All logs cleared');
      fetchLogs();
    } catch (err) {
      toast.error('Failed to clear logs');
    }
  };

  const handleCreateRedirect = (url: string) => {
    // Navigate to redirections page with the source URL pre-filled in some way, or just copy to clipboard
    navigator.clipboard.writeText(url);
    toast.success('URL copied! Paste it in the Redirections page.');
    router.push('/admin/seo/redirections');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">404 Monitor</h1>
          <p className="text-gray-500 mt-2">Track broken links and pages that return a "Not Found" error.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={handleClearAll}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm disabled:opacity-50"
          >
            <Trash2 size={16} />
            Clear Log
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-green-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No 404 Errors Found</h3>
            <p className="text-gray-500 mb-6">Great job! Your site doesn't have any broken links logged right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-sm whitespace-nowrap">URI</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-sm whitespace-nowrap text-center">Hits</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-sm whitespace-nowrap">Last Accessed</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-sm text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900 break-all">
                      <span className="text-blue-700 font-medium">{log.url}</span>
                      <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-3 text-xs font-normal">
                        <button onClick={() => handleCreateRedirect(log.url)} className="text-blue-600 hover:underline">
                          Create Redirection
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => handleDelete(log.id)} className="text-red-600 hover:underline">
                          Delete
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-gray-700">
                      {log.hits}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                      {formatDate(log.lastAccessed)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleCreateRedirect(log.url)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                          title="Create Redirection"
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Delete Log"
                        >
                          <Trash2 size={18} />
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

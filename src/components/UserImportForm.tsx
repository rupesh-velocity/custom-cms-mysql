'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Download, Loader2 } from 'lucide-react';
import { BASE_PATH } from '@/lib/config';

type ImportRow = { firstName: string; lastName: string; email: string; phone: string };
type ImportResult = { row: number; email: string; status: 'created' | 'skipped' | 'error'; message: string; temporaryPassword?: string };

const sampleCsv = `First Name,Last Name,Email,Phone\nJane,Doe,jane@example.com,+15551234567\nJohn,Smith,john@example.com,+15557654321`;

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCsv(csv: string): ImportRow[] {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const findIndex = (...names: string[]) => header.findIndex((cell) => names.includes(cell));
  const firstNameIndex = findIndex('firstname', 'first');
  const lastNameIndex = findIndex('lastname', 'last');
  const emailIndex = findIndex('email', 'emailaddress');
  const phoneIndex = findIndex('phone', 'phonenumber', 'mobile', 'mobilenumber');

  if (firstNameIndex === -1 || lastNameIndex === -1 || emailIndex === -1) {
    throw new Error('CSV header must include First Name, Last Name, and Email columns. Phone is optional.');
  }

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return {
      firstName: cells[firstNameIndex] || '',
      lastName: cells[lastNameIndex] || '',
      email: cells[emailIndex] || '',
      phone: phoneIndex >= 0 ? cells[phoneIndex] || '' : '',
    };
  });
}

export default function UserImportForm() {
  const [csv, setCsv] = useState(sampleCsv);
  const [sendEmails, setSendEmails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<{ created: number; skipped: number; error: number } | null>(null);

  const rows = useMemo(() => {
    try { return parseCsv(csv); } catch { return []; }
  }, [csv]);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
  };

  const importUsers = async () => {
    let parsed: ImportRow[] = [];
    try {
      parsed = parseCsv(csv);
    } catch (error: any) {
      toast.error(error.message || 'Invalid CSV file.');
      return;
    }

    if (!parsed.length) {
      toast.error('No users found to import.');
      return;
    }

    setLoading(true);
    setResults([]);
    setSummary(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/users/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed, sendEmails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');
      setResults(data.results || []);
      setSummary(data.summary || null);
      toast.success(`Import complete. ${data.summary?.created || 0} subscriber(s) created.`);
    } catch (error: any) {
      toast.error(error.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subscriber-import-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import Subscribers</h2>
            <p className="text-sm text-gray-500 mt-1">Upload or paste a CSV file with First Name, Last Name, Email, and Phone. Imported users are created as Subscribers.</p>
          </div>
          <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <Download size={16} /> Template
          </button>
        </div>

        <div className="grid gap-5">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={(e) => handleFile(e.target.files?.[0])} className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm" />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-2">CSV content</span>
            <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={10} className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          </label>

          <label className="inline-flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-gray-700">
            <input type="checkbox" checked={sendEmails} onChange={(e) => setSendEmails(e.target.checked)} className="mt-0.5 rounded border-gray-300" />
            <span><strong>Send login email to imported subscribers</strong><br /><span className="text-gray-500">If unchecked, temporary passwords will be shown in the import result so you can share them manually.</span></span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button type="button" onClick={importUsers} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#5e3fde] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4b32b2] disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import Subscribers
            </button>
            <span className="text-sm text-gray-500">Ready to import {rows.length} row{rows.length === 1 ? '' : 's'}.</span>
          </div>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-green-100 bg-green-50 p-4"><div className="text-xs font-semibold uppercase text-green-700">Created</div><div className="mt-1 text-2xl font-bold text-green-800">{summary.created}</div></div>
          <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4"><div className="text-xs font-semibold uppercase text-yellow-700">Skipped</div><div className="mt-1 text-2xl font-bold text-yellow-800">{summary.skipped}</div></div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-4"><div className="text-xs font-semibold uppercase text-red-700">Errors</div><div className="mt-1 text-2xl font-bold text-red-800">{summary.error}</div></div>
        </div>
      ) : null}

      {results.length ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr><th className="px-4 py-3">Row</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Message</th><th className="px-4 py-3">Temporary Password</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((item) => (
                <tr key={`${item.row}-${item.email}`}>
                  <td className="px-4 py-3">{item.row}</td>
                  <td className="px-4 py-3">{item.email || '-'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'created' ? 'bg-green-100 text-green-700' : item.status === 'skipped' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{item.status}</span></td>
                  <td className="px-4 py-3 text-gray-600">{item.message}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.temporaryPassword || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

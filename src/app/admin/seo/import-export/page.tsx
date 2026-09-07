'use client';

import { useRef, useState } from 'react';
import { FileJson, FileSpreadsheet, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiUrl, fetchWithRetry } from '@/lib/client-api';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function filenameFromResponse(response: Response, fallback: string) {
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

export default function SeoImportExportPage() {
  const [busy, setBusy] = useState('');
  const [scope, setScope] = useState('all');
  const [includeSettings, setIncludeSettings] = useState(true);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportSeo = async (format: 'json' | 'csv') => {
    setBusy(`export-${format}`);
    try {
      const params = new URLSearchParams({ format, scope, settings: includeSettings ? '1' : '0' });
      const response = await fetchWithRetry(`/api/seo/import-export?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Export failed (${response.status})`);
      }
      const blob = await response.blob();
      downloadBlob(blob, filenameFromResponse(response, `seo-export.${format}`));
      toast.success(`SEO ${format.toUpperCase()} export downloaded`);
    } catch (error: any) {
      toast.error(error?.message || 'SEO export failed');
    } finally {
      setBusy('');
    }
  };

  const importSeo = async (file: File | null) => {
    if (!file) return;
    setBusy('import');
    setResult(null);
    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const response = await fetch(apiUrl('/api/seo/import-export'), {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': isCsv ? 'text/csv; charset=utf-8' : 'application/json' },
        body: await file.text(),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'SEO import failed');
      setResult(payload);
      toast.success(`SEO import complete — ${payload.updated || 0} content items updated`);
    } catch (error: any) {
      toast.error(error?.message || 'SEO import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
      setBusy('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-3 font-semibold">Dashboard / SEO Import & Export</div>
        <h1 className="text-3xl font-bold text-gray-900">SEO Import / Export</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-3xl leading-6">
          Move or bulk-edit SEO data without replacing page/post content. Matching is done by content type and slug.
        </p>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Export SEO Data</h2>
          <p className="text-sm text-gray-500 mt-1">Exports focus keywords, SEO titles, meta descriptions, robots, schema, redirects and SEO scores.</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Content to export</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                <option value="all">Pages and Posts</option>
                <option value="pages">Pages only</option>
                <option value="posts">Posts only</option>
              </select>
            </div>
            <label className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 cursor-pointer">
              <input type="checkbox" checked={includeSettings} onChange={(e) => setIncludeSettings(e.target.checked)} className="mt-1"/>
              <span>
                <span className="block text-sm font-medium text-gray-900">Include global SEO settings in JSON export</span>
                <span className="block text-xs text-gray-500 mt-1 leading-5">Includes Titles & Meta, sitemap, breadcrumbs, robots and related SEO settings. CSV contains content SEO fields only.</span>
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => exportSeo('json')} disabled={!!busy} className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">
              {busy === 'export-json' ? <Loader2 size={16} className="animate-spin"/> : <FileJson size={16}/>} Export JSON
            </button>
            <button onClick={() => exportSeo('csv')} disabled={!!busy} className="border border-gray-300 bg-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60">
              {busy === 'export-csv' ? <Loader2 size={16} className="animate-spin"/> : <FileSpreadsheet size={16}/>} Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Import SEO Data</h2>
          <p className="text-sm text-gray-500 mt-1">Import a CMS SEO JSON export or an exported CSV after making bulk changes.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-6">
            Import updates SEO fields only. It does not replace titles, slugs or page/post content. Rows whose slug does not exist are skipped.
          </div>
          <label className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-5 py-2.5 text-sm font-medium cursor-pointer bg-white hover:bg-gray-50">
            {busy === 'import' ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>} Choose SEO File
            <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={(e) => importSeo(e.target.files?.[0] || null)}/>
          </label>

          {result ? (
            <div className="grid sm:grid-cols-4 gap-3 pt-2">
              <div className="border border-gray-200 rounded-lg p-4"><div className="text-xs text-gray-500">Updated</div><div className="text-2xl font-bold text-green-700 mt-1">{result.updated || 0}</div></div>
              <div className="border border-gray-200 rounded-lg p-4"><div className="text-xs text-gray-500">Skipped</div><div className="text-2xl font-bold text-gray-700 mt-1">{result.skipped || 0}</div></div>
              <div className="border border-gray-200 rounded-lg p-4"><div className="text-xs text-gray-500">Failed</div><div className="text-2xl font-bold text-red-700 mt-1">{result.failed || 0}</div></div>
              <div className="border border-gray-200 rounded-lg p-4"><div className="text-xs text-gray-500">Settings</div><div className="text-2xl font-bold text-[#5e3fde] mt-1">{result.settingsUpdated || 0}</div></div>
            </div>
          ) : null}

          {result?.errors?.length ? (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-3 text-sm font-medium text-red-800 inline-flex items-center gap-2 w-full"><AlertTriangle size={16}/> Import errors</div>
              <div className="max-h-52 overflow-auto divide-y divide-gray-100">
                {result.errors.map((item:any, index:number) => <div key={index} className="px-4 py-2.5 text-xs"><strong>{item.type}: {item.slug}</strong><div className="text-gray-500 mt-1">{item.error}</div></div>)}
              </div>
            </div>
          ) : result ? (
            <div className="text-sm text-green-700 inline-flex items-center gap-2"><CheckCircle2 size={16}/> Import finished without item-level errors.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

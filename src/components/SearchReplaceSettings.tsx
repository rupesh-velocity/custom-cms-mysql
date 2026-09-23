'use client';

import { useMemo, useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

type ScopeResult = {
  scope: string;
  label: string;
  records: number;
  matches: number;
  fields: Record<string, number>;
};

type SearchReplaceResult = {
  action: 'dry-run' | 'replace';
  totalRecords: number;
  totalMatches: number;
  results: ScopeResult[];
};

const scopeOptions = [
  { key: 'pages', label: 'Pages' },
  { key: 'posts', label: 'Posts' },
  { key: 'courses', label: 'Courses' },
  { key: 'products', label: 'Products' },
  { key: 'menus', label: 'Menus' },
  { key: 'taxonomies', label: 'Categories & Tags' },
  { key: 'media', label: 'Media' },
  { key: 'forms', label: 'Forms' },
];

export default function SearchReplaceSettings() {
  const [search, setSearch] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [scopes, setScopes] = useState<string[]>(['pages', 'posts', 'courses', 'products']);
  const [busy, setBusy] = useState<'dry-run' | 'replace' | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<SearchReplaceResult | null>(null);

  const allSelected = useMemo(() => scopes.length === scopeOptions.length, [scopes]);

  const toggleScope = (key: string, checked: boolean) => {
    setScopes((current) => checked ? Array.from(new Set([...current, key])) : current.filter((item) => item !== key));
    setResult(null);
  };

  const run = async (action: 'dry-run' | 'replace') => {
    if (!search) {
      toast.error('Enter the text you want to search for.');
      return;
    }
    if (!scopes.length) {
      toast.error('Select at least one content type.');
      return;
    }

    if (action === 'replace' || action === 'dry-run') {
      const replacementLabel = replacement ? `“${replacement}”` : 'an empty value';
      const confirmed = window.confirm(
        `${action === 'dry-run' ? 'Test the replacement' : 'Replace every matching occurrence'} of “${search}” with ${replacementLabel} in the selected content types?${action === 'dry-run' ? '\n\nDry Run is enabled: no database changes will be saved.' : '\n\nThis changes database content immediately. A backup is recommended before continuing.'}`
      );
      if (!confirmed) return;
    }

    setBusy(action);
    try {
      const response = await fetch(`${BASE_PATH}/api/admin/search-replace`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action === 'dry-run' ? 'replace' : 'replace', dryRun: action === 'dry-run', search, replacement, caseSensitive, scopes }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Search & Replace failed');
      setResult(data as SearchReplaceResult);
      if (action === 'dry-run') {
        toast.success(data.totalMatches ? `Dry Run found ${data.totalMatches} matching occurrence${data.totalMatches === 1 ? '' : 's'} — no changes made` : 'Dry Run found no matches');
      } else {
        toast.success(`Replaced ${data.totalMatches || 0} occurrence${data.totalMatches === 1 ? '' : 's'}`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Search & Replace failed');
    } finally {
      setBusy(null);
    }
  };

  return <div className="space-y-6">
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
      <div className="border-b border-gray-100 pb-3">
        <h2 className="text-lg font-semibold text-gray-900">Search & Replace</h2>
        <p className="text-sm text-gray-500 mt-1 leading-6">Find text or URLs across CMS content and replace them in bulk. Use Dry Run to test the replacement without changing the database.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Search for</label>
          <input
            type="text"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setResult(null); }}
            placeholder="Old text or URL"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Replace with</label>
          <input
            type="text"
            value={replacement}
            onChange={(event) => { setReplacement(event.target.value); setResult(null); }}
            placeholder="New text or URL (leave blank to remove)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5e3fde]/20 focus:border-[#5e3fde]"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Search in</h3>
            <p className="text-xs text-gray-500 mt-1">Choose which CMS content types should be scanned.</p>
          </div>
          <button
            type="button"
            onClick={() => { setScopes(allSelected ? [] : scopeOptions.map((item) => item.key)); setResult(null); }}
            className="text-xs font-medium text-[#5e3fde] hover:underline"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {scopeOptions.map((item) => <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={scopes.includes(item.key)}
              onChange={(event) => toggleScope(item.key, event.target.checked)}
              className="w-4 h-4 text-[#5e3fde] rounded border-gray-300"
            />
            {item.label}
          </label>)}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(event) => { setCaseSensitive(event.target.checked); setResult(null); }}
          className="mt-1 w-4 h-4 text-[#5e3fde] rounded border-gray-300"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">Case-sensitive search</span>
          <span className="block text-xs text-gray-500 mt-1">When disabled, “Fitness” and “fitness” are treated as the same search term.</span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} className="mt-1 w-4 h-4 text-[#5e3fde] rounded border-gray-300" />
        <span>
          <span className="block text-sm font-medium text-gray-900">Dry Run</span>
          <span className="block text-xs text-gray-500 mt-1">Test the complete replacement and show the matches without saving any database changes.</span>
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy !== null} onClick={() => run(dryRun ? 'dry-run' : 'replace')} className="bg-[#5e3fde] text-white px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin"/> : <ArrowRightLeft size={16}/>} {dryRun ? 'Run Dry Run' : 'Replace Now'}
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-5">
        <strong>Safety:</strong> Use Dry Run first to verify the matches before applying changes. This tool intentionally does not change slugs, user passwords, SMTP/Twilio credentials, API keys, or other add-on secrets.
      </div>
    </section>

    {result && <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{result.action === 'dry-run' ? 'Dry Run Results' : 'Replacement Results'}</h2>
          <p className="text-sm text-gray-500 mt-1">{result.totalRecords} record{result.totalRecords === 1 ? '' : 's'} matched • {result.totalMatches} occurrence{result.totalMatches === 1 ? '' : 's'} found</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${result.action === 'replace' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-[#5e3fde]'}`}>
          {result.action === 'replace' ? 'Changes applied' : 'Dry Run — no changes made'}
        </span>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Content Type</th>
              <th className="text-left px-4 py-3 font-medium">Matched Records</th>
              <th className="text-left px-4 py-3 font-medium">Occurrences</th>
              <th className="text-left px-4 py-3 font-medium">Matched Fields</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.results.map((item) => <tr key={item.scope}>
              <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
              <td className="px-4 py-3 text-gray-600">{item.records}</td>
              <td className="px-4 py-3 text-gray-600">{item.matches}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{(Object.entries(item.fields) as Array<[string, number]>).filter(([,count]) => count > 0).map(([field,count]) => `${field}: ${count}`).join(', ') || '—'}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>}
  </div>;
}

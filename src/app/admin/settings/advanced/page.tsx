'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  Braces,
  Check,
  Copy,
  FileCode2,
  Loader2,
  Maximize2,
  Minimize2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_PATH } from '@/lib/config';

type SettingKey = 'custom_css' | 'head_scripts' | 'body_scripts' | 'custom_js';

type CodeField = {
  key: SettingKey;
  title: string;
  location: string;
  language: 'CSS' | 'JavaScript';
  description: string;
  placeholder: string;
};

const javascriptPlaceholder = `<script>
// Add site-wide JavaScript here.
document.addEventListener('DOMContentLoaded', () => {
  // Your code
});
</script>`;

const fields: CodeField[] = [
  {
    key: 'custom_css',
    title: 'Custom CSS',
    location: 'SITE-WIDE',
    language: 'CSS',
    description: 'Add site-wide CSS without editing template or theme files.',
    placeholder: `/* Add custom CSS here */

.your-selector {
  property: value;
}`,
  },
  {
    key: 'head_scripts',
    title: 'Custom JavaScript (Head)',
    location: 'HEAD',
    language: 'JavaScript',
    description: 'Inserted in the real <head>. Paste a complete <script> snippet or plain JavaScript.',
    placeholder: javascriptPlaceholder,
  },
  {
    key: 'body_scripts',
    title: 'Custom JavaScript (Body)',
    location: 'BODY',
    language: 'JavaScript',
    description: 'Inserted immediately after <body>. Paste a complete <script> snippet or plain JavaScript.',
    placeholder: javascriptPlaceholder,
  },
  {
    key: 'custom_js',
    title: 'Custom JavaScript (Footer)',
    location: 'FOOTER',
    language: 'JavaScript',
    description: 'Inserted at the end of <body>. Paste a complete <script> snippet or plain JavaScript.',
    placeholder: javascriptPlaceholder,
  },
];


function encodeCode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeCode(value: string) {
  if (!value) return '';
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function CodeEditor({
  field,
  value,
  onChange,
}: {
  field: CodeField;
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const lineCount = Math.max(1, value.split('\n').length);

  const syncScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab') return;

    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const nextValue = `${value.slice(0, start)}  ${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.selectionStart = start + 2;
      textareaRef.current.selectionEnd = start + 2;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error('Could not copy code');
    }
  };

  return (
    <section
      className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${
        expanded ? 'fixed inset-5 z-[90] flex flex-col shadow-2xl' : ''
      }`}
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4 bg-white">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg bg-[#5e3fde]/10 text-[#5e3fde] flex items-center justify-center shrink-0">
            {field.language === 'CSS' ? <FileCode2 size={18} /> : <Braces size={18} />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{field.title}</h3>
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500">
                {field.location}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-5">{field.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Copy code"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            title={expanded ? 'Exit full screen' : 'Open full screen'}
          >
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span className="hidden sm:inline">{expanded ? 'Exit' : 'Expand'}</span>
          </button>
        </div>
      </div>

      <div className={`p-5 ${expanded ? 'flex-1 min-h-0' : ''}`}>
        <div className={`rounded-xl border border-gray-300 overflow-hidden bg-[#0f172a] ${expanded ? 'h-full flex flex-col' : ''}`}>
          <div className="h-10 px-4 border-b border-white/10 bg-[#111827] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-200">{field.language}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{field.location}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 tabular-nums">
              <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
              <span>{value.length.toLocaleString()} chars</span>
            </div>
          </div>

          <div className={`relative flex ${expanded ? 'flex-1 min-h-0' : ''}`}>
            <div
              ref={lineNumbersRef}
              aria-hidden="true"
              className={`w-14 shrink-0 overflow-hidden border-r border-white/10 bg-[#111827] py-4 text-right font-mono text-[13px] leading-6 text-gray-500 select-none ${
                expanded ? 'h-full' : 'h-[310px]'
              }`}
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <div key={index} className="pr-3 h-6">
                  {index + 1}
                </div>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              name={field.key}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={syncScroll}
              className={`flex-1 min-w-0 resize-none border-0 outline-none bg-[#0f172a] px-4 py-4 font-mono text-[13px] leading-6 text-gray-100 caret-white placeholder:text-gray-600 focus:ring-0 whitespace-pre overflow-auto ${
                expanded ? 'h-full' : 'h-[310px]'
              }`}
              placeholder={field.placeholder}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
            />
          </div>

          <div className="min-h-9 px-4 border-t border-white/10 bg-[#111827] flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
            <span>Tip: press Tab to indent code.</span>
            <span>Changes are applied after Save Changes.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdvancedSettings() {
  const [settings, setSettings] = useState<Record<SettingKey, string>>({
    custom_css: '',
    custom_js: '',
    head_scripts: '',
    body_scripts: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE_PATH}/api/settings/code?group=advanced`, { cache: 'no-store', credentials: 'same-origin' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load custom code');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const values = data.values || {};
        setSettings({
          custom_css: decodeCode(values.custom_css || ''),
          custom_js: decodeCode(values.custom_js || ''),
          head_scripts: decodeCode(values.head_scripts || ''),
          body_scripts: decodeCode(values.body_scripts || ''),
        });
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'Failed to load custom code');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const encodedValues = Object.fromEntries(
        Object.entries(settings).map(([key, value]) => [key, encodeCode(value)])
      );
      const response = await fetch(`${BASE_PATH}/api/settings/code`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: 'advanced', values: encodedValues }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to save custom code');

      const saved = data.values || {};
      const mismatched = (Object.keys(settings) as SettingKey[]).filter(
        (key) => decodeCode(saved[key] || '') !== settings[key]
      );
      if (mismatched.length) throw new Error(`Save verification failed for: ${mismatched.join(', ')}`);

      toast.success('Custom code saved and verified');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[1100px] space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Custom CSS / JavaScript</h2>
          <p className="text-sm text-gray-500 mt-1 leading-6 max-w-2xl">
            Add and manage site-wide custom code from one place. The editors use a code-friendly font,
            line numbers and full-screen editing for easier maintenance.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5e3fde] text-white rounded-lg hover:bg-[#4b32b2] disabled:opacity-50 text-sm font-semibold shadow-sm shrink-0"
        >
          {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
          Save Changes
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        Add only trusted code. Invalid CSS or JavaScript can affect the public website. Existing code is not changed unless you edit and save it here.
      </div>

      <div className="grid gap-6">
        {fields.map((field) => (
          <CodeEditor
            key={field.key}
            field={field}
            value={settings[field.key]}
            onChange={(value) => setSettings((current) => ({ ...current, [field.key]: value }))}
          />
        ))}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5e3fde] text-white rounded-lg hover:bg-[#4b32b2] disabled:opacity-50 text-sm font-semibold shadow-sm"
        >
          {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
          Save Changes
        </button>
      </div>
    </form>
  );
}

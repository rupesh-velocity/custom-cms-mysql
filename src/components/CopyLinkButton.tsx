'use client';

import { useState } from 'react';
import { Link as LinkIcon, Check } from 'lucide-react';

async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) throw new Error('Copy command failed');
}

export default function CopyLinkButton({ url }: { url?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const value = url || window.location.href;
      await copyText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Could not copy link:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-200 transition-colors"
      title={copied ? 'Link copied' : 'Copy link'}
      aria-label={copied ? 'Link copied' : 'Copy article link'}
    >
      {copied ? <Check className="w-5 h-5 text-green-600" /> : <LinkIcon className="w-5 h-5" />}
    </button>
  );
}

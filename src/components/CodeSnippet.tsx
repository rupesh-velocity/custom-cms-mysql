import React from 'react';

type ScriptAttributes = Record<string, string | boolean>;

function parseAttributes(raw: string): ScriptAttributes {
  const attrs: ScriptAttributes = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const rawName = match[1];
    const value = match[2] ?? match[3] ?? match[4];
    const nameMap: Record<string, string> = {
      crossorigin: 'crossOrigin',
      referrerpolicy: 'referrerPolicy',
      charset: 'charSet',
      nomodule: 'noModule',
    };
    const name = nameMap[rawName.toLowerCase()] || rawName;
    attrs[name] = value === undefined ? true : value;
  }
  return attrs;
}

function scriptElement(rawAttrs: string, code: string, key: string) {
  const attrs = parseAttributes(rawAttrs);
  const props: any = { ...attrs, key };
  if (code.trim()) props.dangerouslySetInnerHTML = { __html: code };
  return React.createElement('script', props);
}

/**
 * Render administrator JavaScript as real script tags. Users may paste either
 * plain JavaScript or complete <script>...</script> snippets (including src).
 */
export function JavaScriptSnippet({ code, idPrefix }: { code?: string | null; idPrefix: string }) {
  const source = String(code || '').trim();
  if (!source) return null;

  const nodes: React.ReactNode[] = [];
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let index = 0;

  while ((match = scriptRegex.exec(source))) {
    const before = source.slice(lastIndex, match.index).trim();
    if (before) {
      // Preserve legacy/plain JS around pasted script tags.
      nodes.push(
        <script key={`${idPrefix}-raw-${index}`} dangerouslySetInnerHTML={{ __html: before }} />
      );
      index += 1;
    }
    nodes.push(scriptElement(match[1] || '', match[2] || '', `${idPrefix}-script-${index}`));
    index += 1;
    lastIndex = scriptRegex.lastIndex;
  }

  const after = source.slice(lastIndex).trim();
  if (after) {
    nodes.push(<script key={`${idPrefix}-raw-${index}`} dangerouslySetInnerHTML={{ __html: after }} />);
  }

  // No explicit <script> tags: treat the full value as plain JavaScript.
  if (nodes.length === 0) {
    return <script id={idPrefix} dangerouslySetInnerHTML={{ __html: source }} />;
  }

  return <>{nodes}</>;
}

/**
 * Tracking body snippets sometimes contain <noscript> markup in addition to
 * scripts (for example GTM/Meta fallback pixels). Render those server-side in
 * the requested body position while still executing any script tags.
 */
export function BodyTrackingSnippet({ code, idPrefix }: { code?: string | null; idPrefix: string }) {
  const source = String(code || '').trim();
  if (!source) return null;

  const nodes: React.ReactNode[] = [];
  const tokenRegex = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>|<noscript\b[^>]*>([\s\S]*?)<\/noscript\s*>/gi;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let index = 0;

  const pushLoose = (chunk: string) => {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    if (trimmed.includes('<')) {
      nodes.push(
        <span
          key={`${idPrefix}-markup-${index++}`}
          style={{ display: 'contents' }}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: trimmed }}
        />
      );
    } else {
      nodes.push(<script key={`${idPrefix}-raw-${index++}`} dangerouslySetInnerHTML={{ __html: trimmed }} />);
    }
  };

  while ((match = tokenRegex.exec(source))) {
    pushLoose(source.slice(lastIndex, match.index));
    if (match[1] !== undefined || match[2] !== undefined) {
      nodes.push(scriptElement(match[1] || '', match[2] || '', `${idPrefix}-script-${index++}`));
    } else {
      nodes.push(
        <noscript
          key={`${idPrefix}-noscript-${index++}`}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: match[3] || '' }}
        />
      );
    }
    lastIndex = tokenRegex.lastIndex;
  }
  pushLoose(source.slice(lastIndex));

  return <>{nodes}</>;
}

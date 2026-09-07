import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeRedirectPath(value: string | null | undefined) {
  if (!value) return '/';
  let input = String(value).trim();

  try {
    if (/^https?:\/\//i.test(input)) {
      const url = new URL(input);
      input = `${url.pathname}${url.search}`;
    }
  } catch {
    // Fall back to treating the value as a relative path.
  }

  if (!input.startsWith('/')) input = `/${input}`;

  const [pathname, query = ''] = input.split('?');
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return query ? `${normalizedPathname}?${query}` : normalizedPathname;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const fullUrl = searchParams.get('fullUrl');

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Passenger/proxies can expose an internal host/port in request.url. Compare
    // normalized pathnames instead so full public URLs and relative paths behave
    // identically (e.g. https://fitnessarts.com/about-us and /about-us).
    const candidates = Array.from(
      new Set([
        normalizeRedirectPath(path),
        fullUrl ? normalizeRedirectPath(fullUrl) : null,
      ].filter(Boolean) as string[])
    );

    const activeRedirections = await prisma.redirection.findMany({
      where: {
        status: true,
        isTrashed: false,
      },
      orderBy: { id: 'asc' },
    });

    const redirection = activeRedirections.find((item) => {
      const source = normalizeRedirectPath(item.sourceUrl);
      return candidates.some((candidate) =>
        item.ignoreCase
          ? source.toLowerCase() === candidate.toLowerCase()
          : source === candidate
      );
    });

    if (!redirection) {
      return NextResponse.json({ destinationUrl: null });
    }

    // Do not block the redirect if metrics cannot be updated.
    prisma.redirection.update({
      where: { id: redirection.id },
      data: {
        hits: { increment: 1 },
        lastAccessed: new Date(),
      },
    }).catch((error) => console.error('Failed to update redirect metrics', error));

    return NextResponse.json({
      destinationUrl: redirection.destinationUrl,
      redirectType: redirection.redirectType,
    });
  } catch (error) {
    console.error('Failed to check redirection:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check redirection' },
      { status: 500 }
    );
  }
}

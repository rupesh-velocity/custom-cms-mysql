import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
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
    // Treat malformed/full-url-like values as relative paths below.
  }
  if (!input.startsWith('/')) input = `/${input}`;
  const question = input.indexOf('?');
  const pathname = question >= 0 ? input.slice(0, question) : input;
  const query = question >= 0 ? input.slice(question + 1) : '';
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return query ? `${normalizedPathname}?${query}` : normalizedPathname;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Pass the original route to the root layout so frontend-only custom code
  // can be placed in the real document head/body without leaking into admin.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-cms-pathname', path);
  const continueRequest = () => NextResponse.next({ request: { headers: requestHeaders } });
  
  // Helper to safely redirect while avoiding cPanel Passenger port bugs
  const createRedirect = (targetPath: string) => {
    const url = request.nextUrl.clone();
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.port = ''; // Strip the internal port 3000 injected by Passenger in production
    }
    url.pathname = targetPath;
    return NextResponse.redirect(url);
  };

  // Protect all /admin routes
  if (path.startsWith('/admin')) {
    const token = request.cookies.get('cms_session')?.value;

    if (!token) {
      return createRedirect('/login');
    }

    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
      );
      
      // Verify the JWT token
      const { payload } = await jwtVerify(token, secret);
      
      const userRole = String(payload.role).toLowerCase();
      if (userRole !== 'administrator') {
        return createRedirect('/my-account');
      }
      
      return continueRequest();
    } catch (error) {
      // If token is invalid/expired, redirect to login
      return createRedirect('/login');
    }
  }

  // Redirect authenticated users away from the login page
  if (path === '/login') {
    const token = request.cookies.get('cms_session')?.value;
    if (token) {
      try {
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
        );
        await jwtVerify(token, secret);
        return createRedirect('/admin');
      } catch {
        // invalid token on login page, just continue
      }
    }
  }

  // Dynamic redirects take precedence over permalink rewrites.
  // Query the database directly from Proxy. Next.js 16 Proxy runs in the Node.js
  // runtime, so this avoids a fragile HTTP request back into the same Passenger app.
  if (!path.startsWith('/_next') && !path.startsWith('/api') && !path.startsWith('/admin') && !path.match(/\.(.*)$/)) {
    try {
      const candidate = normalizeRedirectPath(`${path}${request.nextUrl.search || ''}`);
      const activeRedirections = await prisma.redirection.findMany({
        where: { status: true, isTrashed: false },
        orderBy: { id: 'asc' },
      });

      const redirection = activeRedirections.find((item) => {
        const source = normalizeRedirectPath(item.sourceUrl);
        return item.ignoreCase
          ? source.toLowerCase() === candidate.toLowerCase()
          : source === candidate;
      });

      if (redirection?.destinationUrl) {
        const redirectType = Number.parseInt(String(redirection.redirectType || '301'), 10);

        // Metrics must never delay or block the redirect response.
        void prisma.redirection.update({
          where: { id: redirection.id },
          data: { hits: { increment: 1 }, lastAccessed: new Date() },
        }).catch((error) => console.error('Failed to update redirect metrics', error));

        if (redirectType === 410 || redirectType === 451) {
          return new NextResponse(null, { status: redirectType });
        }

        const status = [301, 302, 307, 308].includes(redirectType) ? redirectType : 301;
        const destination = String(redirection.destinationUrl).trim();
        if (!/^https?:\/\//i.test(destination)) {
          const location = destination.startsWith('/') ? destination : `/${destination}`;
          return new NextResponse(null, { status, headers: { Location: location } });
        }
        return new NextResponse(null, { status, headers: { Location: destination } });
      }
    } catch (error) {
      console.error('Dynamic redirect lookup failed:', error);
    }
  }

  // Configurable permalink bases. Stored slugs remain unchanged, so existing
  // /slug URLs keep working while optional /blog/slug-style URLs are rewritten internally.
  if (!path.startsWith('/_next') && !path.startsWith('/api') && !path.startsWith('/admin') && !path.match(/\.(.*)$/)) {
    try {
      const permalinkRes = await fetch(new URL(`/api/permalinks/resolve?path=${encodeURIComponent(path)}`, request.url), { cache: 'no-store' });
      if (permalinkRes.ok) {
        const data = await permalinkRes.json();
        if (data.rewritePath && data.rewritePath !== path) {
          const rewriteUrl = request.nextUrl.clone();
          rewriteUrl.pathname = data.rewritePath;
          return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
        }
      }
    } catch {
      // Permalink resolution must never block the site.
    }
  }

  return continueRequest();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

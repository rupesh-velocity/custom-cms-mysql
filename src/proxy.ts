import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Protect all /admin routes
  if (path.startsWith('/admin')) {
    const token = request.cookies.get('cms_session')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'fallback_super_secret_key_change_in_production'
      );
      
      // Verify the JWT token
      const { payload } = await jwtVerify(token, secret);
      
    const userRole = String(payload.role).toLowerCase();
if (userRole !== 'administrator') {
  return NextResponse.redirect(new URL('/my-account', request.url));
}
      
      return NextResponse.next();
    } catch (error) {
      // If token is invalid/expired, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
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
        return NextResponse.redirect(new URL('/admin', request.url));
      } catch {
        // invalid token on login page, just continue
      }
    }
  }

  // Dynamic Redirects
  if (!path.startsWith('/_next') && !path.startsWith('/api') && !path.startsWith('/admin') && !path.match(/\.(.*)$/)) {
    try {
      const fullUrl = request.url;
      const redirectRes = await fetch(new URL(`/api/redirections/check?path=${encodeURIComponent(path)}&fullUrl=${encodeURIComponent(fullUrl)}`, request.url), {
        cache: 'no-store'
      });
      if (redirectRes.ok) {
        const data = await redirectRes.json();
        if (data.destinationUrl) {
          const type = data.redirectType === '301' || data.redirectType === '308' ? 308 : 307;
          
          // Handle absolute vs relative destination
          const dest = data.destinationUrl.startsWith('http') 
            ? data.destinationUrl 
            : new URL(data.destinationUrl, request.url);
            
          return NextResponse.redirect(dest, type);
        }
      }
    } catch (error) {
      // Ignore errors to not block the request
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

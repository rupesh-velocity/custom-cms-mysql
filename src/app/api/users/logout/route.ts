import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL('/', url.origin));
  response.cookies.set('cms_session', '', { maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL('/', url.origin));
  response.cookies.set('cms_session', '', { maxAge: 0 });
  return response;
}

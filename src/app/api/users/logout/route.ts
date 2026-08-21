import { NextResponse } from 'next/server';

export async function POST() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const redirectPath = basePath || '/';
  
  const response = new NextResponse(null, {
    status: 302,
    headers: {
      Location: redirectPath,
    },
  });
  
  response.cookies.set('cms_session', '', { maxAge: 0, path: '/' });
  return response;
}

export async function GET() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const redirectPath = basePath || '/';
  
  const response = new NextResponse(null, {
    status: 302,
    headers: {
      Location: redirectPath,
    },
  });
  
  response.cookies.set('cms_session', '', { maxAge: 0, path: '/' });
  return response;
}
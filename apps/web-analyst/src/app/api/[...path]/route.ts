import { NextRequest, NextResponse } from 'next/server';

const API_TARGET = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');
  
  const searchParams = req.nextUrl.searchParams.toString();
  const targetUrl = `${API_TARGET}/${pathStr}${searchParams ? `?${searchParams}` : ''}`;
  
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = await req.text();
    }

    const res = await fetch(targetUrl, fetchOptions);
    const bodyText = await res.text();
    
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    return new NextResponse(bodyText, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error(`Proxy error to ${targetUrl}:`, err);
    return NextResponse.json({ error: 'Proxy request failed', details: err.message }, { status: 502 });
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, context);
}

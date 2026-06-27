import { NextResponse, NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handleProxy(request: NextRequest, path: string[]) {
  const targetPath = path.join('/');
  const searchParams = request.nextUrl.search;
  const targetUrl = `${API_URL}/${targetPath}${searchParams}`;
  
  const headers: HeadersInit = {};
  
  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  let body: any = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text();
    } catch (e) {
      // No body or error reading body
    }
  }
  
  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });
    
    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }
    
    const data = await res.arrayBuffer();
    const responseHeaders = new Headers();
    const headersToForward = ['content-type', 'content-disposition', 'content-length', 'cache-control'];
    for (const h of headersToForward) {
      const val = res.headers.get(h);
      if (val) {
        responseHeaders.set(h, val);
      }
    }

    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy ${request.method} error on ${targetUrl}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(request, resolvedParams.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(request, resolvedParams.path);
}

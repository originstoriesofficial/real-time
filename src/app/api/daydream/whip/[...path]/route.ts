import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_ORIGIN = "https://ai.livepeer.com";

function forwardHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("origin");
  headers.delete("referer");

  return headers;
}

function rewriteToProxy(url: string, req: NextRequest): string {
  const parsed = new URL(url, UPSTREAM_ORIGIN);
  parsed.protocol = "https:";

  return `${req.nextUrl.origin}/api/daydream/whip${parsed.pathname}${parsed.search}`;
}

async function handle(req: NextRequest, path: string[]) {
  const upstreamUrl = `${UPSTREAM_ORIGIN}/${path.join("/")}${req.nextUrl.search}`;

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
    headers: forwardHeaders(req),
    body,
  });

  const headers = new Headers(upstreamRes.headers);

  const location = headers.get("location");
  if (location) {
    headers.set("location", rewriteToProxy(location, req));
  }

  const playbackUrl = headers.get("livepeer-playback-url");
  if (playbackUrl) {
    const parsed = new URL(playbackUrl);
    parsed.protocol = "https:";
    headers.set("livepeer-playback-url", parsed.toString());
  }

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handle(req, path);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handle(req, path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handle(req, path);
}
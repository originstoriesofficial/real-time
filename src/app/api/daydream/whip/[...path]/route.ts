import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = "https://ai.livepeer.com";

function forwardHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("origin");
  headers.delete("referer");

  return headers;
}

async function handle(req: NextRequest, path: string[]) {
  const upstreamUrl = new URL(
    `/${path.join("/")}${req.nextUrl.search}`,
    UPSTREAM
  );

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const upstreamRes = await fetch(upstreamUrl.toString(), {
    method: req.method,
    headers: forwardHeaders(req),
    body,
  });

  const headers = new Headers(upstreamRes.headers);

  // ONLY rewrite redirect + playback header
  const location = headers.get("location");
  if (location) {
    const parsed = new URL(location, UPSTREAM);
    parsed.protocol = "https:";

    headers.set(
      "location",
      `${req.nextUrl.origin}/api/daydream/whip${parsed.pathname}${parsed.search}`
    );
  }

  const playbackUrl = headers.get("livepeer-playback-url");
  if (playbackUrl) {
    const parsed = new URL(playbackUrl);
    parsed.protocol = "https:";

    headers.set(
      "livepeer-playback-url",
      `${req.nextUrl.origin}/api/daydream/whep?target=${encodeURIComponent(
        parsed.toString()
      )}`
    );
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
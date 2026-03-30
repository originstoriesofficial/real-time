import { NextRequest, NextResponse } from "next/server";

function forwardHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("origin");
  headers.delete("referer");
  return headers;
}

async function handle(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("target");

  if (!target) {
    return new NextResponse("Missing target", { status: 400 });
  }

  let upstream: URL;
  try {
    upstream = new URL(target);
    upstream.protocol = "https:";
  } catch {
    return new NextResponse("Invalid target", { status: 400 });
  }

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const upstreamRes = await fetch(upstream.toString(), {
    method: req.method,
    headers: forwardHeaders(req),
    body,
  });

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: upstreamRes.headers,
  });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function PATCH(req: NextRequest) {
  return handle(req);
}

export async function DELETE(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function HEAD(req: NextRequest) {
  return handle(req);
}
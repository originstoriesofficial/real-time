import { NextRequest, NextResponse } from "next/server";

const DAYDREAM_API = "https://api.daydream.live/v1";
const API_KEY = process.env.DAYDREAM_API_KEY!;

// ---- Handle GET ----
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const res = await fetch(`${DAYDREAM_API}/${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

// ---- Handle PATCH ----
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const body = await req.text();

  const res = await fetch(`${DAYDREAM_API}/${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

// ---- Handle POST ----
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const body = await req.text();

  const res = await fetch(`${DAYDREAM_API}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

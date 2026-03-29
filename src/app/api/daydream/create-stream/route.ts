// /app/api/daydream/create-stream/route.ts

import { NextResponse } from "next/server";

export async function POST() {
  const res = await fetch("https://api.daydream.live/v1/streams", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAYDREAM_API_KEY}`,
    },
    body: JSON.stringify({
      pipeline: "streamdiffusion",
      params: {
        model_id: "stabilityai/sd-turbo",
        prompt: "live performance",
      },
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: await res.text() },
      { status: 500 }
    );
  }

  const data = await res.json();

  // ✅ FORCE HTTPS HERE (critical)
  const whipUrl = data.whip_url.replace(/^http:/, "https:");

  return NextResponse.json({
    id: data.id,
    whipUrl,
    playbackId: data.output_playback_id,
  });
}
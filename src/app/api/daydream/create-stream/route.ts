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
        width: 512,
        height: 512,
        num_inference_steps: 25,
        guidance_scale: 1,
        delta: 0.7,
        t_index_list: [12, 20, 24],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const data = await res.json(); // ✅ FIXED (was "esponse")

  const whipUrl = String(data.whip_url || "").replace(/^http:/, "https:");

  return NextResponse.json({
    id: data.id,
    whipUrl,
    playbackId: data.output_playback_id,
  });
}
// /app/api/daydream/create-stream/route.ts

import { NextResponse } from "next/server";

export async function POST() {
  try {
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
      const errorText = await res.text();
      console.error("Daydream API error:", errorText);

      return NextResponse.json(
        { error: errorText },
        { status: 500 }
      );
    }

    const data = await res.json();

    // ✅ HARD ENFORCE HTTPS (critical fix)
    const whipUrl = String(data.whip_url || "").replace(
      "http://ai.livepeer.com",
      "https://ai.livepeer.com"
    );

    if (!whipUrl.startsWith("https://")) {
      throw new Error("Invalid WHIP URL (not HTTPS)");
    }

    console.log("✅ FINAL WHIP (backend):", whipUrl);

    return NextResponse.json({
      id: String(data.id),
      whipUrl,
      playbackId: String(data.output_playback_id ?? ""),
    });

  } catch (err: unknown) {
    console.error("Create stream failed:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
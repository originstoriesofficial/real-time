import { NextResponse } from "next/server";

const API_KEY = process.env.DAYDREAM_API_KEY!;

// There is no "passthrough" mode in the Daydream API.
// The closest instant equivalent is a very low delta + neutral prompt,
// which minimises AI transformation without a pipeline reload (~30s).
export async function POST(req: Request) {
  try {
    const { streamId } = await req.json();

    if (!streamId) {
      return new NextResponse("Missing streamId", { status: 400 });
    }

    const res = await fetch(`https://api.daydream.live/v1/streams/${streamId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        pipeline: "streamdiffusion
        params: {
          model_id: "stabilityai/sd-turbo",
          prompt: "natural realistic video, no filter",
          negative_prompt: "blurry, low quality, flat, 2d",
          delta: 0.15,          // near-zero AI transformation — instant, no reload
          guidance_scale: 1.0,
          num_inference_steps: 25,
          t_index_list: [12, 20, 24],
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(text, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("❌ return-live failed:", err);
    return new NextResponse(
      err instanceof Error ? err.message : "Server error",
      { status: 500 }
    );
  }
}
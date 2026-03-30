import { NextResponse } from "next/server";

const API_KEY = process.env.DAYDREAM_API_KEY!;

export async function POST(req: Request) {
  try {
    const { streamId, prompt, isAbstract, speed, motionSpeed } = await req.json();

    if (!streamId) {
      return new NextResponse("Missing streamId", { status: 400 });
    }

    const negativePrompt = isAbstract
      ? "face, person, human, body, blurry, low quality, flat"
      : "blurry, low quality, flat, 2d";

    const effectivePrompt = isAbstract
      ? `${prompt}, no face, abstract shapes, non-representational`
      : prompt;

    const params = {
      model_id: "stabilityai/sd-turbo",
      prompt: effectivePrompt,
      negative_prompt: negativePrompt,
      num_inference_steps: speed.num_inference_steps,
      guidance_scale: speed.guidance_scale,
      delta: speed.delta,
      t_index_list: speed.t_index_list,
      seed: Math.floor(Math.random() * 100000),
      acceleration: "tensorrt",
      use_lcm_lora: true,
      do_add_noise: true,
      use_denoising_batch: true,
      enable_similar_image_filter: true,
      similar_image_filter_threshold: 0.98,
      similar_image_filter_max_skip_frame:
        motionSpeed === "slow" ? 12 : motionSpeed === "medium" ? 8 : 4,
    };

    const patch = () =>
      fetch(`https://api.daydream.live/v1/streams/${streamId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ pipeline: "streamdiffusion", params }),
      });

    const isNotReady = (text: string) =>
      text.includes("STREAMS/NOT_FOUND") ||
      text.includes("Stream not ready") ||
      text.includes("not found");

    // Pipeline can take 15-30s to warm after creation — retry with backoff.
    const delays = [3000, 5000, 7000, 9000, 11000];
    let res = await patch();

    if (!res.ok) {
      let text = await res.text();

      if (!isNotReady(text)) {
        // A real error, not a warmup race — fail immediately.
        return new NextResponse(text, { status: 500 });
      }

      let succeeded = false;
      for (const delay of delays) {
        await new Promise((r) => setTimeout(r, delay));
        res = await patch();

        if (res.ok) {
          succeeded = true;
          break;
        }

        text = await res.text();
        if (!isNotReady(text)) {
          return new NextResponse(text, { status: 500 });
        }
      }

      if (!succeeded) {
        return new NextResponse(
          "Stream pipeline did not become ready in time. Please try again.",
          { status: 503 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("❌ update-stream failed:", err);
    return new NextResponse(
      err instanceof Error ? err.message : "Server error",
      { status: 500 }
    );
  }
}
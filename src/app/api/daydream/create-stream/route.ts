// ✅ FIX — MOVE STREAM CREATION TO BACKEND

// /app/api/daydream/create-stream/route.ts
export async function POST() {
  const res = await fetch("https://api.daydream.live/v1/streams", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAYDREAM_API_KEY}`, // ✅ server only
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

  const data = await res.json();

  return Response.json({
    id: data.id,
    playbackId: data.output_playback_id,
    whipUrl: data.whip_url,
  });
}
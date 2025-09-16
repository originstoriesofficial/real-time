"use client";

import React, { useMemo, useState } from "react";

const STREAM_ID = process.env.NEXT_PUBLIC_STREAM_ID!;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;
const PLAYBACK_ID = process.env.NEXT_PUBLIC_PLAYBACK_ID!;

const modes = ["dj", "karaoke", "live"] as const;
type Mode = (typeof modes)[number];

const djMoods = ["fire", "ocean", "neon", "forest", "sunset"];
const karaokeGenres = ["90s brit pop", "neon skater", "hip hop futuristic", "classic rock", "bubblegum pop"];
const liveTags = ["epic", "intimate", "city vibes", "lofi party", "surreal crowd", "dreamy concert"];

const styles = [
  "award-winning cinematic, 3D, vibrant monochromatic, crystallized, 4k",
  "80s VHS scene, analog scanlines, deep contrast, saturated blues, cinematic lighting",
  "digital painting, sharp lines, rich gradients, motion blur, glow highlights",
  "holographic lightscape, metallic, prismatic, surreal composition",
  "retro anime style, cel-shading, 90s vibes, deep shadows",
  "dreamy impressionist brushstrokes, warm colors, fluid texture",
];

function generatePrompt(base: string) {
  const style = styles[Math.floor(Math.random() * styles.length)];
  // keep prompt simple; seed stays in params
  return `a ${base} scene, ${style}`;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("dj");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo(() => {
    if (mode === "dj") return djMoods;
    if (mode === "karaoke") return karaokeGenres;
    return liveTags;
  }, [mode]);

  const handlePromptSubmit = async (base: string) => {
    setError(null);
    if (!STREAM_ID || !API_KEY) {
      setError("Missing NEXT_PUBLIC_STREAM_ID or NEXT_PUBLIC_API_KEY");
      return;
    }

    const seed = Math.floor(Math.random() * 10_000);
    const prompt = generatePrompt(base);
    setBusy(true);

    try {
      const res = await fetch(`https://api.daydream.live/beta/streams/${STREAM_ID}/prompts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          pipeline: "live-video-to-video",
          model_id: "streamdiffusion",
          params: {
            model_id: "stabilityai/sd-turbo",
            prompt,
            prompt_interpolation_method: "slerp",
            normalize_prompt_weights: true,
            normalize_seed_weights: true,
            negative_prompt: "blurry, low quality, flat, 2d",
            num_inference_steps: 30,
            seed,
            t_index_list: [0, 8, 17],
            controlnets: [
              {
                conditioning_scale: 0.7,
                control_guidance_end: 1,
                control_guidance_start: 0,
                enabled: true,
                model_id: "thibaud/controlnet-sd21-color-diffusers",
                preprocessor: "passthrough",
                preprocessor_params: {},
              },
            ],
            lora_dict: {},
            use_lcm_lora: true,
            lcm_lora_id: "latent-consistency/lcm-lora-sdv1-5",
            acceleration: "tensorrt",
            use_denoising_batch: true,
            do_add_noise: true,
            seed_interpolation_method: "linear",
            enable_similar_image_filter: false,
            similar_image_filter_threshold: 0.98,
            similar_image_filter_max_skip_frame: 10,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Daydream error:", data);
        setError(typeof data?.detail === "string" ? data.detail : `Request failed (${res.status}).`);
        return;
      }
      console.log("✅ Daydream response:", data);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ padding: 40, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1>VPM PRO - Real-Time Mode: <strong>{mode.toUpperCase()}</strong></h1>

      <div style={{ marginBottom: 20 }}>
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={busy}
            style={{
              padding: "10px 20px",
              marginRight: 10,
              backgroundColor: mode === m ? "#111" : "#eee",
              color: mode === m ? "#fff" : "#000",
              border: "none",
              borderRadius: 8,
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" style={{ background: "#ffe8e8", border: "1px solid #f5b5b5", color: "#7a1e1e", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap" }}>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => handlePromptSubmit(tag)}
            disabled={busy}
            style={{
              padding: "12px 24px",
              margin: 8,
              fontSize: "16px",
              borderRadius: "10px",
              cursor: busy ? "not-allowed" : "pointer",
              border: "1px solid #ccc",
              backgroundColor: busy ? "#f1f1f1" : "#f9f9f9",
            }}
          >
            {busy ? "Sending..." : tag}
          </button>
        ))}
      </div>

      <iframe
      src={`https://lvpr.tv/?v=${PLAYBACK_ID}&lowLatency=force`}
      width="100%"
      height="500"
      style={{ marginTop: 40, border: "none" }}
      allow="autoplay; fullscreen"
      allowFullScreen  

      />

    </main>
  );
}

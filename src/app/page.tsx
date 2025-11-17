"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { fal } from "@fal-ai/client";

// --- CONFIG ---
fal.config({
  credentials: process.env.NEXT_PUBLIC_FAL_KEY || "",
});

const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;
const DEFAULT_PIPELINE = "pip_SD-turbo";

const modes = ["dj", "karaoke", "live"] as const;
type Mode = (typeof modes)[number];

const djMoods = ["fire", "ocean", "neon", "forest", "sunset"];
const karaokeGenres = [
  "90s brit pop",
  "neon skater",
  "hip hop futuristic",
  "classic rock",
  "bubblegum pop",
  "disco fever",
  "grunge basement",
  "synthwave nostalgia",
  "afrofuturist vibes",
  "punk rebellion",
  "dream pop haze",
  "latin groove night",
  "jazz noir lounge",
  "country sunset drive",
  "electronic trance bloom",
];
const liveTags = [
  "epic",
  "intimate",
  "city vibes",
  "lofi party",
  "surreal crowd",
  "dreamy concert",
];

// --- Helpers ---
function generatePrompt(base: string, mode: Mode) {
  const styles = [
    "award-winning cinematic, 3D, vibrant monochromatic, crystallized, 4k",
    "80s VHS scene, analog scanlines, deep contrast, saturated blues, cinematic lighting",
    "digital painting, sharp lines, rich gradients, motion blur, glow highlights",
    "holographic lightscape, metallic, prismatic, surreal composition",
    "retro anime style, cel-shading, 90s vibes, deep shadows",
    "dreamy impressionist brushstrokes, warm colors, fluid texture",
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];

  const performerFocus =
    mode === "karaoke"
      ? ", close-up on performer's face, upper body, clear lighting, detailed facial features"
      : "";

  const enriched =
    base.trim().split(" ").length <= 2
      ? `performer in ${base.trim()}`
      : base.trim();

  return `a ${enriched} scene${performerFocus}, ${style}`;
}

// --- COMPONENT ---
export default function Home() {
  const [mode, setMode] = useState<Mode>("dj");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [songPrompt, setSongPrompt] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stream, setStream] = useState<{
    id: string;
    playbackId: string;
    whipUrl: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // --- FULLSCREEN HANDLER ---
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const requestFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as any).webkitRequestFullscreen)
      (el as any).webkitRequestFullscreen();
  };

  // --- TAG SET ---
  const tags = useMemo(() => {
    if (mode === "dj") return djMoods;
    if (mode === "karaoke") return karaokeGenres;
    return liveTags;
  }, [mode]);

  // --- CREATE STREAM ---
  const createStream = async (pipelineId = DEFAULT_PIPELINE) => {
    try {
      console.log("🎥 Creating new stream...");
      const res = await fetch("https://api.daydream.live/v1/streams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: pipelineId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      console.log("✅ Stream created:", data);
      setStream({
        id: data.id,
        playbackId: data.output_playback_id,
        whipUrl: data.whip_url,
      });
      return data;
    } catch (err) {
      console.error("❌ Stream creation failed:", err);
      setError("Stream creation failed. Check API key or connection.");
      return null;
    }
  };

  useEffect(() => {
    if (!stream) createStream();
  }, []);

  // --- SEND PROMPT TO DAYDREAM ---
  const sendPromptToDaydream = async (finalPrompt: string) => {
    if (!finalPrompt?.trim()) return setError("Prompt is empty.");
    if (!API_KEY) return setError("Missing Daydream API key.");

    let currentStream = stream;
    if (!currentStream) {
      const newStream = await createStream();
      if (!newStream) return;
      currentStream = {
        id: newStream.id,
        playbackId: newStream.output_playback_id,
        whipUrl: newStream.whip_url,
      };
    }

    const seed = Math.floor(Math.random() * 100000);
    const params = {
      model_id: "stabilityai/sd-turbo",
      prompt: finalPrompt.trim(),
      prompt_interpolation_method: "slerp",
      normalize_prompt_weights: true,
      normalize_seed_weights: true,
      negative_prompt: "blurry, low quality, flat, 2d",
      num_inference_steps: 50,
      seed,
      t_index_list: [0, 8, 17],
      controlnets: [
        {
          conditioning_scale: 0.22,
          control_guidance_end: 1,
          control_guidance_start: 0,
          enabled: true,
          model_id: "thibaud/controlnet-sd21-openpose-diffusers",
          preprocessor: "pose_tensorrt",
          preprocessor_params: {},
        },
        {
          conditioning_scale: 0.2,
          control_guidance_end: 1,
          control_guidance_start: 0,
          enabled: true,
          model_id: "thibaud/controlnet-sd21-color-diffusers",
          preprocessor: "passthrough",
          preprocessor_params: {},
        },
      ],
    };

    try {
      console.log("🚀 Sending prompt:", params);
      const res = await fetch(
        `https://api.daydream.live/v1/streams/${currentStream.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({ params }),
        }
      );
      const text = await res.text();
      if (!res.ok) throw new Error(`Daydream ${res.status}: ${text}`);
      console.log("✅ Prompt applied successfully.");
    } catch (err) {
      console.error("❌ Daydream error:", err);
      setError("Daydream API failed — recreating stream...");
      setStream(null);
      await createStream();
    } finally {
      setBusy(false);
    }
  };

  // --- MANUAL PROMPT ---
  const handlePromptSubmit = async (base: string) => {
    if (!base.trim()) return setError("Enter a prompt first.");
    const merged = generatePrompt(base, mode);
    setBusy(true);
    await sendPromptToDaydream(merged);
  };

  // --- SONG → CLAUDE → DAYDREAM ---
  const fetchSongVisualContext = async () => {
    if (!songPrompt.trim()) return setError("Enter a song name first.");
    setBusy(true);
    setError(null);
    try {
      const result = await fal.subscribe("openrouter/router", {
        input: {
          prompt: `
You are a visual culture AI trained on the global catalogue of music videos and stage performances.

Task: Given a song title, research its *actual* music video (if it exists) or deduce the genre and era visual trends.
Extract: lighting, cinematography, wardrobe, set design, color palette, camera motion, and performance mood.

Then output a single cinematic generative prompt that recreates that visual look for diffusion or video generation.
No artist or lyric names — only filmic, visual language.

Song: "${songPrompt}"
Respond only with the final cinematic prompt.`,
          model: "anthropic/claude-3.5-sonnet",
          temperature: 0.35,
          max_tokens: 350,
        },
      });

      const output = result.data?.output?.trim() ?? "";
      console.log("🎬 Claude visual:", output);
      if (output) await sendPromptToDaydream(output);
      else setError("Claude returned no visual data.");
    } catch (e) {
      console.error("❌ Fal AI error:", e);
      setError("Failed to generate song visuals.");
    } finally {
      setBusy(false);
    }
  };

  // --- RENDER ---
  return (
    <main
      style={{
        height: "100vh",
        width: "100vw",
        margin: 0,
        padding: 0,
        background: "#000",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {!isFullscreen && (
        <div style={{ padding: 20, position: "relative", zIndex: 2 }}>
          <h1>
            🎛 VPM PRO — Mode: <strong>{mode.toUpperCase()}</strong>
          </h1>

          {/* mode buttons */}
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
            <button
              onClick={requestFullscreen}
              style={{
                padding: "10px 20px",
                background: "#444",
                color: "#fff",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              FULLSCREEN
            </button>
          </div>

          {/* manual prompt input */}
          <div style={{ marginBottom: 25 }}>
            <h3>🎨 Manual Visual Prompt</h3>
            <input
              type="text"
              placeholder="Describe a scene (e.g. performer in neon alley)"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              style={{
                padding: "12px",
                width: "60%",
                marginRight: "10px",
                borderRadius: "8px",
                border: "1px solid #555",
              }}
            />
            <button
              onClick={() => handlePromptSubmit(customPrompt)}
              disabled={busy}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                backgroundColor: "#111",
                color: "#fff",
                fontWeight: "bold",
                border: "none",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "..." : "Send Visual Prompt"}
            </button>
          </div>

          {/* song input */}
          <div style={{ marginBottom: 25 }}>
            <h3>🎵 Song to Visual AI</h3>
            <input
              type="text"
              placeholder="Enter song name or artist"
              value={songPrompt}
              onChange={(e) => setSongPrompt(e.target.value)}
              style={{
                padding: "12px",
                width: "60%",
                marginRight: "10px",
                borderRadius: "8px",
                border: "1px solid #555",
              }}
            />
            <button
              onClick={fetchSongVisualContext}
              disabled={busy}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                backgroundColor: "#333",
                color: "#fff",
                fontWeight: "bold",
                border: "none",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "..." : "Generate from Song"}
            </button>
          </div>

          {/* tag presets */}
          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 20 }}>
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
                  border: "1px solid #444",
                  backgroundColor: busy ? "#222" : "#333",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          {error && (
            <div
              style={{
                background: "#331111",
                border: "1px solid #aa2222",
                padding: 10,
                borderRadius: 6,
                color: "#ffbbbb",
              }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      {/* fullscreen / display area */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "1920px",
          height: "1080px",
          aspectRatio: "16 / 9",
          maxWidth: "100vw",
          maxHeight: "100vh",
          overflow: "hidden",
          backgroundColor: "#000",
          zIndex: 1,
          border: "none",
        }}
      >
        {stream?.playbackId && (
          <iframe
            src={`https://lvpr.tv/?v=${stream.playbackId}&embed=1&lowLatency=force`}
            style={{
              border: "none",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; camera; microphone"
            allowFullScreen
          />
        )}
      </div>
    </main>
  );
}

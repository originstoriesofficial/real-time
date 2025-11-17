"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.NEXT_PUBLIC_FAL_KEY || "",
});

const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;
const PIPELINE_ID = "pip_SD-turbo";

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
const liveTags = ["epic", "intimate", "city vibes", "lofi party", "surreal crowd", "dreamy concert"];

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
    base.trim().split(" ").length <= 2 ? `performer in ${base.trim()}` : base.trim();

  return `a ${enriched} scene${performerFocus}, ${style}`;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("dj");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [songPrompt, setSongPrompt] = useState("");
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stream, setStream] = useState<{ id: string; playbackId: string; whipUrl: string } | null>(
    null
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // fullscreen tracking
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const requestFullscreen = () => {
    const elem = containerRef.current;
    if (elem?.requestFullscreen) elem.requestFullscreen();
  };

  const tags = useMemo(() => {
    if (mode === "dj") return djMoods;
    if (mode === "karaoke") return karaokeGenres;
    return liveTags;
  }, [mode]);

  // create stream once
  const createStream = async () => {
    try {
      const res = await fetch("https://api.daydream.live/v1/streams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ pipeline_id: PIPELINE_ID }),
      });
      const data = await res.json();
      setStream({ id: data.id, playbackId: data.output_playback_id, whipUrl: data.whip_url });
      console.log("🎥 Stream created:", data);
    } catch (err) {
      console.error(err);
      setError("Stream creation failed");
    }
  };

  useEffect(() => {
    if (!stream) createStream();
  }, []);

  // call Fal AI / Claude for visual context
  const fetchSongVisualContext = async () => {
    if (!songPrompt.trim()) return setError("Enter a song name first.");
    setBusy(true);
    setError(null);
    try {
      const result = await fal.subscribe("openrouter/router", {
        input: {
          prompt: `You are trained on the visual and cinematic language of all music videos. Given the song "${songPrompt}", describe a vivid cinematic visual scene with lighting, color palette, motion, texture, and mood.`,
          model: "anthropic/claude-3.5-sonnet",
          temperature: 0.7,
          max_tokens: 250,
        },
      });
      const output = result.data?.output ?? "";
      setAiPrompt(output);
      console.log("🎨 Claude generated visual context:", output);
      await sendPromptToDaydream(output);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch visual context.");
    } finally {
      setBusy(false);
    }
  };

  // unified send to Daydream
  const sendPromptToDaydream = async (finalPrompt: string) => {
    if (!stream?.id || !API_KEY) return setError("Stream not ready or API key missing");

    const seed = Math.floor(Math.random() * 10_000);
    setBusy(true);
    try {
      const res = await fetch(`https://api.daydream.live/v1/streams/${stream.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          params: {
            model_id: "stabilityai/sd-turbo",
            prompt: finalPrompt,
            negative_prompt: "blurry, low quality, flat, 2d",
            num_inference_steps: 40,
            seed,
            width: 1920,
            height: 1080,
          },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }

      console.log("✅ Prompt sent:", finalPrompt);
      setGeneratedPrompt(finalPrompt);
    } catch (e) {
      console.error(e);
      setError("Failed to send prompt to Daydream");
    } finally {
      setBusy(false);
    }
  };

  // manual visual prompt submit
  const handlePromptSubmit = async (base: string) => {
    if (!base.trim()) return setError("Enter a prompt first.");
    const merged = generatePrompt(base, mode);
    await sendPromptToDaydream(merged);
  };

  return (
    <main
      style={{
        margin: 0,
        padding: 0,
        height: "100vh",
        width: "100vw",
        position: "relative",
        fontFamily: "Inter, sans-serif",
        background: "#000",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {!isFullscreen && (
        <div style={{ padding: 20, position: "relative", zIndex: 2 }}>
          <h1>🎛 VPM PRO — Mode: <strong>{mode.toUpperCase()}</strong></h1>

          {/* Mode buttons */}
          <div style={{ marginBottom: 20 }}>
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "10px 20px",
                  marginRight: 10,
                  backgroundColor: mode === m ? "#111" : "#eee",
                  color: mode === m ? "#fff" : "#000",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
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

          {/* Box 1: Manual visual prompt */}
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
                border: "1px solid #ccc",
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

          {/* Box 2: Song → LLM → Daydream */}
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
                border: "1px solid #ccc",
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

          {aiPrompt && (
            <div
              style={{
                background: "#111",
                padding: "10px 15px",
                borderRadius: 8,
                marginBottom: 20,
                color: "#ccc",
                fontSize: "14px",
                whiteSpace: "pre-wrap",
              }}
            >
              <strong>AI Visual Context:</strong> {aiPrompt}
            </div>
          )}

          {/* Preset buttons */}
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
                  border: "1px solid #ccc",
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

      {/* Fullscreen Display */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "1920px",
          height: "1080px",
          maxWidth: "100vw",
          maxHeight: "100vh",
          zIndex: 1,
          overflow: "hidden",
          backgroundColor: "#000",
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

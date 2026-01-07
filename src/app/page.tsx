"use client";

/* ============================================================
   VPM PRO – Visual Performance Mixer
   Unified full build (DJ / Karaoke / Live)
   With Gemini + Daydream integration + IP Adapter upload
   ============================================================ */

import React, { useMemo, useState, useRef, useEffect } from "react";
import { VisualStreamController } from "./VisualStreamController";

/* ============================================================
   CONFIGURATION
   ============================================================ */
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;
const DEFAULT_PIPELINE = "pip_SD-turbo";

const modes = ["dj", "karaoke", "live"] as const;
type Mode = (typeof modes)[number];

// DJ Mood Tags
const djMoods = ["fire", "ocean", "neon", "forest", "sunset"];

// Karaoke Style Genres
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

// Live Stage Atmospheres
const liveTags = [
  "epic",
  "intimate",
  "city vibes",
  "lofi party",
  "surreal crowd",
  "dreamy concert",
];

// --- Static Artist Presets ---
const artistPresets: Record<string, string[]> = {
    fletch: [
      "🌆 Euphoric midsummer concert in hazy magenta and cyan light, 90s VHS texture, soft grain, nostalgic dream pop glow",
      "🌃 Emotional neon rooftop performance, pink-blue reflections on wet concrete, handheld film grain aesthetic",
      "🌅 Sunset drive with cyan haze and pink neon horizon, nostalgic coming-of-age tones, dreamy composition",
      "🌌 Surreal concert with floating lights, euphoric VHS flicker, grainy cinematic lighting",
      "🎞️ Intimate crowd scene in turquoise fog, shimmering pink flares, soft lens effect, youthful emotion",
    ],
    bradford: [
      "🔥 Raw indie rock performance under amber spotlights, grainy film look, vintage edge",
      "🎸 Basement stage with smoky haze, handheld cam energy, warm orange tones",
      "💡 Spotlight-focused solo act with minimal backdrop, deep shadows and cinematic isolation",
      "🌙 Late-night rehearsal room vibe, moody blue lighting, intimate camera feel",
      "🏙️ Electric city night performance, fast pans, red-orange glow reflecting wet streets",
    ],
    cherry: [
      "🌊 Soft pink ocean horizon performance, ethereal lighting, pastel cyan waves",
      "💫 Dreamlike synthwave club with glowing pink fog and glitter haze, VHS texture",
      "🌈 Floating silhouettes in watery reflections, emotional ambient color bleed",
      "🩵 Moonlit seashore with magenta shimmer, soft VHS bloom, gentle camera drift",
      "🌸 Sunset beach with cyan streaks, grainy analog vibe, introspective emotional tone",
    ],
  };
  

/* ============================================================
   UTILITY: Prompt Generator
   ============================================================ */
function generatePrompt(base: string, mode: Mode) {
  const styles = [
    "award-winning cinematic, 3D, vibrant monochromatic, crystallized, 4k",
    "80s VHS scene, analog scanlines, deep contrast, saturated blues, cinematic lighting",
    "digital painting, sharp lines, rich gradients, motion blur, glow highlights",
    "holographic lightscape, metallic, prismatic, surreal composition",
    "retro anime style, cel-shading, 90s vibes, deep shadows",
    "dreamy impressionist brushstrokes, warm colors, fluid texture",
  ];

  const performerFocusOptions = [
    "close-up on performer's face, clear lighting, detailed facial features",
    "medium shot of performer, waist-up, expressive movement, ambient lighting",
    "wide shot of stage with performer, dynamic composition, atmospheric haze",
    "over-the-shoulder shot from performer, crowd in background, dramatic backlight",
    "side profile of performer, soft rim light, shallow depth of field",
    "low-angle shot looking up at performer, spotlight overhead",
  ];

  const style = styles[Math.floor(Math.random() * styles.length)];
  const focus =
    mode === "karaoke"
      ? `, ${
          performerFocusOptions[
            Math.floor(Math.random() * performerFocusOptions.length)
          ]
        }`
      : "";

  const enriched =
    base.trim().split(" ").length <= 2
      ? `performer in ${base.trim()}`
      : base.trim();

  return `a ${enriched} scene${focus}, ${style}`;
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function Home() {
  // =================== State ===================
  const [mode, setMode] = useState<Mode>("dj");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [songPrompt, setSongPrompt] = useState("");
  const [artist, setArtist] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedPresets, setGeneratedPresets] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [styleImageBase64, setStyleImageBase64] = useState<string | null>(null);
  const [motionSpeed, setMotionSpeed] = useState<"slow" | "medium" | "fast">("medium");
  


  const [stream, setStream] = useState<{
    id: string;
    playbackId: string;
    whipUrl: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  /* ============================================================
     FULLSCREEN HANDLER
     ============================================================ */
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const requestFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as any).webkitRequestFullscreen)
      (el as any).webkitRequestFullscreen();
  };

  /* ============================================================
     STREAM CREATION
     ============================================================ */
  const createStream = async (pipelineId = DEFAULT_PIPELINE) => {
    try {
      console.log("🎥 Creating new stream...");
      const res = await fetch("https://api.daydream.live/v1/streams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          pipeline_id: pipelineId,
          width: 1280, // 16:9 ratio setup
          height: 720,
        }),
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
    if (!stream) void createStream();
  }, [stream]);

  /* ============================================================
     STREAM UPDATER
     ============================================================ */
  const updateStream = async (params: any) => {
    if (!stream) return;
    try {
      const res = await fetch(
        `https://api.daydream.live/v1/streams/${stream.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({ params }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      console.log("✅ Stream updated successfully");
    } catch {
      setError("Failed to update stream");
    }
  };

  /* ============================================================
     INPUT HANDLERS + QUESTIONNAIRE
     ============================================================ */
  const handleInputChange = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  // Convert uploaded file → base64
// =================== STYLE IMAGE UPLOAD HANDLER ===================
const handleStyleImageUpload = (file: File | null) => {
    if (!file) {
      setStyleImageBase64(null);
      return;
    }
  
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setStyleImageBase64(result);
          console.log("🎨 Uploaded style image (Base64):", result.slice(0, 80) + "...");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("❌ Failed to process style image:", err);
    }
  };
  
  const handleQuestionnaireSubmit = async () => {
    console.log("🎨 Artist Questionnaire Answers:", answers);
    setBusy(true);
  
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `
  Generate 5 short Stable Diffusion scene prompts for a cinematic live visual performance.  
  Base them on these artist answers:  
  ${JSON.stringify(answers, null, 2)}  
  
  Each line should be vivid and unique, e.g.:  
  "Dreamy stage bathed in pink and blue haze, cinematic lighting, 4k"
                    `,
                  },
                ],
              },
            ],
          }),
        }
      );
  
      const data = await response.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Dreamy concert, cinematic lights, 4k";
  
      const presets = text
        .split("\n")
        .filter((t: string) => t.trim())
        .map((t: string) => t.replace(/^-/, "").trim());
  
      setGeneratedPresets(presets);
      setArtist("generated");
    } catch (err) {
      console.error("❌ Gemini preset generation failed:", err);
      setGeneratedPresets([
        "Dreamy concert in soft hues, cinematic 4k",
        "Golden haze live performance, surreal lighting",
        "Pastel neon crowd with VHS film grain aesthetic",
        "Euphoric youth montage in magenta glow",
        "Cyan mist performance under emotional backlight",
      ]);
      setArtist("generated");
    } finally {
      setBusy(false);
    }
  };
  
  /* ============================================================
     DAYDREAM PROMPT SUBMIT
     ============================================================ */
  const sendPromptToDaydream = async (finalPrompt: string) => {
    if (!finalPrompt?.trim()) return setError("Prompt is empty.");
    if (!API_KEY) return setError("Missing Daydream API key.");

    let speedSettings;
if (motionSpeed === "slow") {
  speedSettings = {
    delta: 0.3,
    num_inference_steps: 35,
    t_index_list: [0, 11, 17],
    guidance_scale: 0.8,
  };
} else if (motionSpeed === "medium") {
  speedSettings = {
    delta: 0.45,
    num_inference_steps: 45,
    t_index_list: [0, 8, 16],
    guidance_scale: 0.9,
  };
} else {
  // fast
  speedSettings = {
    delta: 0.65,
    num_inference_steps: 50,
    t_index_list: [0, 5, 10, 15],
    guidance_scale: 1.1,
  };
}

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

    setIsLiveMode(false);
    const seed = Math.floor(Math.random() * 100000);

    // IP Adapter: if style image uploaded, attach Base64
    const ip_adapter = {
      type: "regular",
      enabled: true,
      scale: 1.3,
      weight_type: "linear",
    };

    const params = {
        model_id: "stabilityai/sdxl-turbo",
        prompt: finalPrompt.trim(),
        negative_prompt: "blurry, low quality, flat, 2d",
        width: 1280,
        height: 720,
        seed,
        ip_adapter,
        ...(styleImageBase64 ? { ip_adapter_style_image_url: styleImageBase64 } : {}),
        ...speedSettings,  // 👈 inject speed preset here
        controlnets: [
          {
            conditioning_scale: 0.8,
            enabled: true,
            model_id: "thibaud/controlnet-sd21-openpose-diffusers",
            preprocessor: "pose_tensorrt",
          },
          {
            conditioning_scale: 0.7,
            enabled: true,
            model_id: "thibaud/controlnet-sd21-color-diffusers",
            preprocessor: "passthrough",
          },
          {
            conditioning_scale: motionSpeed === "fast" ? 0.8 : 0.5,
            enabled: true,
            model_id: "thibaud/controlnet-sd21-depth-diffusers",
            preprocessor: "depth_tensorrt",
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
      if (!res.ok) throw new Error(await res.text());
      console.log("✅ Prompt applied successfully.");
    } catch (err) {
      console.error("❌ Daydream error:", err);
      setStream(null);
      await createStream();
    } finally {
      setBusy(false);
    }
  };

  const handlePromptSubmit = async (base: string) => {
    if (!base.trim()) return setError("Enter a prompt first.");
    const merged = generatePrompt(base, mode);
    setBusy(true);
    await sendPromptToDaydream(merged);
  };

  /* ============================================================
     SONG → VISUAL AI (Karaoke Only)
     ============================================================ */
  const handleKaraokeVisual = async () => {
    if (!songPrompt.trim()) return setError("Enter a song name first.");
    setBusy(true);
    try {
      const prompt = `
Create one short visual scene prompt for a Stable Diffusion video performance 
based on the song or artist name below. 
It should feel cinematic and match the mood of the music.

Song or artist: "${songPrompt}"

Format the response as one descriptive line, e.g.:
"Dynamic concert scene with neon lights and smoke, cinematic, 4k"
`;
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      const data = await response.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Energetic live performance, cinematic, 4k";
      await handlePromptSubmit(text);
    } catch (err) {
      console.error("❌ Gemini song-to-visual failed:", err);
      setError("Failed to generate visuals from song.");
    } finally {
      setBusy(false);
    }
  };

  

  /* ============================================================
     RETURN TO LIVE MODE
     ============================================================ */
  const returnToLiveMode = async () => {
    if (!stream) return;
    setBusy(true);
    try {
      const res = await fetch(
        `https://api.daydream.live/v1/streams/${stream.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({ params: null }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      setIsLiveMode(true);
    } catch {
      setError("Failed to return to live mode");
    } finally {
      setBusy(false);
    }
  };

  /* ============================================================
     TAG BANK (by Mode)
     ============================================================ */
  const tags = useMemo(() => {
    if (mode === "dj") return djMoods;
    if (mode === "karaoke") return karaokeGenres;
    return liveTags;
  }, [mode]);

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <main
      style={{
        height: "100vh",
        width: "100vw",
        background: "#000",
        color: "#fff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* =================== CONTROL PANEL =================== */}
      {!isFullscreen && (
        <div style={{ padding: 20, position: "relative", zIndex: 2 }}>
          <h1>🎛 VPM PRO — Mode: {mode.toUpperCase()}</h1>

          {/* MODE BUTTONS */}
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
                  cursor: "pointer",
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
            <button
              onClick={returnToLiveMode}
              disabled={busy || isLiveMode}
              style={{
                padding: "10px 20px",
                background: isLiveMode ? "#555" : "#0a0",
                color: "#fff",
                borderRadius: 8,
                border: "none",
              }}
            >
              {isLiveMode ? "● LIVE" : "BACK TO LIVE"}
            </button>
            <button
              onClick={requestFullscreen}
              style={{
                padding: "10px 20px",
                background: "#444",
                color: "#fff",
                borderRadius: 8,
                border: "none",
              }}
            >
              FULLSCREEN
            </button>
          </div>
          {/* MOTION SPEED CONTROLS */}
        <div style={{ marginBottom: 20 }}>
        <h4>🎞️ Motion Speed</h4>
        {["slow", "medium", "fast"].map((speed) => (
        <button
        key={speed}
        onClick={() => setMotionSpeed(speed as "slow" | "medium" | "fast")}
        disabled={busy}
        style={{
        padding: "10px 20px",
        marginRight: 10,
        backgroundColor: motionSpeed === speed ? "#111" : "#eee",
        color: motionSpeed === speed ? "#fff" : "#000",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      {speed === "slow" ? "🐢 Slow" : speed === "medium" ? "⚖️ Medium" : "⚡ Fast"}
    </button>
    ))}
    </div>


          {/* LIVE MODE SECTION */}
          {mode === "live" && (
            <div style={{ marginBottom: 30 }}>
              <h3>🎤 Artist Visual Presets</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button onClick={() => setArtist("new")}>➕ New Artist</button>
                <button onClick={() => setArtist("fletch")}>🎧 Fletch</button>
                <button onClick={() => setArtist("bradford")}>
                  🎸 Bradford
                </button>
                <button onClick={() => setArtist("cherry")}>🌊 Cherry</button>
              </div>

              {/* NEW ARTIST QUESTIONNAIRE */}
              {artist === "new" && (
                <div style={{ marginTop: 20, maxWidth: "800px" }}>
                  <h3>🧠 Visual Intake Form – New Artist</h3>
                  {[
                    ["Color Palette", "colorPalette", "blue/pink"],
                    ["Cultural References", "culturalRefs", "coming-of-age films"],
                    ["Emotional Atmosphere", "emotion", "euphoric, youthful"],
                    ["Texture / Finish", "texture", "grainy, VHS"],
                    ["Season", "season", "summer nostalgia"],
                    [
                      "Abstract / Object-Based",
                      "visualType",
                      "mix of surreal and organic",
                    ],
                    ["References", "references", "Kilu, Bleech93, Catfish"],
                  ].map(([label, key, ph]) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <label>{label}</label>
                      <input
                        type="text"
                        placeholder={ph}
                        onChange={(e) =>
                          handleInputChange(key as string, e.target.value)
                        }
                        style={{ width: "100%", padding: 8 }}
                      />
                    </div>
                  ))}

                  {/* Style Image Upload (Base64) */}
                  <div style={{ marginTop: 12 }}>
                    <label>🎨 Upload Style Image (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleStyleImageUpload(e.target.files?.[0] || null)
                      }
                    />
                    {styleImageBase64 && (
                      <img
                        src={styleImageBase64}
                        alt="Style preview"
                        style={{
                          width: "200px",
                          marginTop: 10,
                          borderRadius: 8,
                        }}
                      />
                    )}
                  </div>

                  <button
                    onClick={handleQuestionnaireSubmit}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "#0a0",
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      marginTop: 10,
                    }}
                  >
                    ✅ Submit Visual Questionnaire
                  </button>
                  {generatedPresets.length > 0 && (
  <div style={{ marginTop: 20 }}>
    <h3>🎬 Custom Visual Presets</h3>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
      {generatedPresets.map((preset) => (
        <button
          key={preset}
          onClick={() => handlePromptSubmit(preset)}
          style={{
            padding: "12px 24px",
            background: "#1a1a1a",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: "8px",
            cursor: "pointer",
            boxShadow: "0 0 10px rgba(200, 87, 200, 0.5)",
          }}
        >
          {preset}
        </button>
      ))}
    </div>
    <button
      onClick={handleQuestionnaireSubmit}
      disabled={busy}
      style={{
        marginTop: 16,
        padding: "10px 20px",
        background: "#333",
        color: "#fff",
        borderRadius: 8,
        border: "1px solid #666",
      }}
    >
      🔁 Regenerate 5 Presets
    </button>
  </div>
)}


                </div>
              )}
              {artist && artistPresets[artist] && (
  <div style={{ marginTop: 20 }}>
    <h3>
      🎬{" "}
      {artist === "fletch"
        ? "FLETCHR FLETCHR VISUAL PRESETS"
        : artist === "bradford"
        ? "BRADFORD VISUAL PRESETS"
        : "CHERRY MAKES WAVES VISUAL PRESETS"}
    </h3>
    <p>Click a preset below to send it live to your stream.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
      {artistPresets[artist].map((preset) => (
        <button
          key={preset}
          onClick={() => handlePromptSubmit(preset)}
          style={{
            padding: "12px 24px",
            background: "#222",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: "8px",
            cursor: "pointer",
            boxShadow:
              artist === "fletch"
                ? "0 0 12px rgba(200, 87, 200, 0.5)"
                : artist === "cherry"
                ? "0 0 12px rgba(100, 180, 255, 0.5)"
                : "0 0 12px rgba(255, 140, 0, 0.4)",
          }}
        >
          {preset}
        </button>
      ))}
    </div>
  </div>
)}


              {/* GENERATED PRESETS */}
              {artist === "generated" && (
                <div style={{ marginTop: 20 }}>
                  <h3>🎨 Gemini-Generated Presets</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {generatedPresets.map((preset: string) => (
                      <button
                        key={preset}
                        onClick={() => handlePromptSubmit(preset)}
                        style={{
                          padding: "12px 24px",
                          background: "#222",
                          color: "#fff",
                          borderRadius: 8,
                          border: "1px solid #555",
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MANUAL PROMPT */}
          <div style={{ marginBottom: 25 }}>
            <h3>🎨 Manual Visual Prompt</h3>
            <input
              type="text"
              placeholder="Describe a scene"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              style={{ padding: 12, width: "60%", marginRight: 10 }}
            />
            <button onClick={() => handlePromptSubmit(customPrompt)} disabled={busy}>
              {busy ? "..." : "Send Visual Prompt"}
            </button>
          </div>

          {/* SONG TO VISUAL (Only Karaoke) */}
          {mode === "karaoke" && (
            <div style={{ marginBottom: 25 }}>
              <h3>🎵 Song to Visual AI</h3>
              <input
                type="text"
                placeholder="Enter song or artist"
                value={songPrompt}
                onChange={(e) => setSongPrompt(e.target.value)}
                style={{ padding: 12, width: "60%", marginRight: 10 }}
              />
              <button onClick={handleKaraokeVisual} disabled={busy}>
                {busy ? "..." : "Generate from Song"}
              </button>
            </div>
          )}

          {/* TAG BANK */}
          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 20 }}>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handlePromptSubmit(tag)}
                disabled={busy}
                style={{
                  margin: 8,
                  padding: "12px 24px",
                  borderRadius: 10,
                  background: "#333",
                  color: "#fff",
                  border: "1px solid #444",
                }}
              >
                {tag}
              </button>
            ))}
            <button
              onClick={() => {
                const randomTag = tags[Math.floor(Math.random() * tags.length)];
                handlePromptSubmit(randomTag);
              }}
              disabled={busy}
            >
              🔀 Shuffle Bank
            </button>
          </div>

          {error && <div style={{ color: "red" }}>{error}</div>}

          {/* Optional Controller */}
          <VisualStreamController updateStream={updateStream} />
        </div>
      )}

      {/* =================== STREAM DISPLAY =================== */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "100vw",
            aspectRatio: "16 / 9",
            backgroundColor: "#000",
          }}
        >
          {stream?.playbackId && (
            <iframe
              src={`https://lvpr.tv/?v=${stream.playbackId}&embed=1&lowLatency=force`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
                objectFit: "cover",
              }}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture; camera; microphone"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </main>
  );
}

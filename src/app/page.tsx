"use client";

/* ============================================================
   VPM PRO – Visual Performance Mixer
   Render engine toggle changes PROMPT CONTENT only.
   Stream params are identical for both engines — the working
   values from doc 2 that Daydream actually responds to.
   ============================================================ */

import React, { useMemo, useState, useRef, useEffect } from "react";

/* ============================================================
   CONFIGURATION
   ============================================================ */
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;
const DEFAULT_PIPELINE = "streamdiffusion";
// Add this state

const modes = ["dj", "performance", "live"] as const;
type Mode = (typeof modes)[number];
type RenderEngine = "LIVE" | "ABSTRACT";
type StreamData = {
  id: string;
  playbackId: string;
  whipUrl: string;
  gatewayHost: string;
};
/* ============================================================
   TAG BANKS
   ============================================================ */
const djMoods = [
  "fire","ocean","neon","forest","sunset","storm","ice","midnight","chrome",
  "desert","crystal","lava","vaporwave","rainforest","mirage","pulse","mirror",
  "dust","laser","fog","horizon","electric blue","gold rush","liquid motion",
  "violet haze","ultra glow","neon tides","deep space","rose glass","afterglow",
  "infrared","aqua prism",
];

const karaokeGenres = [
  "90s brit pop","neon skater","hip hop futuristic","classic rock","bubblegum pop",
  "disco fever","grunge basement","synthwave nostalgia","afrofuturist vibes",
  "punk rebellion","dream pop haze","latin groove night","jazz noir lounge",
  "country sunset drive","electronic trance bloom",
];

const liveTags = [
  "epic","intimate","city vibes","lofi party","surreal crowd","dreamy concert",
];

/* ============================================================
   ARTIST PRESETS
   ============================================================ */
const artistPresets: Record<string, { live: string[]; abstract: string[] }> = {
  fletch: {
    live: [
      "🌆 Euphoric midsummer concert in hazy magenta and cyan light, 90s VHS texture, nostalgic dream pop glow",
      "🌃 Emotional neon rooftop performance, pink-blue reflections on wet pavement, handheld film grain aesthetic",
      "🌅 Sunset drive performance in cyan haze and pink neon horizon, nostalgic coming-of-age tones",
    ],
    abstract: [
      "💫 Floating glass prisms reflecting neon magenta, motion blur, dreamlike diffusion",
      "🌈 Liquid chroma textures morphing into sound waves, soft lighting, kinetic sculpture vibe",
      "🔥 Crystallized light beams pulsing to rhythm, holographic fluid motion",
    ],
  },
  bradford: {
    live: [
      "🎸 Basement stage with amber lights and smoke, handheld cam energy, warm orange tone",
      "💡 Spotlight solo with minimal backdrop, cinematic shadows, high emotional tension",
      "🏙️ Rooftop night performance, fast pans, red-orange glow reflecting wet streets",
    ],
    abstract: [
      "🌀 Fragmented guitar silhouette dissolving into amber glass shards, dynamic motion blur",
      "⚡ Soundwave ribbons twisting through fog, reactive neon pulse, analog energy",
      "🔥 Abstract texture of distortion waves and flickering light streaks, grunge chaos aesthetic",
    ],
  },
  cherry: {
    live: [
      "🌸 Soft pink beachside concert, pastel cyan reflections, emotional ambient haze",
      "🌙 Moonlit seashore performance, magenta shimmer, soft VHS bloom, gentle drift",
      "🌊 Ocean horizon performance with neon tides and glowing mist, ethereal glow",
    ],
    abstract: [
      "🌺 Blooming glass coral structures under cyan light, cinematic oceanic abstraction",
      "💎 Iridescent water droplets forming surreal geometry, smooth floating camera motion",
      "🌫️ Soft gradient field with organic pulse and vapor shimmer, dreamy audio-reactive feel",
    ],
  },
};

/* ============================================================
   PROMPT GENERATORS
   Abstract vs Live = prompt content only. Params never change.
   ============================================================ */
function generateLivePrompt(base: string, mode: Mode): string {
  const styles = [
    "award-winning cinematic lighting, 3D depth, volumetric fog, vivid atmosphere, 4k",
    "analog VHS grain, glowing neon gradients, 80s color palette, surreal motion blur",
    "hyperrealistic digital art, saturated tones, slow shutter motion trails",
    "holographic dreamscape, iridescent reflections, prismatic flares, surreal composition",
    "retro anime composition, cel-shading with dramatic light falloff, nostalgic mood",
    "dreamlike impressionist palette, soft lens diffusion, filmic texture",
  ];
  const environments = [
    "neon-drenched stage", "fog-filled concert hall", "open-air festival under lasers",
    "intimate club with glowing haze", "futuristic arena with holograms",
    "surreal digital landscape pulsing to the beat", "underwater stage of drifting light beams",
    "forest rave glowing in bioluminescent mist",
  ];
  const actions = [
    "crowd moving in slow waves", "lights pulsing like breathing",
    "camera drifting through smoke", "spotlights crossing in sync",
    "energy radiating from center stage", "fog swirling around silhouettes",
  ];
  const moods = [
    "euphoric and dreamlike", "introspective and moody", "chaotic but beautiful",
    "melancholic glow of nostalgia", "surreal yet intimate", "high-energy, cinematic intensity",
  ];
  const performerFocus = [
    "close-up on performer's face, expressive lighting",
    "medium shot waist-up with dramatic shadow",
    "side profile under colored lights",
    "backlit silhouette through smoke",
    "low-angle hero shot with spotlight overhead",
  ];

  const style = styles[Math.floor(Math.random() * styles.length)];
  const environment = environments[Math.floor(Math.random() * environments.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const mood = moods[Math.floor(Math.random() * moods.length)];

  let focus = "";
  if (mode === "performance") {
    focus = performerFocus[Math.floor(Math.random() * performerFocus.length)];
  } else if (mode === "live" && Math.random() < 0.4) {
    focus = performerFocus[Math.floor(Math.random() * performerFocus.length)];
  }

  let enriched = base.trim();
  if (base.trim().split(" ").length <= 2) {
    if (mode === "dj") enriched = `${base.trim()} lightscape`;
    else if (mode === "performance") enriched = `performer in ${base.trim()}`;
    else enriched = Math.random() < 0.5 ? `${base.trim()} stage scene` : `performer in ${base.trim()}`;
  }

  return `${enriched}, ${environment}, ${mood}${focus ? `, ${focus}` : ""}, ${action}, ${style}`;
}

function generateAbstractPrompt(base: string, _mode: Mode): string {
  const styles = [
    "award-winning cinematic lighting, 3D depth, volumetric fog, vivid atmosphere, 4k",
    "analog VHS grain, glowing neon gradients, 80s color palette, surreal motion blur",
    "holographic dreamscape, iridescent reflections, prismatic flares, surreal composition",
    "dreamlike impressionist palette, soft lens diffusion, filmic texture",
    "generative digital art, deep contrast, luminous saturation, infinite depth",
  ];
  const colorFields = [
    "shifting fields of liquid magenta and deep cyan",
    "molten amber bleeding into violet black",
    "prismatic light fractures across a dark void",
    "electric indigo waves dissolving into gold dust",
    "cascading emerald and rose gradients in slow flux",
    "mercury silver rippling through neon coral",
    "deep cobalt ocean of light splitting into aurora ribbons",
    "crimson haze collapsing into geometric white sparks",
  ];
  const motionTextures = [
    "fluid simulation, slow morphing geometry",
    "particle trails dissolving into noise",
    "recursive fractal bloom, infinite zoom",
    "organic cell division, glowing membrane",
    "kinetic paint pour, non-Newtonian flow",
    "crystalline lattice shattering in slow motion",
    "soundwave interference patterns warping space",
    "bioluminescent tendrils drifting in zero gravity",
  ];
  const moods = [
    "euphoric and dreamlike", "introspective and moody", "chaotic but beautiful",
    "melancholic glow of nostalgia", "surreal yet intimate", "high-energy, cinematic intensity",
  ];

  const style = styles[Math.floor(Math.random() * styles.length)];
  const colorField = colorFields[Math.floor(Math.random() * colorFields.length)];
  const motionTexture = motionTextures[Math.floor(Math.random() * motionTextures.length)];
  const mood = moods[Math.floor(Math.random() * moods.length)];

  return `${base.trim()} — ${colorField}, ${motionTexture}, ${mood}, ${style}, no humans, no text, pure abstraction`;
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function Home() {
  const [mode, setMode] = useState<Mode>("dj");
  const [renderEngine, setRenderEngine] = useState<RenderEngine>("ABSTRACT");
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
  const [shuffledTags, setShuffledTags] = useState<string[]>([]);
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [stream, setStream] = useState<StreamData | null>(null);
  const [obsConfirmed, setObsConfirmed] = useState(false);
  const [obsStreaming, setObsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === "dj") {
      setShuffledTags([...djMoods].sort(() => Math.random() - 0.5).slice(0, 8));
    } else {
      setShuffledTags([]);
    }
  }, [mode]);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const requestFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  /* ============================================================
     STREAM CREATION
     ============================================================ */
const createStream = async (): Promise<StreamData | null> => {
  try {
    const res = await fetch("https://api.daydream.live/v1/streams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        pipeline: "streamdiffusion",
        params: {
          model_id: "stabilityai/sd-turbo",
          prompt: "live performance",

          width: 896,
          height: 512,

          num_inference_steps: 50,
          guidance_scale: 1,
          delta: 0.4,
          t_index_list: [0, 10, 20],
        },
      }),
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();

    const streamData: StreamData = {
      id: data.id,
      playbackId: data.output_playback_id,
      whipUrl: data.whip_url,
      gatewayHost: data.gateway_host, // keep but don’t use
    };

    setStream(streamData);

    console.log("✅ Stream ready");
    console.log("WHIP:", streamData.whipUrl);

    return streamData;

  } catch (err) {
    console.error(err);
    return null;
  }
};

/* ── On mount: always create a fresh stream ── */
useEffect(() => {
  void createStream();
}, []);


  /* ============================================================
     STREAM UPDATER
     ============================================================ */
  const updateStream = async (params: any) => {
    if (!stream) return;
    try {
      const res = await fetch(`https://api.daydream.live/v1/streams/${stream.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ params }),
      });
      if (!res.ok) throw new Error(await res.text());
      console.log("✅ Stream updated successfully");
    } catch { setError("Failed to update stream"); }
  };

  /* ============================================================
     STYLE IMAGE UPLOAD
     ============================================================ */
  const handleStyleImageUpload = (file: File | null) => {
    if (!file) { setStyleImageBase64(null); return; }
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setStyleImageBase64(result);
          console.log("🎨 Style image loaded:", result.slice(0, 80) + "...");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("❌ Failed to process style image:", err);
    }
  };

  /* ============================================================
     CORE PROMPT SENDER
     Uses the exact same working params for BOTH engines.
     Abstract vs Live difference = prompt text only.
     ============================================================ */
  const sendPromptToDaydream = async (finalPrompt: string) => {
    if (!finalPrompt?.trim()) return setError("Prompt is empty.");
    if (!API_KEY) return setError("Missing Daydream API key.");

    setIsLiveMode(false);
    setBusy(true);
    setError(null);
    setLastPrompt(finalPrompt);

    // Motion speed — same working values from doc 2 for both engines
    let speedSettings: {
      delta: number;
      num_inference_steps: number;
      t_index_list: number[];
      guidance_scale: number;
    };
    if (motionSpeed === "slow") {
      speedSettings = { delta: 0.15, num_inference_steps: 30, t_index_list: [0, 12, 24], guidance_scale: 0.8 };
    } else if (motionSpeed === "medium") {
      speedSettings = { delta: 0.4, num_inference_steps: 40, t_index_list: [0, 10, 20], guidance_scale: 1.0 };
    } else {
      speedSettings = { delta: 0.75, num_inference_steps: 20, t_index_list: [0, 5, 10], guidance_scale: 1.2 };
    }

    const seed = Math.floor(Math.random() * 100000);

    // ABSTRACT mode: stronger delta to loosen camera structure,
    // and face-specific negative prompt tokens to suppress face pickup.
    // t_index_list and num_inference_steps stay the same — those are what break output.
    const isAbstract = renderEngine === "ABSTRACT";

    const abstractDeltaBoost: Record<string, number> = {
      slow: 0.25,    // 0.15 → 0.40
      medium: 0.15,  // 0.40 → 0.55
      fast: 0.05,    // 0.75 → 0.80
    };

    const effectiveDelta = isAbstract
      ? speedSettings.delta + abstractDeltaBoost[motionSpeed]
      : speedSettings.delta;

    const negativePrompt = isAbstract
      ? "face, human face, portrait, person, eyes, nose, mouth, skin, facial features, photorealistic face, human figure, body, blurry, low quality, flat, 2d"
      : "blurry, low quality, flat, 2d";

    // Append anti-face suffix to abstract prompts so positive tokens
    // actively fight the face structure in the frame
    const effectivePrompt = isAbstract
      ? `${finalPrompt.trim()}, no face, crystal geometry filling frame, abstract shapes in foreground, non-representational`
      : finalPrompt.trim();

    const params = {
      model_id: "stabilityai/sd-turbo",
      prompt: effectivePrompt,
      negative_prompt: negativePrompt,
      num_inference_steps: speedSettings.num_inference_steps,
      guidance_scale: speedSettings.guidance_scale,
      delta: effectiveDelta,
      t_index_list: speedSettings.t_index_list,
      seed,
      enable_similar_image_filter: true,
      similar_image_filter_max_skip_frame: motionSpeed === "slow" ? 12 : motionSpeed === "medium" ? 8 : 4,
      similar_image_filter_threshold: 0.98,
    };

    // Inline stream creation — never hard-stops
    let currentStream = stream;
    if (!currentStream) {
      console.warn("⚠️ No active stream — creating inline...");
      const newStream = await createStream();
      if (!newStream) { setBusy(false); return; }
      currentStream = newStream;
    }

    try {
      console.log(`🚀 [${renderEngine}] Sending prompt:`, params);
      const res = await fetch(`https://api.daydream.live/v1/streams/${currentStream.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ params }),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (errText.includes("STREAMS/NOT_FOUND") || errText.includes("Stream not ready")) {
          console.warn("⚠️ Stream not ready — retrying in 5s...");
          await new Promise(r => setTimeout(r, 5000));
          const retry = await fetch(`https://api.daydream.live/v1/streams/${currentStream.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
            body: JSON.stringify({ params }),
          });
          if (!retry.ok) throw new Error(await retry.text());
          console.log("✅ Stream recovered after retry!");
        } else {
          throw new Error(errText);
        }
      } else {
        console.log(`✅ [${renderEngine}] Prompt applied:`, finalPrompt.slice(0, 80));
      }
    } catch (err: any) {
      console.error(`❌ [${renderEngine}] Failed:`, err);
      setError("Failed to update stream — not recreating to protect OBS link.");
    } finally {
      setBusy(false);
    }
  };

  /* ── Tag/button clicks — picks correct prompt generator per engine ── */
  const handlePromptSubmit = async (base: string) => {
    if (!base.trim()) return setError("Enter a prompt first.");

    // If it's a raw artist preset string, send it directly (already fully formed)
    // Otherwise enrich it with the appropriate generator
    const isPreset = Object.values(artistPresets).some(p =>
      [...p.live, ...p.abstract].includes(base)
    ) || (generatedPresets.includes(base));

    const finalPrompt = isPreset
      ? base
      : renderEngine === "LIVE"
        ? generateLivePrompt(base, mode)
        : generateAbstractPrompt(base, mode);

    await sendPromptToDaydream(finalPrompt);
  };

  /* ============================================================
     RETURN TO LIVE
     ============================================================ */
  const returnToLiveMode = async () => {
    if (!stream) return;
    setBusy(true);
    try {
      const res = await fetch(`https://api.daydream.live/v1/streams/${stream.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ params: null }),
      });
      if (!res.ok) throw new Error(await res.text());
      setIsLiveMode(true);
      setLastPrompt("");
    } catch { setError("Failed to return to live mode"); }
    finally { setBusy(false); }
  };

  /* ============================================================
     QUESTIONNAIRE + GEMINI
     ============================================================ */
  const handleInputChange = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleQuestionnaireSubmit = async () => {
    console.log("🎨 Artist Questionnaire Answers:", answers);
    setBusy(true);
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Generate 5 intricate, cinematic scene prompts for a visual performance.
Each prompt must include the artist's visual identity based on these answers:

${JSON.stringify(answers, null, 2)}

🧩 Requirements:
- Always include the specified color palette in a vivid or poetic way.
- Include the emotion, texture/finish, and season influence.
- Mention lighting or movement style (cinematic, underwater, dreamlike, etc.).
- Each line should be visually detailed and ready for image generation.
- Keep outputs as single descriptive sentences, not lists or explanations.

✨ Example output style:
"avant-garde winter styling (padded textures, layered textiles), slow drifting ice shards reflecting magenta lighting, cinematic depth of field, movement like underwater but on land, minimal but glamorous, energy against green/black venue lighting"

Return 5 lines, each formatted like that.`,
              }],
            }],
          }),
        }
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "dreamy concert in neon blue and amber, cinematic haze, reflective stage lighting";
      const presets = text.split("\n").map((t: string) => t.replace(/^[-•\d.]+\s*/, "").trim()).filter(Boolean);
      setGeneratedPresets(presets);
      setArtist("generated");
    } catch (err) {
      console.error("❌ Gemini preset generation failed:", err);
      setGeneratedPresets([
        "Dreamy concert in soft hues, cinematic 4k, glowing ambient light, nostalgic texture, emotional tone",
        "Golden haze live performance, surreal lighting, pastel diffusion, poetic warmth, reflective fog",
      ]);
      setArtist("generated");
    } finally { setBusy(false); }
  };

  /* ============================================================
     SONG → VISUAL AI
     ============================================================ */
  const handleKaraokeVisual = async () => {
    if (!songPrompt.trim()) return setError("Enter a song name first.");
    setBusy(true);
    try {
      const prompt = `Create one short visual scene prompt for a Stable Diffusion video performance based on the song or artist name below. It should feel cinematic and match the mood of the music.

Song or artist: "${songPrompt}"

Format the response as one descriptive line, e.g.:
"Dynamic concert scene with neon lights and smoke, cinematic, 4k"`;
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Energetic live performance, cinematic, 4k";
      await handlePromptSubmit(text);
    } catch (err) {
      console.error("❌ Gemini song-to-visual failed:", err);
      setError("Failed to generate visuals from song.");
    } finally { setBusy(false); }
  };

  /* ============================================================
     AUTO-CYCLE ARTIST PRESETS
     ============================================================ */
  useEffect(() => {
    if (!artist || !artistPresets[artist]) return;

    const artistDurations: Record<string, number> = {
      fletch: 4 * 60 * 1000,
      bradford: 3.5 * 60 * 1000,
      cherry: 3 * 60 * 1000,
    };
    const intervalMs = artistDurations[artist];
    if (!intervalMs) return;

    let currentModeType: "live" | "abstract" = "live";
    let index = 0;
    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;

    const cycle = async () => {
      const modePresets = artistPresets[artist]?.[currentModeType];
      if (!modePresets || modePresets.length === 0) return;
      const preset = modePresets[index];
      console.log(`🎨 ${artist} — ${currentModeType} preset #${index + 1}:`, preset);

      const fadePrompt = `${preset}, soft cinematic transition, glowing motion blend, dreamlike fade`;
      await handlePromptSubmit(fadePrompt);

      fadeTimeout = setTimeout(() => {
        handlePromptSubmit(preset);
      }, 15000);

      index = (index + 1) % modePresets.length;
      if (index === 0) {
        currentModeType = currentModeType === "live" ? "abstract" : "live";
        console.log(`🔁 Switching to ${currentModeType.toUpperCase()} mode next`);
      }
    };

    cycle();
    const timer = setInterval(cycle, intervalMs);
    return () => {
      clearInterval(timer);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [artist]);

  const tags = useMemo(() => {
    if (mode === "dj") return djMoods;
    if (mode === "performance") return karaokeGenres;
    return liveTags;
  }, [mode]);

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <main style={{
      height: "100vh", width: "100vw",
      background: "#000", color: "#fff",
      overflow: "hidden", position: "relative",
      fontFamily: "'DM Mono', 'Courier New', monospace",
    }}>

      {/* ── STREAM BACKGROUND ── */}
      <div ref={containerRef} style={{
        position: "absolute", top: 0, left: 0,
        width: "100vw", height: "100vh",
        backgroundColor: "#000", zIndex: 1,
      }}>
        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", overflow: "hidden" }}>
        {stream?.playbackId && obsStreaming && (
  <iframe
    src={`https://lvpr.tv/?v=${stream.playbackId}&embed=1&lowLatency=force`}
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
    allow="autoplay; encrypted-media; fullscreen; picture-in-picture; camera; microphone"
    allowFullScreen
            />
          )}
        </div>
      </div>

      {/* ── OBS SETUP SCREEN ── */}
      {!obsConfirmed && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.96)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'DM Mono', 'Courier New', monospace",
        }}>
          <div style={{
            width: "100%", maxWidth: 560,
            padding: "40px 36px",
            background: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            boxShadow: "0 0 60px rgba(0,204,102,0.08)",
          }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", opacity: 0.4, marginBottom: 8 }}>VPM PRO</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "0.05em" }}>
                Connect your camera
              </h2>
              <p style={{ margin: "10px 0 0", fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>
                Paste this URL into OBS to send your camera feed into the AI stream.
                You only need to do this once.
              </p>
            </div>

            {/* STEP 1 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, opacity: 0.4, letterSpacing: "0.15em", marginBottom: 10 }}>
                STEP 1 — COPY YOUR WHIP URL
              </div>
              {!stream ? (
                <div style={{
                  padding: "14px 16px", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 12, opacity: 0.4,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                  Creating your stream…
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{
                    flex: 1, padding: "12px 14px", borderRadius: 8,
                    background: "rgba(0,204,102,0.06)",
                    border: "1px solid rgba(0,204,102,0.25)",
                    fontSize: 11, color: "#00cc66",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    letterSpacing: "0.02em",
                  }}>
                    {stream.whipUrl}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(stream.whipUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    style={{
                      padding: "12px 18px", borderRadius: 8, border: "none",
                      background: copied ? "#00cc66" : "rgba(0,204,102,0.2)",
                      color: copied ? "#000" : "#00cc66",
                      fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "all 0.2s",
                    }}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            {/* STEP 2 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, opacity: 0.4, letterSpacing: "0.15em", marginBottom: 10 }}>
                STEP 2 — ADD TO OBS
              </div>
              <div style={{
                padding: "14px 16px", borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontSize: 12, lineHeight: 1.9, opacity: 0.6,
              }}>
                <div>1. Open OBS → <strong style={{ color: "#fff", opacity: 1 }}>Settings → Stream</strong></div>
                <div>2. Set Service to <strong style={{ color: "#fff", opacity: 1 }}>WHIP</strong></div>
                <div>3. Paste your URL into <strong style={{ color: "#fff", opacity: 1 }}>Server</strong></div>
                <div>4. Click <strong style={{ color: "#fff", opacity: 1 }}>Start Streaming</strong> in OBS</div>
              </div>
            </div>

            {/* CONFIRM BUTTON */}
           <button
  onClick={() => {
    setObsConfirmed(true);
    setObsStreaming(true);  // user confirms OBS is actively streaming
  }} // user confirms OBS is actively streaming

              disabled={!stream}
              style={{
                width: "100%", padding: "14px",
                background: stream ? "#00cc66" : "rgba(255,255,255,0.05)",
                color: stream ? "#000" : "rgba(255,255,255,0.2)",
                border: "none", borderRadius: 10,
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.1em", cursor: stream ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              {!stream ? "Waiting for stream…" : "✓  OBS is connected — open VPM PRO"}
            </button>

            <p style={{ margin: "14px 0 0", fontSize: 11, opacity: 0.3, textAlign: "center" }}>
              Not connected yet? Paste the URL into OBS first, then click above.
            </p>
          </div>
        </div>
      )}

      {/* ── CONTROL PANEL ── */}
      {!isFullscreen && (
        <div style={{
          position: "relative", zIndex: 10,
          padding: "16px 20px",
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          maxHeight: "100vh",
          overflowY: "auto",
        }}>

          {/* ── HEADER ROW ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 18, letterSpacing: "0.15em", fontWeight: 700 }}>
              🎛 VPM PRO
            </h1>

            {/* RENDER ENGINE TOGGLE */}
            <div style={{
              display: "flex",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10, padding: 3, gap: 3,
            }}>
              {(["LIVE", "ABSTRACT"] as RenderEngine[]).map(engine => {
                const isActive = renderEngine === engine;
                const colors: Record<RenderEngine, string> = { LIVE: "#00cc66", ABSTRACT: "#aa44ff" };
                const icons: Record<RenderEngine, string> = { LIVE: "📷", ABSTRACT: "🌀" };
                const labels: Record<RenderEngine, string> = { LIVE: "LIVE CAPTURE", ABSTRACT: "ABSTRACT" };
                return (
                  <button key={engine} onClick={() => setRenderEngine(engine)} disabled={busy} style={{
                    padding: "8px 18px", borderRadius: 7, border: "none",
                    cursor: busy ? "not-allowed" : "pointer",
                    fontFamily: "inherit", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
                    transition: "all 0.2s ease",
                    background: isActive ? colors[engine] : "transparent",
                    color: isActive ? "#000" : "rgba(255,255,255,0.5)",
                    boxShadow: isActive ? `0 0 16px ${colors[engine]}66` : "none",
                  }}>
                    {icons[engine]} {labels[engine]}
                  </button>
                );
              })}
            </div>

            <span style={{
              fontSize: 11, fontStyle: "italic",
              color: renderEngine === "LIVE" ? "#00cc6688" : "#aa44ff88",
            }}>
              {renderEngine === "LIVE"
                ? "stage environments · cinematic · performer focus"
                : "colour fields · motion textures · pure abstraction"}
            </span>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={returnToLiveMode} disabled={busy || isLiveMode} style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: isLiveMode ? "#1a3a1a" : "#0a7a0a",
                color: isLiveMode ? "#4a8a4a" : "#fff",
                fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                cursor: isLiveMode ? "default" : "pointer", letterSpacing: "0.1em",
              }}>
                {isLiveMode ? "● LIVE" : "↩ BACK TO LIVE"}
              </button>
              <button onClick={requestFullscreen} style={{
                padding: "8px 16px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent", color: "#fff",
                fontFamily: "inherit", fontSize: 11, cursor: "pointer",
              }}>
                ⛶ FULLSCREEN
              </button>
            </div>
          </div>

          {/* ── LAST PROMPT ── */}
          {lastPrompt && (
            <div style={{
              marginBottom: 12, padding: "8px 12px", borderRadius: 6, fontSize: 11,
              background: renderEngine === "LIVE" ? "rgba(0,204,102,0.08)" : "rgba(170,68,255,0.08)",
              border: `1px solid ${renderEngine === "LIVE" ? "rgba(0,204,102,0.2)" : "rgba(170,68,255,0.2)"}`,
              color: renderEngine === "LIVE" ? "#00cc66aa" : "#aa44ffaa",
            }}>
              <span style={{ opacity: 0.6 }}>LAST: </span>
              {lastPrompt.slice(0, 120)}{lastPrompt.length > 120 ? "…" : ""}
            </div>
          )}

          {/* ── MODE + MOTION ROW ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {modes.map(m => (
                <button key={m} onClick={() => setMode(m)} disabled={busy} style={{
                  padding: "7px 16px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
                  background: mode === m ? "rgba(255,255,255,0.15)" : "transparent",
                  color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
                  fontFamily: "inherit", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer",
                }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, opacity: 0.5, marginRight: 4 }}>MOTION</span>
              {(["slow", "medium", "fast"] as const).map(speed => (
                <button key={speed} onClick={() => setMotionSpeed(speed)} disabled={busy} style={{
                  padding: "7px 14px", borderRadius: 6,
                  border: `1px solid ${motionSpeed === speed ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                  background: motionSpeed === speed ? "rgba(255,255,255,0.12)" : "transparent",
                  color: motionSpeed === speed ? "#fff" : "rgba(255,255,255,0.4)",
                  fontFamily: "inherit", fontSize: 11, cursor: "pointer",
                }}>
                  {speed === "slow" ? "🐢" : speed === "medium" ? "⚖️" : "⚡"} {speed}
                </button>
              ))}
            </div>
          </div>

          {/* ── LIVE MODE: ARTIST PRESETS ── */}
          {mode === "live" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{ fontSize: 11, opacity: 0.5, alignSelf: "center", marginRight: 4 }}>ARTIST</span>
                {["new", "fletch", "bradford", "cherry"].map(a => (
                  <button key={a} onClick={() => setArtist(a)} style={{
                    padding: "7px 14px", borderRadius: 6,
                    border: `1px solid ${artist === a ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                    background: artist === a ? "rgba(255,255,255,0.12)" : "transparent",
                    color: "#fff", fontFamily: "inherit", fontSize: 11, cursor: "pointer",
                  }}>
                    {a === "new" ? "➕ New" : a === "fletch" ? "🎧 Fletch" : a === "bradford" ? "🎸 Bradford" : "🌊 Cherry"}
                  </button>
                ))}
              </div>

              {/* NEW ARTIST QUESTIONNAIRE */}
              {artist === "new" && (
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 13, letterSpacing: "0.1em" }}>🧠 VISUAL INTAKE</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      ["Color Palette", "colorPalette", "blue/pink"],
                      ["Cultural References", "culturalRefs", "coming-of-age films"],
                      ["Emotional Atmosphere", "emotion", "euphoric, youthful"],
                      ["Texture / Finish", "texture", "grainy, VHS"],
                      ["Season", "season", "summer nostalgia"],
                      ["Abstract / Object-Based", "visualType", "mix of surreal and organic"],
                      ["References", "references", "Kilu, Bleech93, Catfish"],
                    ].map(([label, key, ph]) => (
                      <div key={key}>
                        <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>{label}</div>
                        <input type="text" placeholder={ph}
                          onChange={e => handleInputChange(key, e.target.value)}
                          style={{
                            width: "100%", padding: "8px 10px", boxSizing: "border-box",
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleQuestionnaireSubmit} disabled={busy} style={{
                    marginTop: 12, padding: "10px 20px",
                    background: "#00aa00", border: "none", borderRadius: 8,
                    color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>
                    ✅ Submit Visual Questionnaire
                  </button>
                </div>
              )}

              {/* STATIC ARTIST PRESETS */}
              {artist && artistPresets[artist] && (
                <div style={{ marginTop: 12 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 13, letterSpacing: "0.1em" }}>
                    🎬 {artist.toUpperCase()} VISUAL PRESETS
                  </h3>
                  <p style={{ margin: "0 0 12px", fontSize: 11, opacity: 0.5 }}>
                    Click a preset to send it live.
                  </p>
                  {(["live", "abstract"] as const).map(modeType => (
                    <div key={modeType} style={{ marginBottom: 16 }}>
                      <h4 style={{ margin: "0 0 8px", fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {modeType === "live" ? "🎤 Live Capture" : "🌀 Abstract Visuals"}
                      </h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {artistPresets[artist][modeType].map((preset: string) => {
                          const words = preset.replace(/[^a-zA-Z\s]/g, "").trim().split(/\s+/).slice(0, 2);
                          const label = words.length > 0
                            ? words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
                            : "Visual";
                          return (
                            <button key={preset} title={preset} onClick={() => handlePromptSubmit(preset)} style={{
                              padding: "12px 24px",
                              background: modeType === "abstract" ? "rgba(170,68,255,0.15)" : "#1a1a1a",
                              color: "#fff",
                              border: modeType === "abstract" ? "1px solid rgba(170,68,255,0.3)" : "1px solid #555",
                              borderRadius: 8, cursor: "pointer",
                              boxShadow: modeType === "abstract" ? "0 0 10px rgba(170,68,255,0.2)" : "0 0 10px rgba(255,255,255,0.15)",
                              maxWidth: 200, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden",
                              fontFamily: "inherit", fontSize: 11,
                            }}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* GENERATED PRESETS */}
              {artist === "generated" && generatedPresets.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 13, letterSpacing: "0.1em" }}>🎬 Your Presets</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {generatedPresets.map((preset: string) => {
                      const words = preset.replace(/[^a-zA-Z\s]/g, "").trim().split(/\s+/).slice(0, 2);
                      const label = words.length > 0
                        ? words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
                        : "Visual";
                      return (
                        <button key={preset} onClick={() => handlePromptSubmit(preset)} title={preset} style={{
                          padding: "12px 24px",
                          background: "#1a1a1a", color: "#fff",
                          border: "1px solid #555", borderRadius: 8, cursor: "pointer",
                          boxShadow: "0 0 10px rgba(200,87,200,0.5)",
                          maxWidth: 200, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden",
                          fontFamily: "inherit", fontSize: 11,
                        }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MANUAL PROMPT ── */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13, letterSpacing: "0.1em" }}>🎨 Manual Visual Prompt</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" placeholder="Describe a scene"
                value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handlePromptSubmit(customPrompt)}
                style={{
                  flex: 1, padding: "10px 12px",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12,
                }}
              />
              <button onClick={() => handlePromptSubmit(customPrompt)} disabled={busy} style={{
                padding: "10px 20px",
                background: renderEngine === "LIVE" ? "rgba(0,204,102,0.3)" : "rgba(170,68,255,0.3)",
                border: `1px solid ${renderEngine === "LIVE" ? "rgba(0,204,102,0.4)" : "rgba(170,68,255,0.4)"}`,
                borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 11, cursor: "pointer",
              }}>
                {busy ? "..." : "Send Visual Prompt"}
              </button>
            </div>
          </div>

          {/* ── SONG TO VISUAL (performance mode only) ── */}
          {mode === "performance" && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, letterSpacing: "0.1em" }}>🎵 Song to Visual AI</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" placeholder="Enter song or artist"
                  value={songPrompt} onChange={e => setSongPrompt(e.target.value)}
                  style={{
                    flex: 1, padding: "10px 12px",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12,
                  }}
                />
                <button onClick={handleKaraokeVisual} disabled={busy} style={{
                  padding: "10px 20px", background: "#444", border: "none",
                  borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 11, cursor: "pointer",
                }}>
                  {busy ? "..." : "Generate from Song"}
                </button>
              </div>
            </div>
          )}

          {/* ── TAG BANK ── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {(mode === "dj" ? shuffledTags : tags).map(tag => (
              <button key={tag} onClick={() => handlePromptSubmit(tag)} disabled={busy} style={{
                margin: 2, padding: "10px 20px", borderRadius: 10,
                background: "#333", color: "#fff", border: "1px solid #444",
                fontFamily: "inherit", fontSize: 11, cursor: "pointer",
              }}>
                {tag}
              </button>
            ))}
            {mode === "dj" && (
              <button
                onClick={() => setShuffledTags([...djMoods].sort(() => Math.random() - 0.5).slice(0, 8))}
                disabled={busy}
                style={{
                  margin: 2, padding: "10px 20px", borderRadius: 10,
                  background: "transparent", color: "rgba(255,255,255,0.5)",
                  border: "1px dashed rgba(255,255,255,0.2)",
                  fontFamily: "inherit", fontSize: 11, cursor: "pointer",
                }}
              >
                🔀 Shuffle Bank
              </button>
            )}
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div style={{
              padding: "8px 12px", borderRadius: 6, fontSize: 11,
              background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)", color: "#ff8888",
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

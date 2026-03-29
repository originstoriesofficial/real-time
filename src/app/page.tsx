"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createBroadcast, createPlayer } from "@daydreamlive/browser";

/* ============================================================
   VPM PRO – Visual Performance Mixer
   Browser SDK: camera → WHIP → Daydream AI → WHEP → display
   Model: stabilityai/sd-turbo
   ============================================================ */

/* ============================================================
   CONFIG
   ============================================================ */
const API_KEY = process.env.DAYDREAM_API_KEY ?? "";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
const MODEL_ID = "stabilityai/sd-turbo";

const MODES = ["dj", "performance", "live"] as const;
type Mode = (typeof MODES)[number];

const RENDER_ENGINES = ["LIVE", "ABSTRACT"] as const;
type RenderEngine = (typeof RENDER_ENGINES)[number];

const MOTION_SPEEDS = ["slow", "medium", "fast"] as const;
type MotionSpeed = (typeof MOTION_SPEEDS)[number];

const ENGINE_COLORS: Record<RenderEngine, string> = {
  LIVE: "#00cc66",
  ABSTRACT: "#aa44ff",
};

type StreamData = {
  id: string;
  playbackId: string;
  whipUrl: string;
};

type BroadcastState =
  | "idle" | "connecting" | "live" | "reconnecting" | "ended" | "error";

type PlayerState =
  | "idle" | "connecting" | "playing" | "buffering" | "ended" | "error";

type SpeedSettings = {
  delta: number;
  num_inference_steps: number;
  t_index_list: number[];
  guidance_scale: number;
};

async function getPlaybackUrl(playbackId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://livepeer.studio/api/playback/${playbackId}`
    );

    if (!res.ok) throw new Error("Failed to fetch playback");

    const data = await res.json();

    // ✅ prefer WebRTC (low latency)
    const webrtc = data.meta?.source?.find(
      (s: any) => s.type === "html5/video/h264"
    );

    if (webrtc?.url) return webrtc.url;

    // ✅ fallback to HLS (more stable)
    const hls = data.meta?.source?.find(
      (s: any) => s.type === "html5/application/vnd.apple.mpegurl"
    );

    if (hls?.url) return hls.url;

    return null;
  } catch (err) {
    console.error("Playback fetch error:", err);
    return null;
  }
}
/* ============================================================
   UTILS
   ============================================================ */
function forceHttps(url?: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return url.replace(/^http:\/\//i, "https://");
  }
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/* ============================================================
   TAG BANKS
   ============================================================ */
const DJ_MOODS = [
  "fire", "ocean", "neon", "forest", "sunset", "storm", "ice", "midnight",
  "chrome", "desert", "crystal", "lava", "vaporwave", "rainforest", "mirage",
  "pulse", "mirror", "dust", "laser", "fog", "horizon", "electric blue",
  "gold rush", "liquid motion", "violet haze", "ultra glow", "neon tides",
  "deep space", "rose glass", "afterglow", "infrared", "aqua prism",
] as const;

const KARAOKE_GENRES = [
  "90s brit pop", "neon skater", "hip hop futuristic", "classic rock",
  "bubblegum pop", "disco fever", "grunge basement", "synthwave nostalgia",
  "afrofuturist vibes", "punk rebellion", "dream pop haze", "latin groove night",
  "jazz noir lounge", "country sunset drive", "electronic trance bloom",
] as const;

const LIVE_TAGS = [
  "epic", "intimate", "city vibes", "lofi party", "surreal crowd", "dreamy concert",
] as const;

/* ============================================================
   ARTIST PRESETS
   ============================================================ */
const artistPresets: Record<string, { live: string[]; abstract: string[] }> = {
  fletch: {
    live: [
      "Euphoric midsummer concert in hazy magenta and cyan light, 90s VHS texture, nostalgic dream pop glow",
      "Emotional neon rooftop performance, pink-blue reflections on wet pavement, handheld film grain aesthetic",
      "Sunset drive performance in cyan haze and pink neon horizon, nostalgic coming-of-age tones",
    ],
    abstract: [
      "Floating glass prisms reflecting neon magenta, motion blur, dreamlike diffusion",
      "Liquid chroma textures morphing into sound waves, soft lighting, kinetic sculpture vibe",
      "Crystallized light beams pulsing to rhythm, holographic fluid motion",
    ],
  },
  bradford: {
    live: [
      "Basement stage with amber lights and smoke, handheld cam energy, warm orange tone",
      "Spotlight solo with minimal backdrop, cinematic shadows, high emotional tension",
      "Rooftop night performance, fast pans, red-orange glow reflecting wet streets",
    ],
    abstract: [
      "Fragmented guitar silhouette dissolving into amber glass shards, dynamic motion blur",
      "Soundwave ribbons twisting through fog, reactive neon pulse, analog energy",
      "Abstract texture of distortion waves and flickering light streaks, grunge chaos aesthetic",
    ],
  },
  cherry: {
    live: [
      "Soft pink beachside concert, pastel cyan reflections, emotional ambient haze",
      "Moonlit seashore performance, magenta shimmer, soft VHS bloom, gentle drift",
      "Ocean horizon performance with neon tides and glowing mist, ethereal glow",
    ],
    abstract: [
      "Blooming glass coral structures under cyan light, cinematic oceanic abstraction",
      "Iridescent water droplets forming surreal geometry, smooth floating camera motion",
      "Soft gradient field with organic pulse and vapor shimmer, dreamy audio-reactive feel",
    ],
  },
};

/* ============================================================
   PROMPT GENERATORS — tuned for sd-turbo (short, visual-forward)
   ============================================================ */
function generateLivePrompt(base: string, mode: Mode): string {
  const styles = [
    "cinematic lighting, volumetric fog, vivid atmosphere",
    "analog VHS grain, glowing neon gradients, 80s color palette",
    "hyperrealistic, saturated tones, slow shutter motion trails",
    "holographic dreamscape, iridescent reflections, prismatic flares",
    "retro anime, cel-shading, dramatic light falloff",
    "impressionist palette, soft lens diffusion, filmic texture",
  ] as const;
  const environments = [
    "neon-drenched stage", "fog-filled concert hall", "open-air festival under lasers",
    "intimate club with glowing haze", "futuristic arena with holograms",
    "forest rave in bioluminescent mist",
  ] as const;
  const moods = [
    "euphoric dreamlike", "introspective moody", "chaotic beautiful",
    "melancholic nostalgic glow", "surreal intimate", "high-energy cinematic",
  ] as const;
  const performerFocus = [
    "close-up expressive lighting", "dramatic shadow medium shot",
    "side profile colored lights", "backlit silhouette smoke",
    "low-angle spotlight hero shot",
  ] as const;

  let focus = "";
  if (mode === "performance") focus = pickRandom(performerFocus);
  else if (mode === "live" && Math.random() < 0.4) focus = pickRandom(performerFocus);

  let enriched = base.trim();
  if (enriched.split(/\s+/).length <= 2) {
    if (mode === "dj") enriched = `${enriched} lightscape`;
    else if (mode === "performance") enriched = `performer in ${enriched}`;
    else enriched = Math.random() < 0.5 ? `${enriched} stage` : `performer in ${enriched}`;
  }

  return [enriched, pickRandom(environments), pickRandom(moods), focus, pickRandom(styles)]
    .filter(Boolean).join(", ");
}

function generateAbstractPrompt(base: string): string {
  const colorFields = [
    "liquid magenta and deep cyan", "molten amber bleeding into violet black",
    "prismatic light fractures dark void", "electric indigo waves dissolving gold dust",
    "cascading emerald rose gradients", "mercury silver rippling neon coral",
    "cobalt ocean of light aurora ribbons", "crimson haze geometric white sparks",
  ] as const;
  const motionTextures = [
    "fluid simulation slow morphing geometry", "particle trails dissolving noise",
    "fractal bloom infinite zoom", "organic cell division glowing membrane",
    "kinetic paint pour non-Newtonian flow", "crystalline lattice shattering slow motion",
    "soundwave interference patterns", "bioluminescent tendrils zero gravity",
  ] as const;
  const styles = [
    "cinematic 4k volumetric", "VHS grain neon gradients 80s palette",
    "holographic iridescent prismatic", "impressionist soft lens filmic",
    "generative digital deep contrast luminous",
  ] as const;

  return [
    base.trim(), pickRandom(colorFields), pickRandom(motionTextures),
    pickRandom(styles), "abstract no humans",
  ].join(", ");
}

/* ============================================================
   SD-TURBO SPEED SETTINGS (official Daydream defaults)
   ============================================================ */
function getSpeedSettings(speed: MotionSpeed, isAbstract: boolean): SpeedSettings {
  const base: Record<MotionSpeed, SpeedSettings> = {
    slow:   { delta: 0.4,  num_inference_steps: 25, t_index_list: [12, 20, 24], guidance_scale: 1.0 },
    medium: { delta: 0.7,  num_inference_steps: 25, t_index_list: [12, 20, 24], guidance_scale: 1.0 },
    fast:   { delta: 0.85, num_inference_steps: 25, t_index_list: [12, 20, 24], guidance_scale: 1.0 },
  };
  const s = { ...base[speed] };
  if (isAbstract) s.delta = Math.min(s.delta + 0.1, 0.99);
  return s;
}

const STATE_COLORS: Record<string, string> = {
  idle: "#555", connecting: "#ffaa00", live: "#00cc66",
  reconnecting: "#ff8800", ended: "#555", error: "#ff4444",
};

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
  const [cameraStarted, setCameraStarted] = useState(false);
  const [motionSpeed, setMotionSpeed] = useState<MotionSpeed>("medium");
  const [shuffledTags, setShuffledTags] = useState<string[]>([]);
  const [lastPrompt, setLastPrompt] = useState("");
  const [stream, setStream] = useState<StreamData | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [broadcastState, setBroadcastState] = useState<BroadcastState>("idle");
  const [playerState, setPlayerState] = useState<PlayerState>("idle");

  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const outputVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const broadcastRef = useRef<ReturnType<typeof createBroadcast> | null>(null);
  const playerRef = useRef<ReturnType<typeof createPlayer> | null>(null);

  /* ── Load cameras ── */
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    navigator.mediaDevices.enumerateDevices().then(all => {
      const cams = all.filter(d => d.kind === "videoinput");
      setDevices(cams);
      setSelectedDeviceId(prev =>
        prev && cams.some(d => d.deviceId === prev) ? prev : (cams[0]?.deviceId ?? "")
      );
    }).catch(err => console.error("Failed to load devices:", err));
  }, []);

  /* ── Fullscreen listener ── */
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Tag shuffler ── */
  useEffect(() => {
    if (mode === "dj") {
      setShuffledTags([...DJ_MOODS].sort(() => Math.random() - 0.5).slice(0, 8));
    } else {
      setShuffledTags([]);
    }
  }, [mode]);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      try { playerRef.current?.stop?.(); } catch {}
      try { broadcastRef.current?.stop?.(); } catch {}
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  const requestFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) { void el.requestFullscreen(); return; }
  interface WebkitFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

(el as WebkitFullscreenElement).webkitRequestFullscreen?.();
  }, []);

  /* ============================================================
     STREAM CREATION — calls Daydream API directly
     ============================================================ */
// ✅ FRONTEND (clean)
const createStream = useCallback(async (): Promise<StreamData | null> => {
  try {
    const res = await fetch("/api/daydream/create-stream", {
      method: "POST",
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();

    // ✅ enforce HTTPS (source of truth)
    const whipUrl = String(data.whipUrl || "").replace(/^http:/, "https:");

    // ✅ LOG HERE (correct)
    console.log("WHIP URL (after fetch):", whipUrl);

    const streamData: StreamData = {
      id: String(data.id),
      playbackId: String(data.playbackId ?? ""),
      whipUrl,
    };

    setStream(streamData);
    return streamData;

  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create stream.";

    setError(message);
    return null;
  }
}, []);
  /* ============================================================
     CAMERA START
     ============================================================ */
  const startCamera = async () => {
    setBusy(true);
    setError(null);

    try {
      const s = await createStream();
      if (!s?.whipUrl) throw new Error("Missing WHIP URL.");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: 512, height: 512, frameRate: 30,
        },
        audio: false,
      });

      localStreamRef.current = mediaStream;
      setCameraStarted(true);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;

const broadcast = createBroadcast({
  whipUrl: forceHttps(s.whipUrl),
  stream: mediaStream,

  reconnect: { enabled: true, maxAttempts: 10, baseDelayMs: 2000 },
});


broadcastRef.current = broadcast;
setBroadcastState("connecting");

// helper
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function waitForWhep(b: ReturnType<typeof createBroadcast>) {
  for (let i = 0; i < 10; i++) {
    if (b.whepUrl) return b.whepUrl;
    await sleep(1000);
  }
  throw new Error("WHEP not ready");
}

broadcast.on("stateChange", async (state: BroadcastState) => {
  console.log("Broadcast:", state);
  setBroadcastState(state);

  // ✅ only init once + only when live
  if (state !== "live" || playerRef.current || !stream?.playbackId) return;

  try {
    // ✅ small delay → playback becomes available
    await sleep(1000);

    const url = await getPlaybackUrl(stream.playbackId);

    if (!url) throw new Error("No playback URL");

    const player = createPlayer(url, {
      reconnect: { enabled: true, maxAttempts: 10, baseDelayMs: 2000 },
    });

    playerRef.current = player;

    player.on("stateChange", (ps: PlayerState) => {
      console.log("Player:", ps);
      setPlayerState(ps);
    });

    player.on("error", (err: Error) => {
      console.error("Player error:", err);
      setPlayerState("error");
      setError(err.message || "Playback error.");

      // ✅ allow re-init if player dies
      playerRef.current = null;
    });

    // ✅ connect with retry
    try {
      await player.connect();
    } catch {
      console.warn("Player connect failed, retrying...");
      await sleep(2000);
      await player.connect();
    }

    // ✅ attach AFTER connect
    const video = outputVideoRef.current;
    if (video) {
      player.attachTo(video);
      await video.play().catch(() => {});
    }

  } catch (err: unknown) {
    console.error("Player setup failed:", err);
    setError(err instanceof Error ? err.message : "Player failed");

    // ✅ critical: reset so next "live" retries cleanly
    playerRef.current = null;
  }
});
// start AFTER listeners
await broadcast.connect();

broadcast.on("error", (err: Error) => {
  console.error("Broadcast error:", err);
  setBroadcastState("error");
  setError(err.message || "Broadcast error.");
});
      await broadcast.connect();
   } catch (err: unknown) {
  console.error("❌ startCamera failed:", err);

  const message =
    err instanceof Error
      ? err.message
      : "Failed to start camera.";

  setError(message);
  setBroadcastState("error");
} finally {
  setBusy(false);
}
  };

  /* ============================================================
     CAMERA STOP
     ============================================================ */
  const stopCamera = () => {
    try { playerRef.current?.stop?.(); } catch {}
    try { broadcastRef.current?.stop?.(); } catch {}
    broadcastRef.current = null;
    playerRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (outputVideoRef.current) outputVideoRef.current.srcObject = null;
    setCameraStarted(false);
    setStream(null);
    setBroadcastState("idle");
    setPlayerState("idle");
    setIsLiveMode(true);
    setLastPrompt("");
    setError(null);
  };

  /* ============================================================
     CORE PROMPT SENDER
     ============================================================ */
const sendPromptToDaydream = useCallback(async (finalPrompt: string) => {
  if (!finalPrompt?.trim()) { setError("Prompt is empty."); return; }
  if (!stream) { setError("No active stream. Start camera first."); return; }

  setBusy(true);
  setError(null);
  setLastPrompt(finalPrompt);
  setIsLiveMode(false);

  const isAbstract = renderEngine === "ABSTRACT";
  const speed = getSpeedSettings(motionSpeed, isAbstract);

  try {
    const res = await fetch("/api/daydream/update-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streamId: stream.id,
        prompt: finalPrompt,
        isAbstract,
        speed,
        motionSpeed,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    console.log(`✅ [${renderEngine}] Prompt applied`);
} catch (err: unknown) {
  console.error("❌ Prompt failed:", err);

  const message =
    err instanceof Error
      ? err.message
      : "Failed to update stream.";

  setError(message);
} finally {
  setBusy(false);
}
}, [stream, renderEngine, motionSpeed]);
  /* ── Prompt submit ── */
  const handlePromptSubmit = useCallback(async (base: string) => {
    if (!base.trim()) { setError("Enter a prompt first."); return; }

    const isPreset =
      Object.values(artistPresets).some(p => [...p.live, ...p.abstract].includes(base)) ||
      generatedPresets.includes(base);

    const finalPrompt = isPreset
      ? base
      : renderEngine === "LIVE"
        ? generateLivePrompt(base, mode)
        : generateAbstractPrompt(base);

    await sendPromptToDaydream(finalPrompt);
  }, [generatedPresets, renderEngine, mode, sendPromptToDaydream]);

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
        body: JSON.stringify({ pipeline: "streamdiffusion", params: null }),
      });
      if (!res.ok) throw new Error(await res.text());
      setIsLiveMode(true);
      setLastPrompt("");
   } catch (err: unknown) {
  const message =
    err instanceof Error
      ? err.message
      : "Failed to return to live mode.";

  setError(message);
} finally {
  setBusy(false);
}
  };

  /* ============================================================
     QUESTIONNAIRE + GEMINI
     ============================================================ */
  const handleInputChange = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleQuestionnaireSubmit = async () => {
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
                text: `Generate 5 short cinematic scene prompts for a real-time AI video performance.
Each prompt must reflect the artist's visual identity from these answers:
${JSON.stringify(answers, null, 2)}

Rules:
- Each prompt must be under 25 words
- Lead with a visual style or color palette
- Include lighting mood and one motion/texture word
- No lists, no explanations — one line each
- Format: "neon magenta concert haze, VHS grain, slow fog, cinematic"

Return exactly 5 lines.`,
              }],
            }],
          }),
        }
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "dreamy concert neon blue amber, cinematic haze, reflective light";
      const presets = text.split("\n")
        .map((t: string) => t.replace(/^[-•\d."]+\s*/, "").trim())
        .filter(Boolean).slice(0, 5);
      setGeneratedPresets(presets);
      setArtist("generated");
    } catch {
      setGeneratedPresets([
        "dreamy concert soft hues, cinematic 4k, glowing ambient light",
        "golden haze live performance, surreal lighting, pastel diffusion",
      ]);
      setArtist("generated");
    } finally {
      setBusy(false);
    }
  };

  /* ============================================================
     SONG → VISUAL AI
     ============================================================ */
  const handleKaraokeVisual = async () => {
    if (!songPrompt.trim()) { setError("Enter a song name first."); return; }
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Write one short visual scene prompt (under 20 words) for a real-time AI video performance matching the mood of: "${songPrompt}". Lead with color and style. No quotes, one line only.`,
              }],
            }],
          }),
        }
      );
    const data = await response.json();

const text =
  data.candidates?.[0]?.content?.parts?.[0]?.text ||
  "energetic live performance, cinematic neon, 4k";

await handlePromptSubmit(text.trim());

} catch (err: unknown) {
  const message =
    err instanceof Error
      ? err.message
      : "Failed to generate visuals.";

  setError(message);
} finally {
  setBusy(false);
}
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

    let isActive = true;
    let isRunning = false;
    let currentModeType: "live" | "abstract" = "live";
    let index = 0;
    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;

    const cycle = async () => {
      if (!isActive || isRunning) return;
      isRunning = true;
      try {
        const modePresets = artistPresets[artist][currentModeType];
        if (!modePresets?.length) return;
        const preset = modePresets[index];
        await handlePromptSubmit(`${preset}, soft cinematic transition, glowing motion blend`);
        if (fadeTimeout) clearTimeout(fadeTimeout);
        fadeTimeout = setTimeout(() => { if (isActive) handlePromptSubmit(preset); }, 15000);
        index = (index + 1) % modePresets.length;
        if (index === 0) currentModeType = currentModeType === "live" ? "abstract" : "live";
      } finally {
        isRunning = false;
      }
    };

    cycle();
    const timer = setInterval(cycle, intervalMs);
    return () => {
      isActive = false;
      clearInterval(timer);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [artist, handlePromptSubmit]);

  const tags = useMemo(() => {
    if (mode === "dj") return DJ_MOODS;
    if (mode === "performance") return KARAOKE_GENRES;
    return LIVE_TAGS;
  }, [mode]);

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <main style={{
      height: "100vh", width: "100vw", background: "#000", color: "#fff",
      overflow: "hidden", position: "relative",
      fontFamily: "'DM Mono', 'Courier New', monospace",
    }}>

      {/* ── AI OUTPUT VIDEO (fullscreen background) ── */}
      <div ref={containerRef} style={{
        position: "absolute", top: 0, left: 0,
        width: "100vw", height: "100vh",
        backgroundColor: "#000", zIndex: 1,
      }}>
        <video
          ref={outputVideoRef}
          autoPlay playsInline muted
          onLoadedMetadata={() => outputVideoRef.current?.play().catch(() => {})}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {/* Overlay when not live */}
        {broadcastState !== "live" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 12,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
          }}>
            <div style={{ fontSize: 42 }}>
              {broadcastState === "connecting" ? "⏳"
                : broadcastState === "reconnecting" ? "🔄"
                : broadcastState === "error" ? "⚠️"
                : "🎛"}
            </div>
            <div style={{ fontSize: 12, letterSpacing: "0.2em", opacity: 0.7 }}>
              {broadcastState === "connecting" ? "CONNECTING"
                : broadcastState === "reconnecting" ? "RECONNECTING"
                : broadcastState === "error" ? "STREAM ERROR"
                : "VPM PRO"}
            </div>
          </div>
        )}

        {/* Dev debug */}
        {process.env.NODE_ENV === "development" && cameraStarted && (
          <div style={{
            position: "fixed", right: 12, bottom: 12, zIndex: 20,
            padding: "10px 12px", borderRadius: 8,
            background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.12)",
            fontSize: 11, lineHeight: 1.6, backdropFilter: "blur(6px)",
          }}>
            <div>Broadcast: {broadcastState}</div>
            <div>Player: {playerState}</div>
          </div>
        )}
      </div>

      {/* ── SETUP SCREEN ── */}
      {!cameraStarted && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.96)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: "100%", maxWidth: 480, padding: "40px 36px",
            background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, boxShadow: "0 0 60px rgba(0,204,102,0.08)",
          }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", opacity: 0.4, marginBottom: 8 }}>VPM PRO</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "0.05em" }}>
                Visual Performance Mixer
              </h2>
              <p style={{ margin: "10px 0 0", fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>
                Your browser camera feeds directly into the AI stream. No OBS required.
              </p>
            </div>

            <div style={{
              padding: "14px 16px", borderRadius: 10,
              background: "rgba(0,204,102,0.05)", border: "1px solid rgba(0,204,102,0.15)",
              marginBottom: 20, fontSize: 12, opacity: 0.7, lineHeight: 1.8,
            }}>
              <div>Model: <strong style={{ color: "#00cc66" }}>sd-turbo</strong></div>
              <div>Resolution: <strong style={{ color: "#00cc66" }}>512 × 512</strong></div>
              <div>Latency: <strong style={{ color: "#00cc66" }}>ultra-low (WHEP)</strong></div>
            </div>

            {devices.length > 1 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, opacity: 0.4, letterSpacing: "0.15em", marginBottom: 8 }}>
                  SELECT CAMERA
                </div>
                <select
                  value={selectedDeviceId}
                  onChange={e => setSelectedDeviceId(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8, color: "#fff", fontFamily: "inherit", fontSize: 12,
                  }}
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId} style={{ background: "#111" }}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div style={{
                marginBottom: 16, padding: "10px 12px", borderRadius: 8,
                background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)",
                color: "#ff8888", fontSize: 12,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={startCamera} disabled={busy} style={{
              width: "100%", padding: "16px",
              background: busy ? "rgba(255,255,255,0.05)" : "#00cc66",
              color: busy ? "rgba(255,255,255,0.3)" : "#000",
              border: "none", borderRadius: 10,
              fontFamily: "inherit", fontSize: 14, fontWeight: 700,
              letterSpacing: "0.1em", cursor: busy ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}>
              {busy ? "⟳ Starting…" : "▶ START CAMERA + STREAM"}
            </button>

            <p style={{ margin: "14px 0 0", fontSize: 11, opacity: 0.3, textAlign: "center" }}>
              Browser will ask for camera permission
            </p>
          </div>
        </div>
      )}

      {/* ── CONTROL PANEL ── */}
      {cameraStarted && !isFullscreen && (
        <div style={{
          position: "relative", zIndex: 10,
          padding: "14px 18px",
          background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          maxHeight: "100vh", overflowY: "auto",
        }}>

          {/* ── HEADER ROW ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 16, letterSpacing: "0.15em", fontWeight: 700 }}>🎛 VPM PRO</h1>

            {/* Broadcast status dot */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${STATE_COLORS[broadcastState] ?? "#555"}44`,
              fontSize: 11,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: STATE_COLORS[broadcastState] ?? "#555",
                display: "inline-block",
                boxShadow: broadcastState === "live" ? "0 0 6px #00cc66" : "none",
              }} />
              {broadcastState.toUpperCase()}
            </div>

            {/* Local camera preview */}
            <video ref={localVideoRef} autoPlay playsInline muted style={{
              width: 80, height: 45, borderRadius: 6, objectFit: "cover",
              border: "1px solid rgba(255,255,255,0.15)", background: "#111",
            }} />

            {/* Render engine toggle */}
            <div style={{
              display: "flex", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10, padding: 3, gap: 3,
            }}>
              {RENDER_ENGINES.map(engine => {
                const isActive = renderEngine === engine;
                return (
                  <button key={engine} onClick={() => setRenderEngine(engine)} disabled={busy} style={{
                    padding: "7px 16px", borderRadius: 7, border: "none",
                    cursor: busy ? "not-allowed" : "pointer",
                    fontFamily: "inherit", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                    transition: "all 0.2s ease",
                    background: isActive ? ENGINE_COLORS[engine] : "transparent",
                    color: isActive ? "#000" : "rgba(255,255,255,0.5)",
                    boxShadow: isActive ? `0 0 14px ${ENGINE_COLORS[engine]}66` : "none",
                  }}>
                    {engine === "LIVE" ? "📷 LIVE" : "🌀 ABSTRACT"}
                  </button>
                );
              })}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={returnToLiveMode} disabled={busy || isLiveMode} style={{
                padding: "7px 14px", borderRadius: 8, border: "none",
                background: isLiveMode ? "#1a3a1a" : "#0a7a0a",
                color: isLiveMode ? "#4a8a4a" : "#fff",
                fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                cursor: isLiveMode ? "default" : "pointer", letterSpacing: "0.1em",
              }}>
                {isLiveMode ? "● LIVE" : "↩ BACK TO LIVE"}
              </button>
              <button onClick={requestFullscreen} style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent", color: "#fff",
                fontFamily: "inherit", fontSize: 11, cursor: "pointer",
              }}>
                ⛶ FULLSCREEN
              </button>
              <button onClick={stopCamera} style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(255,80,80,0.3)",
                background: "rgba(255,80,80,0.1)", color: "#ff8888",
                fontFamily: "inherit", fontSize: 11, cursor: "pointer",
              }}>
                ■ STOP
              </button>
            </div>
          </div>

          {/* Last prompt */}
          {lastPrompt && (
            <div style={{
              marginBottom: 10, padding: "7px 12px", borderRadius: 6, fontSize: 11,
              background: renderEngine === "LIVE" ? "rgba(0,204,102,0.07)" : "rgba(170,68,255,0.07)",
              border: `1px solid ${renderEngine === "LIVE" ? "rgba(0,204,102,0.2)" : "rgba(170,68,255,0.2)"}`,
              color: renderEngine === "LIVE" ? "#00cc66aa" : "#aa44ffaa",
            }}>
              <span style={{ opacity: 0.5 }}>LAST: </span>
              {lastPrompt.slice(0, 100)}{lastPrompt.length > 100 ? "…" : ""}
            </div>
          )}

          {/* Mode + Motion row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 5 }}>
              {MODES.map(m => (
                <button key={m} onClick={() => setMode(m)} disabled={busy} style={{
                  padding: "6px 14px", borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: mode === m ? "rgba(255,255,255,0.15)" : "transparent",
                  color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
                  fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.1em", cursor: "pointer",
                }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ fontSize: 11, opacity: 0.4, marginRight: 2 }}>MOTION</span>
              {MOTION_SPEEDS.map(speed => (
                <button key={speed} onClick={() => setMotionSpeed(speed)} disabled={busy} style={{
                  padding: "6px 12px", borderRadius: 6,
                  border: `1px solid ${motionSpeed === speed ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                  background: motionSpeed === speed ? "rgba(255,255,255,0.12)" : "transparent",
                  color: motionSpeed === speed ? "#fff" : "rgba(255,255,255,0.35)",
                  fontFamily: "inherit", fontSize: 11, cursor: "pointer",
                }}>
                  {speed === "slow" ? "🐢" : speed === "medium" ? "⚖️" : "⚡"} {speed}
                </button>
              ))}
            </div>
          </div>

          {/* ── LIVE MODE: ARTIST PRESETS ── */}
          {mode === "live" && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ fontSize: 11, opacity: 0.4, alignSelf: "center", marginRight: 4 }}>ARTIST</span>
                {["new", "fletch", "bradford", "cherry"].map(a => (
                  <button key={a} onClick={() => setArtist(a)} style={{
                    padding: "6px 13px", borderRadius: 6,
                    border: `1px solid ${artist === a ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                    background: artist === a ? "rgba(255,255,255,0.12)" : "transparent",
                    color: "#fff", fontFamily: "inherit", fontSize: 11, cursor: "pointer",
                  }}>
                    {a === "new" ? "➕ New" : a === "fletch" ? "🎧 Fletch" : a === "bradford" ? "🎸 Bradford" : "🌊 Cherry"}
                  </button>
                ))}
              </div>

              {/* New artist questionnaire */}
              {artist === "new" && (
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 12, letterSpacing: "0.1em" }}>🧠 VISUAL INTAKE</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["Color Palette", "colorPalette", "blue/pink"],
                      ["Cultural References", "culturalRefs", "coming-of-age films"],
                      ["Emotional Atmosphere", "emotion", "euphoric, youthful"],
                      ["Texture / Finish", "texture", "grainy, VHS"],
                      ["Season", "season", "summer nostalgia"],
                      ["Visual Type", "visualType", "surreal and organic"],
                      ["References", "references", "Kilu, Bleech93"],
                    ].map(([label, key, ph]) => (
                      <div key={key}>
                        <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 3 }}>{label}</div>
                        <input type="text" placeholder={ph}
                          onChange={e => handleInputChange(key, e.target.value)}
                          style={{
                            width: "100%", padding: "7px 9px", boxSizing: "border-box",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 11,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleQuestionnaireSubmit} disabled={busy} style={{
                    marginTop: 10, padding: "9px 18px",
                    background: "#00aa00", border: "none", borderRadius: 8,
                    color: "#fff", fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>
                    ✅ Generate Presets
                  </button>
                </div>
              )}

              {/* Static artist presets */}
              {artist && artistPresets[artist] && (
                <div style={{ marginTop: 10 }}>
                  {(["live", "abstract"] as const).map(modeType => (
                    <div key={modeType} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 6, letterSpacing: "0.1em" }}>
                        {modeType === "live" ? "🎤 LIVE CAPTURE" : "🌀 ABSTRACT"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {artistPresets[artist][modeType].map((preset: string) => {
                          const label = preset.replace(/[^a-zA-Z\s]/g, "").trim()
                            .split(/\s+/).slice(0, 3)
                            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                          return (
                            <button key={preset} title={preset} onClick={() => handlePromptSubmit(preset)} style={{
                              padding: "10px 20px",
                              background: modeType === "abstract" ? "rgba(170,68,255,0.15)" : "#1a1a1a",
                              color: "#fff",
                              border: modeType === "abstract" ? "1px solid rgba(170,68,255,0.3)" : "1px solid #444",
                              borderRadius: 8, cursor: "pointer",
                              fontFamily: "inherit", fontSize: 11,
                              maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
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

              {/* Generated presets */}
              {artist === "generated" && generatedPresets.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 6, letterSpacing: "0.1em" }}>🎬 YOUR PRESETS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {generatedPresets.map(preset => {
                      const label = preset.replace(/[^a-zA-Z\s]/g, "").trim()
                        .split(/\s+/).slice(0, 3)
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                      return (
                        <button key={preset} title={preset} onClick={() => handlePromptSubmit(preset)} style={{
                          padding: "10px 20px", background: "#1a1a1a", color: "#fff",
                          border: "1px solid #555", borderRadius: 8, cursor: "pointer",
                          boxShadow: "0 0 10px rgba(200,87,200,0.4)",
                          fontFamily: "inherit", fontSize: 11,
                          maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
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
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 6, letterSpacing: "0.1em" }}>🎨 MANUAL PROMPT</div>
            <div style={{ display: "flex", gap: 7 }}>
              <input type="text" placeholder="Describe a scene or mood"
                value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handlePromptSubmit(customPrompt)}
                style={{
                  flex: 1, padding: "9px 12px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12,
                }}
              />
              <button onClick={() => handlePromptSubmit(customPrompt)} disabled={busy} style={{
                padding: "9px 18px",
                background: renderEngine === "LIVE" ? "rgba(0,204,102,0.25)" : "rgba(170,68,255,0.25)",
                border: `1px solid ${renderEngine === "LIVE" ? "rgba(0,204,102,0.4)" : "rgba(170,68,255,0.4)"}`,
                borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 11,
                cursor: busy ? "not-allowed" : "pointer",
              }}>
                {busy ? "…" : "SEND"}
              </button>
            </div>
          </div>

          {/* ── SONG TO VISUAL ── */}
          {mode === "performance" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 6, letterSpacing: "0.1em" }}>🎵 SONG TO VISUAL</div>
              <div style={{ display: "flex", gap: 7 }}>
                <input type="text" placeholder="Enter song or artist name"
                  value={songPrompt} onChange={e => setSongPrompt(e.target.value)}
                  style={{
                    flex: 1, padding: "9px 12px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12,
                  }}
                />
                <button onClick={handleKaraokeVisual} disabled={busy} style={{
                  padding: "9px 18px", background: "#333", border: "1px solid #555",
                  borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 11,
                  cursor: busy ? "not-allowed" : "pointer",
                }}>
                  {busy ? "…" : "GENERATE"}
                </button>
              </div>
            </div>
          )}

          {/* ── TAG BANK ── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {(mode === "dj" ? shuffledTags : [...tags]).map(tag => (
              <button key={tag} onClick={() => handlePromptSubmit(tag)} disabled={busy} style={{
                padding: "8px 16px", borderRadius: 8,
                background: "#1e1e1e", color: "#ccc", border: "1px solid #333",
                fontFamily: "inherit", fontSize: 11, cursor: busy ? "not-allowed" : "pointer",
              }}>
                {tag}
              </button>
            ))}
            {mode === "dj" && (
              <button
                onClick={() => setShuffledTags([...DJ_MOODS].sort(() => Math.random() - 0.5).slice(0, 8))}
                disabled={busy}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: "transparent", color: "rgba(255,255,255,0.35)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                  fontFamily: "inherit", fontSize: 11, cursor: "pointer",
                }}
              >
                🔀 Shuffle
              </button>
            )}
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div style={{
              padding: "8px 12px", borderRadius: 6, fontSize: 11,
              background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.25)",
              color: "#ff8888",
            }}>
              ⚠️ {error}
            </div>
          )}

        </div>
      )}
    </main>
  );
}
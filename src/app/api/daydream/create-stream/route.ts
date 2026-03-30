import { NextRequest, NextResponse } from "next/server";
import { Daydream } from "@daydreamlive/sdk";

const daydream = new Daydream({
  bearer: process.env.DAYDREAM_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const stream = await daydream.streams.create({
      pipeline: "streamdiffusion",
      params: {
        modelId: "stabilityai/sd-turbo",
        prompt: "live performance",
        width: 512,
        height: 512,
        numInferenceSteps: 25,
        guidanceScale: 1,
        delta: 0.7,
        tIndexList: [12, 20, 24],
      },
    });

    const upstreamWhip = new URL(stream.whipUrl);
    const proxyWhip = new URL(
      `/api/daydream/whip${upstreamWhip.pathname}${upstreamWhip.search}`,
      req.nextUrl.origin
    );

    return NextResponse.json({
      id: String(stream.id),
      whipUrl: proxyWhip.toString(),
      playbackId: String(stream.outputPlaybackId ?? ""),
    });
  } catch (err) {
    console.error("create-stream failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create stream" },
      { status: 500 }
    );
  }
}
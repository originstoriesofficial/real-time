import { NextResponse } from "next/server";
import { Daydream } from "@daydreamlive/sdk";

const daydream = new Daydream({
  bearer: process.env.DAYDREAM_API_KEY!,
});

export async function POST() {
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

    console.log("STREAM CREATED:", stream);

    if (!stream?.whipUrl) {
      throw new Error("No whipUrl returned from Daydream");
    }

    return NextResponse.json({
      id: stream.id,
      whipUrl: stream.whipUrl,
      playbackId: stream.outputPlaybackId,
    });
  } catch (err) {
    console.error("CREATE STREAM FAILED:", err);

    return NextResponse.json(
      { error: "Failed to create stream" },
      { status: 500 }
    );
  }
}
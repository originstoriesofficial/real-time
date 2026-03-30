// app/api/daydream/update-stream/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { streamId, prompt, speed } = body;

    if (!streamId) {
      return NextResponse.json(
        { error: "Missing streamId" },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 }
      );
    }

    if (!process.env.DAYDREAM_API_KEY) {
      console.error("❌ Missing DAYDREAM_API_KEY");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://api.daydream.live/v1/streams/${streamId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DAYDREAM_API_KEY}`,
        },
        body: JSON.stringify({
          params: {
            prompt,
            ...(speed || {}),
          },
        }),
      }
    );

    const text = await res.text();

    if (!res.ok) {
      console.error("❌ Daydream PATCH failed:", text);

      return NextResponse.json(
        { error: text || "Daydream error" },
        { status: 500 }
      );
    }

    console.log("✅ Prompt updated:", prompt);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ update-stream crashed:", err);

    return NextResponse.json(
      { error: "Route crashed" },
      { status: 500 }
    );
  }
}
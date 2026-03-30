// app/api/daydream/update-stream/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { streamId, prompt, speed } = await req.json();

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
            ...speed,
          },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "update failed" },
      { status: 500 }
    );
  }
}
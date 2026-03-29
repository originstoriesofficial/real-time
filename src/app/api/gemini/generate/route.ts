import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export async function POST(req: Request) {
  try {
    const { type, input } = await req.json();

    let prompt = "";

    if (type === "artist") {
      prompt = `Generate 5 short cinematic scene prompts for a real-time AI video performance.

${JSON.stringify(input, null, 2)}

Rules:
- under 25 words
- start with color/style
- include lighting + motion
- one line each
- no lists

Return exactly 5 lines.`;
    }

    if (type === "song") {
      prompt = `Write one short visual scene prompt (under 20 words) matching: "${input}". One line only.`;
    }

    const res = await fetch(
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

    const data = await res.json();

    return NextResponse.json({
      text:
        data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    });
  } catch (err: unknown
  ) {
    console.error("Gemini error:", err);
    return new NextResponse("Gemini failed", { status: 500 });
  }
}
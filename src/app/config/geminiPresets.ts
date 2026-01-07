// src/app/config/geminiPresets.ts

export async function generateVisualPresetsWithGemini(answers: Record<string, string>) {
    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error("❌ Missing GEMINI_API_KEY in environment variables.");
      return [];
    }
  
    const prompt = `
  You are a visual creative assistant for live music visuals.
  Given the following artist questionnaire answers, generate 4–6 short cinematic scene prompts
  inspired by their mood and aesthetic. Each should be a single descriptive phrase
  formatted for a Stable Diffusion / Stream Diffusion model.
  
  Example output:
  [
    "Award-winning cinematic scene — dreamy pink fog and blue neon reflections, 4k",
    "Surreal VHS youth moment — nostalgic sunset with lens flares, cinematic lighting"
  ]
  
  Artist Answers:
  ${JSON.stringify(answers, null, 2)}
  
  The final prompt for each should sound like:
  "An award-winning visual — [user’s answers blended], cinematic, 4k, dynamic lighting, vivid color contrast."
  Return only a JSON array of strings.
  `;
  
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
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );
  
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
  
      // Try to parse JSON array
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback to text splitting
        return text
          .split("\n")
          .filter((t: string) => t.trim())
          .map((t: string) => t.replace(/^-/, "").trim());
      }
  
      return [];
    } catch (err) {
      console.error("❌ Gemini API failed:", err);
      return [];
    }
  }
  
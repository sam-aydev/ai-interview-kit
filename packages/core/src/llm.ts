// packages/core/src/llm.ts

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/**
 * Generic LLM caller with Exponential Backoff for rate limits (429).
 * Enforces JSON output.
 */
export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  model = process.env.LLM_MODEL || "openai/gpt-oss-20b", // Defaulting to a free Groq model as an example
): Promise<T> {
  const apiKey = process.env.LLM_API_KEY;
  const baseURL =
    process.env.LLM_BASE_URL ||
    "https://api.groq.com/openai/v1/chat/completions";

  if (!apiKey) throw new Error("LLM_API_KEY environment variable is missing.");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2, // Low temperature for deterministic JSON structure
        }),
      });

      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM API Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) throw new Error("Empty response from LLM");

      return JSON.parse(content) as T;
    } catch (error: any) {
      if (attempt === MAX_RETRIES) throw error;

      // Exponential backoff: 2s, 4s, 8s
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[LLM] Attempt ${attempt} failed. Retrying in ${delay}ms... (${error.message})`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("Unreachable");
}

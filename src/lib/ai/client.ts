import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

export const MODEL = "claude-sonnet-5-5";

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiUnavailableError("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 40_000, maxRetries: 1 });
  return client;
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found");
  return JSON.parse(text.slice(start, end + 1));
}

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Ask the model for a JSON object and validate it with zod.
 * Retries once with the validation error appended. Throws AiUnavailableError on any failure,
 * so callers can use their deterministic fallback. Never logs the API key or request headers.
 */
export async function callJson<T>(opts: {
  system: string;
  user: string;
  schema: ZodType<T, any, any>;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const c = getClient();
  const messages: Msg[] = [{ role: "user", content: opts.user }];
  let useTemperature = true;

  for (let attempt = 0; attempt < 2; attempt++) {
    let text = "";
    try {
      const res = await c.messages.create({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 1500,
        ...(useTemperature ? { temperature: opts.temperature ?? 0.2 } : {}),
        system: opts.system,
        messages,
      });
      text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    } catch (err) {
      const e = err as { status?: number; message?: string };
      if (useTemperature && e.status === 400 && /temperature/i.test(e.message ?? "")) {
        useTemperature = false;
        attempt--; // not a validation failure, try again without temperature
        continue;
      }
      console.warn(`[ai] request failed (status ${e.status ?? "n/a"}): ${(e.message ?? "unknown").slice(0, 160)}`);
      throw new AiUnavailableError("AI request failed");
    }

    let issue = "";
    try {
      const parsed = opts.schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      issue = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
    } catch (e) {
      issue = (e as Error).message;
    }
    console.warn(`[ai] invalid JSON on attempt ${attempt + 1}: ${issue.slice(0, 200)}`);
    messages.push({ role: "assistant", content: text || "(empty)" });
    messages.push({ role: "user", content: `That reply was invalid (${issue}). Reply again with only the JSON object, matching the requested shape exactly.` });
  }
  throw new AiUnavailableError("AI returned invalid JSON twice");
}

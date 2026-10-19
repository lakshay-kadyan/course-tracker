import "server-only";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { getAiConfig } from "./config";
import { fromProviderError } from "./errors";

type Check = { ok: boolean; code?: string };

/** Live credential/model lookups. They send NO lecture data: only a model-metadata request per provider. */
export async function liveChecks(): Promise<{ openai: Check; gemini: Check }> {
  const c = getAiConfig();
  const run = async (key: string | undefined, provider: "openai" | "gemini", fn: () => Promise<unknown>): Promise<Check> => {
    if (!key) return { ok: false, code: "not_configured" };
    try { await fn(); return { ok: true }; } catch (e) { return { ok: false, code: fromProviderError(e, provider, "text").code }; }
  };
  const [openai, gemini] = await Promise.all([
    run(c.openaiApiKey, "openai", () => new OpenAI({ apiKey: c.openaiApiKey, timeout: 15_000, maxRetries: 0 }).models.retrieve(c.transcribeModel)),
    run(c.geminiApiKey, "gemini", () => new GoogleGenAI({ apiKey: c.geminiApiKey }).models.get({ model: c.geminiModel, config: { httpOptions: { timeout: 15_000 } } })),
  ]);
  return { openai, gemini };
}

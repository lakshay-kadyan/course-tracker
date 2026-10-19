import "server-only";

/**
 * Server-only AI configuration. Secrets are read from process.env at call time
 * (never at import time, never in client bundles) and are never returned from any public helper.
 */
export interface AiConfig {
  openaiApiKey?: string;
  geminiApiKey?: string;
  accessToken?: string;
  transcribeModel: string;
  geminiModel: string;
  transcribeTimeoutMs: number;
  analyzeTimeoutMs: number;
}

const posNum = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
const str = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);

export function getAiConfig(): AiConfig {
  return {
    openaiApiKey: str(process.env.OPENAI_API_KEY),
    geminiApiKey: str(process.env.GEMINI_API_KEY),
    accessToken: str(process.env.AI_ACCESS_TOKEN),
    transcribeModel: str(process.env.OPENAI_TRANSCRIBE_MODEL) ?? "whisper-1",
    geminiModel: str(process.env.GEMINI_MODEL) ?? "gemini-2.5-flash",
    transcribeTimeoutMs: posNum(process.env.OPENAI_TIMEOUT_MS, 120_000),
    analyzeTimeoutMs: posNum(process.env.GEMINI_TIMEOUT_MS, 60_000),
  };
}

/** Safe to return to clients: booleans and model names only. */
export function publicStatus() {
  const c = getAiConfig();
  return {
    endpointsEnabled: Boolean(c.accessToken),
    openai: { configured: Boolean(c.openaiApiKey), role: "speech-to-text", model: c.transcribeModel },
    gemini: { configured: Boolean(c.geminiApiKey), role: "transcript-analysis", model: c.geminiModel },
  };
}

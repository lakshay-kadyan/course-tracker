import "server-only";
import OpenAI, { toFile } from "openai";
import { GoogleGenAI } from "@google/genai";
import { validateAudio } from "./audio";
import { getAiConfig } from "./config";
import { AiError, fromProviderError } from "./errors";

export interface TranscribeInput { bytes: Uint8Array; filename?: string; mimeType?: string; language?: string }
export interface TranscribeResult { text: string; model: string; provider: "openai" | "gemini"; empty: boolean }

const GEMINI_INLINE_LIMIT = 14 * 1024 * 1024; // inline audio limit for a Gemini request

/**
 * Speech-to-text ONLY. It never touches course progress or any database.
 * Audio stays in memory and is never written to disk.
 * Provider is chosen by TRANSCRIBE_PROVIDER ("gemini" or "openai", default "openai").
 * `deps.client` lets tests inject a fake OpenAI client without network access.
 */
export async function transcribeAudio(input: TranscribeInput, deps: { client?: Pick<OpenAI, "audio"> } = {}): Promise<TranscribeResult> {
  if (input.language && !/^[a-z]{2}$/.test(input.language)) throw new AiError("invalid_request", 400, "language must be a two-letter ISO-639-1 code such as \"en\".");
  const fmt = validateAudio(input.bytes, input.filename, input.mimeType);
  const provider = process.env.TRANSCRIBE_PROVIDER?.trim().toLowerCase();
  if (!deps.client && provider === "gemini") return viaGemini(input, fmt);
  return viaOpenAI(input, fmt, deps);
}

async function viaGemini(input: TranscribeInput, fmt: { ext: string; mime: string }): Promise<TranscribeResult> {
  const cfg = getAiConfig();
  const key = process.env.GEMINI_TRANSCRIBE_API_KEY?.trim() || cfg.geminiApiKey;
  if (!key) throw new AiError("not_configured", 503, "Gemini is not configured on the server.", "gemini");
  if (input.bytes.byteLength > GEMINI_INLINE_LIMIT) throw new AiError("audio_too_large", 413, "Audio is too large for Gemini transcription (max about 14 MB). Split it into shorter parts.");
  const model = process.env.GEMINI_TRANSCRIBE_MODEL?.trim() || cfg.geminiModel;
  try {
    const client = new GoogleGenAI({ apiKey: key });
    const res = await client.models.generateContent({
      model,
      contents: [{
        role: "user",
        parts: [
          { text: "Transcribe this lecture recording exactly as spoken. Return only the transcript text, with no commentary, headings or timestamps. If there is no speech, return nothing." },
          { inlineData: { mimeType: fmt.mime, data: Buffer.from(input.bytes).toString("base64") } },
        ],
      }],
      config: { temperature: 0, httpOptions: { timeout: cfg.transcribeTimeoutMs } },
    });
    const text = (res.text ?? "").trim();
    return { text, model, provider: "gemini", empty: text === "" };
  } catch (e) {
    throw fromProviderError(e, "gemini", "audio");
  }
}

async function viaOpenAI(input: TranscribeInput, fmt: { ext: string; mime: string }, deps: { client?: Pick<OpenAI, "audio"> }): Promise<TranscribeResult> {
  const cfg = getAiConfig();
  if (!deps.client && !cfg.openaiApiKey) throw new AiError("not_configured", 503, "OpenAI is not configured on the server.", "openai");
  const client = deps.client ?? new OpenAI({ apiKey: cfg.openaiApiKey, timeout: cfg.transcribeTimeoutMs, maxRetries: 1 });
  try {
    // Generic filename: never forward whatever name the browser supplied.
    const file = await toFile(input.bytes, `lecture.${fmt.ext}`, { type: fmt.mime });
    const res = await client.audio.transcriptions.create({ file, model: cfg.transcribeModel, response_format: "json", ...(input.language ? { language: input.language } : {}) });
    const text = (res.text ?? "").trim();
    return { text, model: cfg.transcribeModel, provider: "openai", empty: text === "" };
  } catch (e) {
    throw fromProviderError(e, "openai", "audio");
  }
}

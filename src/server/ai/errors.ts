import "server-only";

export type Provider = "openai" | "gemini";
export type AiErrorCode =
  | "disabled" | "unauthorized" | "rate_limited_local" | "invalid_request" | "not_configured"
  | "audio_too_large" | "unsupported_audio"
  | "provider_auth" | "rate_limited" | "quota_exhausted" | "model_unavailable" | "provider_rejected"
  | "provider_timeout" | "provider_unavailable" | "invalid_model_output" | "empty_response" | "internal_error";

/** Every error that can reach a client. Messages are static and never contain provider text (which may echo key fragments). */
export class AiError extends Error {
  constructor(public code: AiErrorCode, public status: number, message: string, public provider?: Provider, public retryAfterSeconds?: number) {
    super(message);
    this.name = "AiError";
  }
}

const name = (p?: Provider) => (p === "openai" ? "OpenAI" : "Gemini");

/** Maps an SDK/network error to a sanitized AiError. Duck-typed so it works for both SDKs and for tests. */
export function fromProviderError(err: unknown, provider: Provider, kind: "audio" | "text"): AiError {
  if (err instanceof AiError) return err;
  const e = (err ?? {}) as { status?: unknown; code?: unknown; name?: unknown; message?: unknown };
  const status = typeof e.status === "number" ? e.status : undefined;
  const code = typeof e.code === "string" ? e.code : "";
  const n = String(e.name ?? "");
  const msg = String(e.message ?? "").toLowerCase(); // inspected only; never returned

  if (/timeout|abort/i.test(n) || /timed out|timeout/.test(msg))
    return new AiError("provider_timeout", 504, `${name(provider)} did not respond in time. Try again.`, provider);
  if (status === 401 || status === 403 || /api key not valid|api_key_invalid|incorrect api key|invalid api key/.test(msg))
    return new AiError("provider_auth", 502, `The server's ${name(provider)} credentials were rejected. Check the key configured on the server.`, provider);
  if (code === "insufficient_quota")
    return new AiError("quota_exhausted", 503, `${name(provider)} quota is exhausted. Check the plan and billing for the server's key.`, provider);
  if (status === 429)
    return new AiError("rate_limited", 429, `${name(provider)} rate limit or quota reached. Wait and retry; if it persists check plan and billing.`, provider, 30);
  if (status === 413)
    return new AiError("audio_too_large", 413, "The audio file is larger than the provider allows.", provider);
  if (status === 404)
    return new AiError("model_unavailable", 502, `The configured ${name(provider)} model is not available to this account.`, provider);
  if (status === 400 || status === 415 || status === 422)
    return kind === "audio"
      ? new AiError("unsupported_audio", 415, "The provider could not decode this audio. Use mp3, mp4, m4a, wav, webm, ogg or flac.", provider)
      : new AiError("provider_rejected", 502, `${name(provider)} rejected the request.`, provider);
  if (status === undefined || status >= 500)
    return new AiError("provider_unavailable", 502, `${name(provider)} is unavailable or unreachable. Try again later.`, provider);
  return new AiError("internal_error", 500, "Unexpected error while calling the provider.", provider);
}

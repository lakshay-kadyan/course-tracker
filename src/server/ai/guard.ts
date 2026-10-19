import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getAiConfig } from "./config";
import { AiError } from "./errors";

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Fail-closed gate for every AI endpoint.
 * The prototype has no real authentication, so access requires a server-side shared secret
 * (AI_ACCESS_TOKEN) sent as `Authorization: Bearer <token>`. When Supabase Auth is added, replace this
 * with a session + role check (faculty only) and drop the shared secret.
 */
export function authorize(req: Request): void {
  const { accessToken } = getAiConfig();
  if (!accessToken) throw new AiError("disabled", 503, "AI endpoints are disabled: AI_ACCESS_TOKEN is not configured on the server.");
  const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "");
  if (!m || !timingSafeEqual(digest(m[1]), digest(accessToken))) throw new AiError("unauthorized", 401, "Missing or invalid access token.");
}

// In-memory sliding window. Per server instance only: use a shared store (Redis/Supabase) when scaling out.
const hits = new Map<string, number[]>();
function limit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    throw new AiError("rate_limited_local", 429, "Too many requests. Slow down and retry shortly.", undefined, Math.ceil((windowMs - (now - recent[0])) / 1000));
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 1000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
}

/** Rate limit (cheap, before auth, to blunt token guessing) -> authorize -> per-endpoint rate limit. */
export function guard(req: Request, bucket: string, maxPerMinute: number): void {
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
  limit(`any:${ip}`, 60, 60_000);
  authorize(req);
  limit(`${bucket}:${ip}`, maxPerMinute, 60_000);
}

export const __resetRateLimitsForTests = () => hits.clear();

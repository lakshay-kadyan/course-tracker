import "server-only";
import { AiError } from "./errors";

const base = { "Cache-Control": "no-store" };

export const ok = (body: Record<string, unknown>, status = 200) => Response.json({ ok: true, ...body }, { status, headers: base });

/** Logs only route, code and status. Never messages, transcripts, audio details or secrets. */
export function fail(err: unknown, route: string) {
  const e = err instanceof AiError ? err : new AiError("internal_error", 500, "Unexpected server error.");
  console.error("[ai]", { route, code: e.code, status: e.status, provider: e.provider ?? (err instanceof AiError ? undefined : (err as Error)?.name) });
  return Response.json({ ok: false, error: { code: e.code, message: e.message } }, { status: e.status, headers: e.retryAfterSeconds ? { ...base, "Retry-After": String(e.retryAfterSeconds) } : base });
}

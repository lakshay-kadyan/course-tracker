import { connection } from "next/server";
import { publicStatus } from "@/server/ai/config";
import { guard } from "@/server/ai/guard";
import { fail, ok } from "@/server/ai/http";
import { liveChecks } from "@/server/ai/health";

/**
 * GET  /api/ai/status          configuration booleans only (no secrets, no provider calls).
 * GET  /api/ai/status?live=1   also checks each key and model with a metadata lookup. Requires the bearer token.
 */
export async function GET(req: Request) {
  await connection();
  try {
    const live = new URL(req.url).searchParams.get("live") === "1";
    if (!live) return ok(publicStatus());
    guard(req, "status-live", 6);
    return ok({ ...publicStatus(), live: await liveChecks() });
  } catch (e) {
    return fail(e, "status");
  }
}

import { analyzeTranscript } from "@/server/ai/analyze";
import { AiError } from "@/server/ai/errors";
import { guard } from "@/server/ai/guard";
import { fail, ok } from "@/server/ai/http";

/**
 * POST JSON: { transcript, subjectName?, syllabusTopics?: [{id,name,unit?}], syllabusText? }
 * Requires `Authorization: Bearer <AI_ACCESS_TOKEN>`. Returns an AI SUGGESTION only; it never updates progress or a database.
 */
export async function POST(req: Request) {
  try {
    guard(req, "analyze", 20);
    if (Number(req.headers.get("content-length") ?? 0) > 1_500_000) throw new AiError("invalid_request", 413, "Request body is too large.");
    let body: unknown;
    try { body = await req.json(); } catch { throw new AiError("invalid_request", 400, "Body must be valid JSON."); }
    return ok({ analysis: await analyzeTranscript(body) });
  } catch (e) {
    return fail(e, "analyze");
  }
}

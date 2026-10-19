import { guard } from "@/server/ai/guard";
import { MAX_AUDIO_BYTES } from "@/server/ai/audio";
import { AiError } from "@/server/ai/errors";
import { fail, ok } from "@/server/ai/http";
import { transcribeAudio } from "@/server/ai/transcribe";

/**
 * POST multipart/form-data: `audio` (file, required), `language` (optional ISO-639-1).
 * Requires `Authorization: Bearer <AI_ACCESS_TOKEN>`. Speech-to-text only; no progress decisions, no database.
 */
export async function POST(req: Request) {
  try {
    guard(req, "transcribe", 10);
    if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data"))
      throw new AiError("invalid_request", 400, "Send multipart/form-data with an \"audio\" file field.");
    if (Number(req.headers.get("content-length") ?? 0) > MAX_AUDIO_BYTES + 1_000_000)
      throw new AiError("audio_too_large", 413, "Audio exceeds the 25 MB limit. Split the lecture into shorter parts.");

    let form: FormData;
    try { form = await req.formData(); } catch { throw new AiError("invalid_request", 400, "Could not read the multipart body."); }
    const file = form.get("audio");
    if (!(file instanceof File)) throw new AiError("invalid_request", 400, "Missing \"audio\" file field.");
    const lang = form.get("language");

    const r = await transcribeAudio({ bytes: new Uint8Array(await file.arrayBuffer()), filename: file.name, mimeType: file.type, language: typeof lang === "string" && lang ? lang : undefined });
    return ok({
      transcript: { text: r.text, empty: r.empty },
      provenance: { provider: r.provider, model: r.model, kind: "machine_transcript", verified: false },
      ...(r.empty ? { warning: "No speech was detected in the audio." } : {}),
    });
  } catch (e) {
    return fail(e, "transcribe");
  }
}

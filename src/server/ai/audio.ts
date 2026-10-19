import "server-only";
import { AiError } from "./errors";

/** OpenAI audio transcription limits (documented): 25 MB per file; flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const EXTS = new Set(["flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "ogg", "oga", "wav", "webm"]);
const MIME_EXT: Record<string, string> = {
  "audio/webm": "webm", "video/webm": "webm", "audio/mp4": "mp4", "video/mp4": "mp4", "audio/x-m4a": "m4a", "audio/m4a": "m4a",
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mpga": "mpga", "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
  "audio/ogg": "ogg", "application/ogg": "ogg", "audio/flac": "flac", "audio/x-flac": "flac",
};
const MIME_OUT: Record<string, string> = { webm: "audio/webm", mp4: "audio/mp4", m4a: "audio/mp4", mp3: "audio/mpeg", mpeg: "audio/mpeg", mpga: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", flac: "audio/flac" };

const ascii = (b: Uint8Array, from: number, s: string) => s.split("").every((c, i) => b[from + i] === c.charCodeAt(0));

/** Checks the real file signature so a renamed non-audio file is never forwarded to a provider. */
function signatureMatches(b: Uint8Array, ext: string): boolean {
  if (b.length < 12) return false;
  switch (ext) {
    case "webm": return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    case "wav": return ascii(b, 0, "RIFF") && ascii(b, 8, "WAVE");
    case "ogg": case "oga": return ascii(b, 0, "OggS");
    case "flac": return ascii(b, 0, "fLaC");
    case "mp4": case "m4a": return ascii(b, 4, "ftyp");
    case "mp3": case "mpeg": case "mpga": return ascii(b, 0, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    default: return false;
  }
}

export function validateAudio(bytes: Uint8Array, filename?: string, mimeType?: string): { ext: string; mime: string } {
  if (bytes.byteLength === 0) throw new AiError("invalid_request", 400, "The audio file is empty.");
  if (bytes.byteLength > MAX_AUDIO_BYTES) throw new AiError("audio_too_large", 413, "Audio exceeds the 25 MB limit. Split the lecture into shorter parts.");
  const fromName = filename?.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  const fromMime = MIME_EXT[(mimeType ?? "").split(";")[0].trim().toLowerCase()] ?? "";
  const ext = EXTS.has(fromName) ? fromName : fromMime;
  if (!ext || !EXTS.has(ext)) throw new AiError("unsupported_audio", 415, "Unsupported audio type. Use flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav or webm.");
  if (!signatureMatches(bytes, ext)) throw new AiError("unsupported_audio", 415, "The file contents do not match a supported audio format.");
  return { ext, mime: MIME_OUT[ext] };
}

#!/usr/bin/env node
// Manual provider tests against a running dev/prod server. No Supabase needed.
//   node --env-file=.env.local scripts/test-ai.mjs status
//   node --env-file=.env.local scripts/test-ai.mjs live                 (checks both keys/models; sends no lecture data)
//   node --env-file=.env.local scripts/test-ai.mjs transcribe [file]    (OpenAI only; default = 1s generated silent WAV)
//   node --env-file=.env.local scripts/test-ai.mjs analyze              (Gemini only; sample transcript, no audio)
import { readFile } from "node:fs/promises";

const base = process.env.AI_BASE_URL ?? "http://localhost:3000";
const auth = { Authorization: `Bearer ${process.env.AI_ACCESS_TOKEN ?? ""}` };
const [cmd = "status", arg] = process.argv.slice(2);

const silentWav = () => { // 1 s, 16 kHz, mono, 16-bit PCM
  const n = 16000, h = Buffer.alloc(44), d = Buffer.alloc(n * 2);
  h.write("RIFF", 0); h.writeUInt32LE(36 + d.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(16000, 24); h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(d.length, 40);
  return Buffer.concat([h, d]);
};
const show = async (res) => { console.log(res.status, JSON.stringify(await res.json(), null, 2)); process.exitCode = res.ok ? 0 : 1; };

if (cmd === "status") await show(await fetch(`${base}/api/ai/status`));
else if (cmd === "live") await show(await fetch(`${base}/api/ai/status?live=1`, { headers: auth }));
else if (cmd === "transcribe") {
  const bytes = arg ? await readFile(arg) : silentWav();
  const name = arg ? arg.split(/[\\/]/).pop() : "silence.wav";
  const form = new FormData(); form.append("audio", new File([bytes], name));
  await show(await fetch(`${base}/api/ai/transcribe`, { method: "POST", headers: auth, body: form }));
} else if (cmd === "analyze") {
  const body = {
    subjectName: "Chemistry",
    transcript: "Today I completed ionic bonding and started covalent bonding. I explained electron transfer, the octet rule, and Lewis structures. We solved three examples. Covalent bonding is approximately 40% complete.",
    syllabusTopics: [{ id: "t-ionic", name: "Ionic Bonding", unit: "Chemical Bonding" }, { id: "t-cov", name: "Covalent Bonding", unit: "Chemical Bonding" }, { id: "t-metal", name: "Metallic Bonding", unit: "Chemical Bonding" }],
  };
  await show(await fetch(`${base}/api/ai/analyze`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body) }));
} else console.log("Usage: test-ai.mjs status | live | transcribe [file] | analyze");

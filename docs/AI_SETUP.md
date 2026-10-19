# AI services setup (OpenAI + Gemini)

Phase scope: API configuration plus two service functions. No database, no Supabase, no frontend wiring.

```
Faculty recording ──► OpenAI transcription ──► Gemini analysis ──► Faculty review ──► DB update (later phase)
   (future UI)         POST /api/ai/transcribe    POST /api/ai/analyze   (future UI)       (not built)
```

| Provider | Receives | Never receives | Code |
|---|---|---|---|
| OpenAI | the lecture **audio** only | transcripts, syllabus | `src/server/ai/transcribe.ts` |
| Gemini | the transcript **text** (+ optional syllabus) only | audio | `src/server/ai/analyze.ts` |

The same lecture is never sent to both providers as audio. Neither provider decides course progress or writes anywhere.

## Configure

```bash
npm install                      # openai, @google/genai, zod, server-only are already in package.json
cp .env.example .env.local       # then fill in real values; .env.local is gitignored
openssl rand -base64 32          # use the output as AI_ACCESS_TOKEN
```

Variables (all server-only, none are `NEXT_PUBLIC_*`): `OPENAI_API_KEY`, `GEMINI_API_KEY`, `AI_ACCESS_TOKEN`,
optional `OPENAI_TRANSCRIBE_MODEL` (default `whisper-1`), `GEMINI_MODEL` (default `gemini-2.5-flash`, must exist for your key),
`OPENAI_TIMEOUT_MS`, `GEMINI_TIMEOUT_MS`.

## Endpoints

All except the plain status call require `Authorization: Bearer <AI_ACCESS_TOKEN>`. If `AI_ACCESS_TOKEN` is unset the endpoints return 503 `disabled` (fail closed).
The shared token is a stop-gap because the prototype has no real authentication. When Supabase Auth lands, replace `guard()` in `src/server/ai/guard.ts` with a session + faculty-role check and delete the shared token. A browser must never hold this token.

| Endpoint | Purpose |
|---|---|
| `GET /api/ai/status` | Which providers are configured, plus model names. Booleans only. |
| `GET /api/ai/status?live=1` | Also checks each key and model with a metadata lookup. Sends no lecture data. |
| `POST /api/ai/transcribe` | multipart `audio` (+ optional `language`, e.g. `en`) -> `{ transcript: { text, empty }, provenance }` |
| `POST /api/ai/analyze` | JSON `{ transcript, subjectName?, syllabusTopics?: [{id,name,unit?}], syllabusText? }` -> `{ analysis }` |

Audio limits (OpenAI): 25 MB per file; flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm. Longer lectures must be split into parts before upload (not implemented yet). Browser recordings (`audio/webm`, `audio/mp4`) are accepted.

`analysis` is always `status: "ai_suggestion"`, `verified: false`. Safeguards applied in code, not trusted to the model:
unknown topic ids are discarded; quoted evidence is checked against the real transcript; topics that were only mentioned never become progress updates; every update has `requiresVerification: true`; low-confidence or unsupported items are listed in `needsFacultyVerification`.

Errors are `{ ok:false, error:{ code, message } }` with static messages (provider text is never returned because it can echo key fragments):
`unauthorized 401`, `disabled 503`, `invalid_request 400`, `audio_too_large 413`, `unsupported_audio 415`, `rate_limited 429`, `quota_exhausted 503`, `provider_auth 502`, `model_unavailable 502`, `provider_timeout 504`, `provider_unavailable 502`, `invalid_model_output 502`.

## Test without Supabase

```bash
npm run test:ai                                   # offline unit tests, fake provider clients, no network, no keys
npm run build && npx next start -p 3000           # or: npm run dev
node --env-file=.env.local scripts/test-ai.mjs status
node --env-file=.env.local scripts/test-ai.mjs live              # checks both keys/models
node --env-file=.env.local scripts/test-ai.mjs transcribe        # OpenAI only; 1 s generated silent WAV (or pass a file path)
node --env-file=.env.local scripts/test-ai.mjs analyze           # Gemini only; sample transcript, no audio
```

## Privacy and data retention (checked 2026-10-14; re-check before production)

- **We write nothing to disk.** Audio is held in memory for the request and handed to the SDK as an in-memory file; there is no temp file to clean up, no permanent audio storage and no database. Transcripts and audio are not logged (logs contain route, error code and HTTP status only).
- **That does not control provider-side copies.** What each provider keeps is set by their policy and your account terms:
  - **OpenAI** ([your-data](https://developers.openai.com/api/docs/guides/your-data)): API data is not used for training by default. Abuse-monitoring logs are kept up to 30 days by default; Zero Data Retention and Modified Abuse Monitoring need prior approval from OpenAI. The page's endpoint table lists `/v1/audio/transcriptions` as ZDR-eligible with abuse-monitoring and application-state retention of "None". Confirm that table, and what applies to your organisation, before relying on it.
  - **Gemini** ([API terms](https://ai.google.dev/gemini-api/terms)): on **Unpaid Services** Google uses submitted content to improve its products and reviewers may read it, and the terms say not to submit sensitive, confidential or personal information. On **Paid Services** (Cloud project with active billing) prompts and responses are not used to improve products, but are logged for a limited period for abuse detection (the terms give no number of days). Users and audiences must be 18+.
- **Recommendation:** classroom recordings contain voices, names and possibly minors' data. Use a paid, billing-enabled Gemini project and an OpenAI account whose retention terms you have reviewed, obtain recording consent, and get institutional/legal sign-off before using real lectures. Using only the free tiers for real classes is not advised.
- Rate limiting is in-memory per server instance; use a shared store when running multiple instances. `X-Forwarded-For` can be spoofed by direct clients, so the bearer token is the real gate.

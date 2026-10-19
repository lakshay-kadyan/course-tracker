# Mirai Academic OS

**AI-Powered Academic Operating System for Mirai School of Technology.**
One connected workflow links the planned curriculum to verified classroom delivery, student practice, and a clear forecast for management, so every course can be seen finishing on time before the exam finds out.

```
Plan → Teach → Capture → Verify → Measure → Learn → Practice → Predict
```

## Team

| Member | Role | Responsibility |
|---|---|---|
| **Lakshay** | Team Leader and Backend | Project lead; Supabase database, authentication, access rules (row-level security), server setup |
| **Rochna** | Frontend | User interface for the four role experiences, dashboards and design |
| **Manthan** | AI Integration | Speech-to-text and lecture analysis with Gemini, AI endpoints and safeguards |

## What it does

Four role-based experiences, each with a dark, premium interface:

| Role | What they can do |
|---|---|
| **Admin / Program Manager** | Institution-wide overview, campus and batch setup, faculty management, curriculum and lesson plans, weekly timetable with clash detection, holidays, CSV import and export |
| **Campus Manager** | Course health for their campus, faculty progress, warnings, subject detail and weekly report |
| **Faculty** | Log classes by voice or text, review and verify each session record, history of sessions |
| **Student** | Verified lecture notes, practice quizzes, exam readiness |

### Academic health engine

Course status is calculated by fixed, deterministic rules, not by AI, so the numbers are consistent and checkable:

| Status | Meaning |
|---|---|
| **ON TRACK** | Buffer ratio of 1.15 or more |
| **TIGHT** | Buffer ratio of 1.00 or more |
| **DANGER** | Buffer ratio below 1.00 |
| **COMPLETE** | All topics finished |

The engine uses topic progress, remaining teaching hours from the timetable, holidays and the target date (`src/lib/engine.ts`).

### AI assist (Gemini)

- **Transcription:** a faculty recording is converted to text (`POST /api/ai/transcribe`).
- **Analysis:** the transcript is matched against the syllabus and suggests which topics were taught and how far (`POST /api/ai/analyze`).
- **AI only suggests.** Every suggestion is marked `ai_suggestion` and unverified. Nothing changes course progress until a faculty member reviews and confirms it. Quoted evidence is checked against the real transcript, unknown topics are discarded, and topics that were only mentioned never become progress.

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide icons
- **Backend:** Supabase (PostgreSQL, Auth, row-level security), `@supabase/supabase-js`
- **AI:** Google Gemini via `@google/genai` (OpenAI Whisper is supported as an optional transcription provider), request validation with `zod`

## Two modes

The app runs in one of two modes, chosen by environment variables:

- **Local demo** (no Supabase variables): sample data stored in the browser, demo role switcher. Good for a quick look.
- **Supabase mode** (both Supabase variables set): real sign-in, data stored in your database, and what each person can see and change is enforced by the database.

## Getting started

Requirements: Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .env.local     # then fill in the values (see below)
npm run dev                    # http://localhost:3000
```

### Environment variables (`.env.local`, never commit real values)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase publishable key (public). `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` also works |
| `GEMINI_API_KEY` | Gemini key, server only |
| `GEMINI_MODEL` | Analysis model, for example `gemini-flash-latest` |
| `TRANSCRIBE_PROVIDER` | `gemini` (or `openai`) |
| `GEMINI_TRANSCRIBE_MODEL` | Transcription model, for example `gemini-flash-latest` |
| `AI_ACCESS_TOKEN` | Long random string that protects the AI endpoints (temporary until AI calls use the signed-in Supabase session) |

Only the two `NEXT_PUBLIC_SUPABASE_*` values may reach the browser. Never put the Supabase service-role key, the Gemini key or the AI token in a `NEXT_PUBLIC_` variable.

## Database setup (Supabase)

Use a new, empty Supabase project. Full instructions are in [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md). In short, in the Supabase SQL Editor run these in order:

1. [`supabase/schema.sql`](supabase/schema.sql): creates the 13 tables, access rules and the `confirm_session` function
2. [`supabase/seed.sql`](supabase/seed.sql): loads sample data (3 campuses, 4 batches, 11 faculty, 14 subjects, 138 topics, 12 sessions)
3. Create users under Authentication, then run [`supabase/link-users.sql`](supabase/link-users.sql) to give each user a role

`schema.sql` refuses to run if a table with one of its names already exists and was not created by this app, so it will not overwrite other data.

### Who can see and change what (enforced by the database)

- **Admin:** everything
- **Manager:** their own campus
- **Faculty:** their own subjects; they confirm sessions only for those subjects
- **Student:** their own batch, verified sessions only, and their own quiz attempts
- Students read teacher names through a limited view with no emails or capacity
- Topic progress only ever goes up, and nobody can change their own role from the app

## Testing

```bash
npm run test:ai                                                   # offline AI tests, no keys or network
TEST_PASSWORD='<user password>' node --env-file=.env.local scripts/test-db.mjs   # live database checks for all four roles
node --env-file=.env.local scripts/test-ai.mjs live               # checks the Gemini key and model
node --env-file=.env.local scripts/test-ai.mjs transcribe <file>  # voice to text (WAV or MP3)
node --env-file=.env.local scripts/test-ai.mjs analyze            # lecture analysis
```

More detail on the AI endpoints, limits and privacy is in [`docs/AI_SETUP.md`](docs/AI_SETUP.md).

## Project structure

```
src/
  app/                 Pages and API routes (login, role dashboards, /api/ai/*)
  components/          Shared UI, app shell, lecture recorder
  features/            admin, manager, faculty, student screens
  lib/                 Types, sample data, health engine, store, Supabase client
  server/ai/           Server-only Gemini/OpenAI code (config, guard, transcribe, analyze)
supabase/              schema.sql, seed.sql, link-users.sql
scripts/               Test and seed-generation scripts
docs/                  AI and Supabase setup guides
```

## Status

| Area | State |
|---|---|
| Four role interfaces and health engine | Done |
| Supabase database, login and role-based access | Done, with a live test script |
| Gemini transcription and analysis endpoints | Done, verified from the command line |
| Connecting the Log Class screen to the AI endpoints | In progress. The screen still uses the built-in sample parser |
| Real-date clock | In progress. The dashboards use a fixed demo date of 12 Oct 2026 |
| Deployment | Not started |

## Known limits and notes

- Gemini transcription accepts about 14 MB of audio per clip. Longer lectures need to be split.
- Gemini can invent text for silent audio, which is why faculty always review before anything is saved.
- The free Gemini tier may use submitted content to improve Google products. Use a paid, billing-enabled project and get recording consent before using real lectures.
- Rate limiting is held in server memory and is not shared across several server instances.
- Users are created by an administrator in Supabase. There is no sign-up screen yet.

## Security

- Secrets live only in `.env.local`, which is git-ignored. `.env.example` contains placeholders only.
- AI keys are used only on the server and are never returned to the browser or written to logs.
- Audio is processed in memory and is not stored. Transcripts are not logged.
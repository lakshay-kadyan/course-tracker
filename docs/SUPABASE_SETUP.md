# Supabase setup (database + login)

Without the two `NEXT_PUBLIC_SUPABASE_*` variables the app is the local demo (sample data in the browser). With them, sign-in is real and data lives in Supabase. Row-level security in the database decides what each role can see and change.

## 1. Environment (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>      # PUBLISHABLE_KEY as the variable name also works
```
Both are public by design. Do not use the service-role / secret key anywhere in this app. Restart `npm run dev` after editing.

## 2. Create the tables (SQL Editor)
1. Run **`supabase/schema.sql`**. It stops without changing anything if a table with one of our names (campuses, batches, faculty, subjects, topics, slots, holidays, sessions, session_topics, quiz_attempts, notifications, notification_reads, profiles) already exists and was not created by this app.
2. Run **`supabase/seed.sql`** (the sample data). Both files are safe to re-run.

## 3. Create the four test users
Supabase > Authentication > Users > Add user > "Create new user", tick **Auto Confirm User**. Use the same password for all four (used by the test script):

| Email | Role |
|---|---|
| neha.kapoor@mirai.demo | admin |
| rohan.iyer@mirai.demo | campus manager (Bengaluru) |
| priya.nair@mirai.demo | faculty (Chemistry) |
| aarav.mehta@mirai.demo | student (BLR-CS-2026 A) |

Then run **`supabase/link-users.sql`**. It should list 4 rows. (If Supabase refuses the `.demo` addresses, use other emails and edit the first column in that file.)

## 4. Test
```
TEST_PASSWORD='your-password' node --env-file=.env.local scripts/test-db.mjs
```
It signs in as each role and checks visibility and permissions (and cleans up its test rows). Then `npm run dev`, sign in at /login, and in the faculty view log a class: the Chemistry progress changes for manager, admin and student too.

## Access rules (enforced by the database)
- Admin: everything. Manager: own campus. Faculty: own subjects; confirms sessions only for those. Student: own batch, verified sessions only, own quiz attempts.
- Students read faculty names through `faculty_public` (no emails or capacity).
- Progress only ever rises (`confirm_session`). Nobody can change their own role from the browser.

## Not connected yet
The Log Class page still uses the built-in sample parser. Connecting it to `/api/ai/*` is the next step and will use the signed-in Supabase session instead of the shared `AI_ACCESS_TOKEN`.

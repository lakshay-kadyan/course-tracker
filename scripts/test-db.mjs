#!/usr/bin/env node
// Live database test against YOUR Supabase project. It signs in as the four test users and checks what each role can see and do.
// Run:  TEST_PASSWORD='the-password-you-set' node --env-file=.env.local scripts/test-db.mjs
// It uses only the public (publishable) key, exactly like the browser does. It never needs the service-role key.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_KEY;
const password = process.env.TEST_PASSWORD;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"); process.exit(2); }
if (!password) { console.error("Set TEST_PASSWORD to the password you gave the four test users."); process.exit(2); }

const USERS = { admin: "neha.kapoor@mirai.demo", manager: "rohan.iyer@mirai.demo", faculty: "priya.nair@mirai.demo", student: "aarav.mehta@mirai.demo" };
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  <- " + extra}`); };
const count = async (c, table, q = (x) => x) => { const r = await q(c.from(table).select("*", { count: "exact", head: true })); return r.error ? `error: ${r.error.message}` : r.count; };

async function login(role) {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: USERS[role], password });
  if (error) { ok(`${role} can sign in`, false, error.message); return null; }
  ok(`${role} can sign in`, true);
  return c;
}

const anon = createClient(url, key, { auth: { persistSession: false } });
ok("signed-out visitor sees no subjects", (await count(anon, "subjects")) === 0, "data is exposed without login");
ok("signed-out visitor cannot read profiles", (await count(anon, "profiles")) === 0);

const admin = await login("admin"), manager = await login("manager"), faculty = await login("faculty"), student = await login("student");
if (![admin, manager, faculty, student].every(Boolean)) { console.log(`\nStopped: some users could not sign in. Check the users exist, are confirmed, and use this password.\n${pass} passed, ${fail} failed`); process.exit(1); }

const own = async (c) => (await c.from("profiles").select("role,faculty_id,batch_id,campus_id")).data?.[0];
ok("profiles are linked to roles", (await own(admin))?.role === "admin" && (await own(manager))?.role === "manager" && (await own(faculty))?.role === "faculty" && (await own(student))?.role === "student", "run supabase/link-users.sql");

ok("seed data is loaded (14 subjects for admin)", (await count(admin, "subjects")) === 14, "run supabase/seed.sql");
ok("manager sees only their campus (8 subjects)", (await count(manager, "subjects")) === 8);
ok("faculty sees only their own subject (1)", (await count(faculty, "subjects")) === 1);
ok("student sees only their batch (5 subjects)", (await count(student, "subjects")) === 5);
ok("student cannot read the faculty table", (await count(student, "faculty")) === 0);
ok("student can read the faculty directory", (await count(student, "faculty_public")) === 11);
ok("student sees no pending/missed sessions", (await count(student, "sessions", (q) => q.neq("status", "verified"))) === 0);

const bad = await manager.from("subjects").insert({ id: "zz-test", code: "Z", name: "Z", campus_id: "blr", batch_id: "b1", start_date: "2026-01-01", target_date: "2026-02-01", exam_date: "2026-03-01" });
ok("manager cannot create subjects", !!bad.error);
const stuUp = await student.from("topics").update({ pct: 100 }).eq("subject_id", "s-chem").select();
ok("student cannot change topic progress", !stuUp.error && (stuUp.data?.length ?? 0) === 0);
const roleUp = await faculty.from("profiles").update({ role: "admin" }).select();
ok("faculty cannot give themselves another role", !!roleUp.error);

// Faculty confirms a session for their own subject; progress goes up and never down. We restore everything afterwards.
const id = `test-${Date.now()}`;
const topicPct = async (c) => Number((await c.from("topics").select("pct").eq("subject_id", "s-chem").eq("id", "covalent-bonding").single()).data?.pct);
const before = await topicPct(faculty);
const conf = await faculty.rpc("confirm_session", { p: { id, subjectId: "s-chem", date: "2026-10-12", status: "verified", source: "manual", hours: 1, summary: "Database test", activities: "test", homework: "", topics: [{ topicId: "covalent-bonding", pct: Math.min(100, before + 5) }] } });
ok("faculty can confirm a session for their own subject", !conf.error, conf.error?.message);
const after = await topicPct(faculty);
ok(`progress rose (${before} -> ${after})`, after === Math.min(100, before + 5));
const down = await faculty.rpc("confirm_session", { p: { id: id + "b", subjectId: "s-chem", date: "2026-10-13", status: "verified", topics: [{ topicId: "covalent-bonding", pct: 1 }] } });
ok("progress never goes down", !down.error && (await topicPct(faculty)) === after);
const other = await faculty.rpc("confirm_session", { p: { id: id + "c", subjectId: "s-math", date: "2026-10-12", status: "verified", topics: [] } });
ok("faculty cannot confirm another teacher's subject", !!other.error);
const stuConf = await student.rpc("confirm_session", { p: { id: id + "d", subjectId: "s-chem", date: "2026-10-12", status: "verified", topics: [] } });
ok("student cannot confirm sessions", !!stuConf.error);
ok("student can see the verified session", (await student.from("sessions").select("id").eq("id", id)).data?.length === 1);

// Quiz attempt by the student
const att = await student.from("quiz_attempts").insert({ id: `a-${id}`, date: "2026-10-12", subject_id: "s-chem", score: 4, total: 5, answers: [] });
ok("student can save a quiz attempt", !att.error, att.error?.message);
ok("manager can see that attempt", (await manager.from("quiz_attempts").select("id").eq("id", `a-${id}`)).data?.length === 1);

// Clean up our test rows (admin only) and put progress back.
await admin.from("sessions").delete().in("id", [id, id + "b"]);
await admin.from("quiz_attempts").delete().eq("id", `a-${id}`);
await admin.from("topics").update({ pct: before }).eq("subject_id", "s-chem").eq("id", "covalent-bonding");
await admin.from("notifications").delete().eq("title", "Session verified").eq("body", "Database test");
ok("test data cleaned up", (await topicPct(admin)) === before);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attempt, Batch, Campus, Faculty, Holiday, Notification, Persona, Profile, Role, Session, Slot, Subject, Topic } from "../types";

/* Row <-> app-type mapping and all database reads/writes. Row-level security does the real access control;
   the checks in the app only keep the interface tidy. */

type Row = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => Number(v ?? 0);
const date = (v: unknown) => s(v).slice(0, 10);
const orThrow = <T,>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return (r.data ?? ([] as unknown)) as T;
};

export function relativeTime(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (Number.isNaN(m)) return "";
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

export interface Loaded {
  me: Persona & { role: Role };
  profile: Profile;
  campuses: Campus[]; batches: Batch[]; faculty: Faculty[]; subjects: Subject[]; holidays: Holiday[];
  sessions: Session[]; attempts: Attempt[]; notifications: Notification[];
}

/** Loads the signed-in user's profile. Returns null when the account has no profile row yet. */
export async function loadProfile(db: SupabaseClient, userId: string): Promise<(Persona & { role: Role; profile: Profile }) | null> {
  const r = await db.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (r.error) throw new Error(`profile: ${r.error.message}`);
  const p = r.data as Row | null;
  if (!p) return null;
  const profile: Profile = { name: s(p.name), email: s(p.email), emailAlerts: Boolean(p.email_alerts), weeklyDigest: Boolean(p.weekly_digest) };
  return {
    role: p.role as Role, name: s(p.name), title: s(p.title), email: s(p.email),
    campusId: p.campus_id ? s(p.campus_id) : undefined, facultyId: p.faculty_id ? s(p.faculty_id) : undefined, batchId: p.batch_id ? s(p.batch_id) : undefined,
    profile,
  };
}

/** Loads everything the signed-in role is allowed to see. The database filters rows; we never filter for security here. */
export async function loadAll(db: SupabaseClient, userId: string): Promise<Loaded | null> {
  const me = await loadProfile(db, userId);
  if (!me) return null;
  const staffFaculty = me.role === "admin" || me.role === "manager";
  const [campuses, batches, faculty, subjects, topics, slots, holidays, sessions, sessionTopics, attempts, notifications, reads] = await Promise.all([
    db.from("campuses").select("*").order("id"),
    db.from("batches").select("*").order("id"),
    // Students and faculty read the safe directory view (no emails or capacity); staff read the full table.
    db.from(staffFaculty ? "faculty" : "faculty_public").select("*").order("id"),
    db.from("subjects").select("*").order("id"),
    db.from("topics").select("*").order("position"),
    db.from("slots").select("*").order("day").order("start"),
    db.from("holidays").select("*").order("date"),
    db.from("sessions").select("*").order("date", { ascending: false }),
    db.from("session_topics").select("*"),
    db.from("quiz_attempts").select("*").order("date", { ascending: false }),
    db.from("notifications").select("*").order("created_at", { ascending: false }),
    db.from("notification_reads").select("notification_id"),
  ]);

  const topicsBy = new Map<string, Topic[]>();
  orThrow<Row[]>(topics, "topics").forEach((t) => {
    const list = topicsBy.get(s(t.subject_id)) ?? [];
    list.push({ id: s(t.id), unit: s(t.unit), name: s(t.name), plannedHours: num(t.planned_hours), pct: num(t.pct), examScope: Boolean(t.exam_scope) });
    topicsBy.set(s(t.subject_id), list);
  });
  const slotsBy = new Map<string, Slot[]>();
  orThrow<Row[]>(slots, "slots").forEach((x) => {
    const list = slotsBy.get(s(x.subject_id)) ?? [];
    list.push({ id: s(x.id), day: num(x.day), start: s(x.start), hours: num(x.hours) });
    slotsBy.set(s(x.subject_id), list);
  });
  const stBy = new Map<string, { topicId: string; pct: number }[]>();
  orThrow<Row[]>(sessionTopics, "session topics").forEach((x) => {
    const list = stBy.get(s(x.session_id)) ?? [];
    list.push({ topicId: s(x.topic_id), pct: num(x.pct) });
    stBy.set(s(x.session_id), list);
  });
  const readIds = new Set(orThrow<Row[]>(reads, "notification reads").map((r) => s(r.notification_id)));

  return {
    me: { role: me.role, name: me.name, title: me.title, email: me.email, campusId: me.campusId, facultyId: me.facultyId, batchId: me.batchId },
    profile: me.profile,
    campuses: orThrow<Row[]>(campuses, "campuses").map((c) => ({ id: s(c.id), name: s(c.name), city: s(c.city), head: s(c.head), students: num(c.students) })),
    batches: orThrow<Row[]>(batches, "batches").map((b) => ({ id: s(b.id), name: s(b.name), campusId: s(b.campus_id), semester: s(b.semester), students: num(b.students), startDate: date(b.start_date), endDate: date(b.end_date) })),
    faculty: orThrow<Row[]>(faculty, "faculty").map((f) => ({ id: s(f.id), name: s(f.name), email: s(f.email), campusId: s(f.campus_id), weeklyCapacity: num(f.weekly_capacity), specialty: s(f.specialty) })),
    subjects: orThrow<Row[]>(subjects, "subjects").map((x) => ({
      id: s(x.id), code: s(x.code), name: s(x.name), campusId: s(x.campus_id), batchId: s(x.batch_id), facultyId: s(x.faculty_id),
      startDate: date(x.start_date), targetDate: date(x.target_date), examDate: date(x.exam_date),
      slots: slotsBy.get(s(x.id)) ?? [], topics: topicsBy.get(s(x.id)) ?? [],
    })),
    holidays: orThrow<Row[]>(holidays, "holidays").map((h) => ({ id: s(h.id), date: date(h.date), name: s(h.name), campusId: s(h.campus_id) })),
    sessions: orThrow<Row[]>(sessions, "sessions").map((x) => ({
      id: s(x.id), subjectId: s(x.subject_id), facultyId: s(x.faculty_id), date: date(x.date), status: x.status as Session["status"], source: x.source as Session["source"],
      hours: num(x.hours), topics: stBy.get(s(x.id)) ?? [], activities: s(x.activities), homework: s(x.homework), summary: s(x.summary),
      notes: x.notes ? (x.notes as Session["notes"]) : undefined,
    })),
    attempts: orThrow<Row[]>(attempts, "quiz attempts").map((a) => ({ id: s(a.id), date: date(a.date), subjectId: s(a.subject_id), score: num(a.score), total: num(a.total), answers: (a.answers as Attempt["answers"]) ?? [] })),
    notifications: orThrow<Row[]>(notifications, "notifications").map((n) => ({
      id: s(n.id), title: s(n.title), body: s(n.body), time: relativeTime(s(n.created_at)), read: readIds.has(s(n.id)), roles: (n.roles as Role[]) ?? [],
    })),
  };
}

/* ---------------- writes ---------------- */
const fail = (e: { message: string } | null, what: string) => { if (e) throw new Error(`${what}: ${e.message}`); };

export async function saveSubjectRows(db: SupabaseClient, sub: Subject) {
  fail((await db.from("subjects").upsert({
    id: sub.id, code: sub.code, name: sub.name, campus_id: sub.campusId, batch_id: sub.batchId, faculty_id: sub.facultyId || null,
    start_date: sub.startDate, target_date: sub.targetDate, exam_date: sub.examDate,
  })).error, "save subject");
  // Topics and slots are replaced as a set: upsert what exists, delete what the user removed.
  const tIds = sub.topics.map((t) => t.id);
  fail((await db.from("topics").upsert(sub.topics.map((t, i) => ({ subject_id: sub.id, id: t.id, unit: t.unit, name: t.name, planned_hours: t.plannedHours, pct: t.pct, exam_scope: t.examScope, position: i })))).error, "save topics");
  const delT = db.from("topics").delete().eq("subject_id", sub.id);
  fail((await (tIds.length ? delT.not("id", "in", `(${tIds.map((i) => `"${i.replace(/"/g, "")}"`).join(",")})`) : delT)).error, "remove topics");
  const sIds = sub.slots.map((x) => x.id);
  if (sub.slots.length) fail((await db.from("slots").upsert(sub.slots.map((x) => ({ subject_id: sub.id, id: x.id, day: x.day, start: x.start, hours: x.hours })))).error, "save slots");
  const delS = db.from("slots").delete().eq("subject_id", sub.id);
  fail((await (sIds.length ? delS.not("id", "in", `(${sIds.map((i) => `"${i.replace(/"/g, "")}"`).join(",")})`) : delS)).error, "remove slots");
}

export async function saveRecord(db: SupabaseClient, c: "campuses" | "batches" | "faculty" | "holidays", r: Row) {
  const map: Record<typeof c, Row> = {
    campuses: { id: r.id, name: r.name, city: r.city, head: r.head, students: r.students },
    batches: { id: r.id, name: r.name, campus_id: r.campusId, semester: r.semester, students: r.students, start_date: r.startDate, end_date: r.endDate },
    faculty: { id: r.id, name: r.name, email: r.email, campus_id: r.campusId, weekly_capacity: r.weeklyCapacity, specialty: r.specialty },
    holidays: { id: r.id, date: r.date, name: r.name, campus_id: r.campusId },
  };
  fail((await db.from(c).upsert(map[c])).error, `save ${c}`);
}

export async function removeRecord(db: SupabaseClient, c: string, id: string) {
  fail((await db.from(c).delete().eq("id", id)).error, `remove ${c}`);
}

export async function confirmSession(db: SupabaseClient, x: Session) {
  fail((await db.rpc("confirm_session", { p: x })).error, "save session");
}

export async function insertAttempt(db: SupabaseClient, a: Attempt) {
  fail((await db.from("quiz_attempts").insert({ id: a.id, date: a.date, subject_id: a.subjectId, score: a.score, total: a.total, answers: a.answers })).error, "save quiz attempt");
}

export async function markNotificationsRead(db: SupabaseClient, ids: string[]) {
  if (!ids.length) return;
  fail((await db.from("notification_reads").upsert(ids.map((notification_id) => ({ notification_id })), { onConflict: "user_id,notification_id", ignoreDuplicates: true })).error, "mark read");
}

export async function saveProfileRow(db: SupabaseClient, userId: string, p: Profile) {
  fail((await db.from("profiles").update({ name: p.name, email: p.email, email_alerts: p.emailAlerts, weekly_digest: p.weeklyDigest }).eq("user_id", userId)).error, "save profile");
}

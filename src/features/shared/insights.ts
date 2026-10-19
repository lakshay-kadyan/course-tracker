import type { Holiday, Session, Subject } from "@/lib/types";
import { DEMO_TODAY, lessonPlanDates, type SubjectMetrics } from "@/lib/engine";
import { diffDays, fmtDate } from "@/lib/utils";

export interface Item { subject: Subject; m: SubjectMetrics }
export interface Warning { id: string; kind: "overdue" | "missed" | "pace" | "hours" | "exam" | "pending"; severity: "high" | "medium"; subjectId: string; title: string; detail: string }
export const WARNING_LABEL: Record<Warning["kind"], string> = { overdue: "Overdue topics", missed: "Missed session", pace: "Slow pace", hours: "Insufficient hours", exam: "Exam risk", pending: "Unverified record" };

export function buildWarnings(items: Item[], sessions: Session[], holidays: Holiday[]): Warning[] {
  const out: Warning[] = [];
  const ids = new Set(items.map((i) => i.subject.id));
  items.forEach(({ subject: s, m }) => {
    if (m.health === "COMPLETE") return;
    const plan = lessonPlanDates(s, holidays);
    const overdue = s.topics.filter((t) => t.pct < 100 && (diffDays(plan[t.id], DEMO_TODAY) ?? 0) > 0);
    if (overdue.length) out.push({ id: `od-${s.id}`, kind: "overdue", severity: overdue.length >= 3 ? "high" : "medium", subjectId: s.id, title: `${s.name}: ${overdue.length} topic${overdue.length > 1 ? "s" : ""} behind the lesson plan`, detail: `Oldest: ${overdue[0].name}, planned for ${fmtDate(plan[overdue[0].id])}.` });
    if (m.requiredPace > 0 && m.currentPace < m.requiredPace * 0.85) out.push({ id: `pace-${s.id}`, kind: "pace", severity: m.health === "DANGER" ? "high" : "medium", subjectId: s.id, title: `${s.name}: teaching pace below requirement`, detail: `Delivered ${m.currentPace} h/week; ${m.requiredPace} h/week needed to finish by the target date.` });
    if (m.shortfallHours > 0) out.push({ id: `hrs-${s.id}`, kind: "hours", severity: "high", subjectId: s.id, title: `${s.name}: ${m.shortfallHours} hours short`, detail: `${m.remainingHours} h remain but only ${m.availableHours} h are scheduled before the target date.` });
    if (m.predictedLate && m.health !== "ON_TRACK") out.push({ id: `exam-${s.id}`, kind: "exam", severity: m.health === "DANGER" ? "high" : "medium", subjectId: s.id, title: `${s.name}: may miss exam readiness`, detail: `Mock projection finishes ${fmtDate(m.predictedCompletion)}; target is ${fmtDate(s.targetDate)}; exam on ${fmtDate(s.examDate)}.` });
  });
  sessions.filter((x) => ids.has(x.subjectId)).forEach((x) => {
    const s = items.find((i) => i.subject.id === x.subjectId)?.subject;
    if (!s) return;
    if (x.status === "missed") out.push({ id: `ms-${x.id}`, kind: "missed", severity: "high", subjectId: x.subjectId, title: `${s.name}: session missed on ${fmtDate(x.date)}`, detail: x.summary });
    if (x.status === "pending" && (diffDays(x.date, DEMO_TODAY) ?? 0) >= 2) out.push({ id: `pd-${x.id}`, kind: "pending", severity: "medium", subjectId: x.subjectId, title: `${s.name}: class on ${fmtDate(x.date)} not verified`, detail: "The faculty record is still pending confirmation." });
  });
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}

export interface Recommendation { subjectId: string; subject: string; text: string }
export interface WeeklyReport { generatedFor: string; headline: string; recommendations: Recommendation[]; wins: string[]; highest: Item | null }

/** Rule-based stand-in for the AI report. Every sentence is derived from deterministic metrics. */
export function buildWeeklyReport(items: Item[], sessions: Session[]): WeeklyReport {
  const open = items.filter((i) => i.m.health !== "COMPLETE").sort((a, b) => (a.m.bufferRatio ?? 99) - (b.m.bufferRatio ?? 99));
  const highest = open[0] ?? null;
  const headline = highest
    ? `Highest risk: ${highest.subject.name}. Delivered pace: ${highest.m.currentPace} hours/week. Required pace: ${highest.m.requiredPace} hours/week. Recommended action: add approximately ${Math.max(highest.m.shortfallHours, 1)} teaching hours before the examination.`
    : "No open subjects in scope. Every subject is complete.";
  const recommendations = open.filter((i) => i.m.health !== "ON_TRACK").map(({ subject: s, m }) => {
    const missed = sessions.filter((x) => x.subjectId === s.id && x.status === "missed").length;
    const parts = [m.shortfallHours > 0 ? `Add about ${m.shortfallHours} teaching hours (buffer ${m.bufferRatio}).` : `Hold the schedule: buffer is ${m.bufferRatio}, so a single missed class would push it into DANGER.`];
    if (missed) parts.push(`Reschedule ${missed} missed session${missed > 1 ? "s" : ""}.`);
    if (m.currentPace < m.requiredPace) parts.push(`Lift weekly delivery from ${m.currentPace} to ${m.requiredPace} hours.`);
    return { subjectId: s.id, subject: s.name, text: parts.join(" ") };
  });
  const wins = items.filter((i) => i.m.health === "ON_TRACK" || i.m.health === "COMPLETE").slice(0, 3).map((i) => `${i.subject.name} is ${i.m.health === "COMPLETE" ? "complete" : `on track (buffer ${i.m.bufferRatio})`}.`);
  return { generatedFor: DEMO_TODAY, headline, recommendations, wins, highest };
}

/** Illustrative weekly delivery series (deterministic wobble around the average pace). Labelled as mock in the UI. */
export function weeklySeries(m: SubjectMetrics) {
  const wobble = [0.8, 1.15, 0.9, 1.05, 0.85, 1.1];
  return wobble.map((w, i) => ({ week: `W${i + 1}`, actual: Math.round(m.currentPace * w * 10) / 10, required: m.requiredPace }));
}
export const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
export const weightedCoverage = (items: Item[]) => { const p = items.reduce((s, i) => s + i.m.plannedHours, 0); return p ? Math.round((items.reduce((s, i) => s + i.m.coveredHours, 0) / p) * 1000) / 10 : 0; };

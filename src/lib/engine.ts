import type { Health, Holiday, Slot, Subject, Topic } from "./types";
import { addDays, clamp, diffDays, parseISO, round, weekday } from "./utils";

/** Fixed "today" keeps the demo deterministic. Swap for real clock when a backend exists. */
export const DEMO_TODAY = "2026-10-12";
export const ON_TRACK_MIN = 1.15;
export const TIGHT_MIN = 1.0;

export interface SubjectMetrics {
  plannedHours: number; coveredHours: number; remainingHours: number; availableHours: number;
  completionPct: number; plannedProgressPct: number; bufferRatio: number | null;
  health: Health; predictedCompletion: string | null; predictedLate: boolean;
  currentPace: number; requiredPace: number; shortfallHours: number; scopeCoveragePct: number;
  daysToExam: number | null; warnings: string[];
}

const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Hours of scheduled teaching between two dates (inclusive of `from`, exclusive of `to`+1), skipping holidays. */
export function scheduledHours(slots: Slot[], from: string, to: string, holidays: Holiday[], campusId: string): number {
  const a = parseISO(from), b = parseISO(to);
  if (a === null || b === null || b < a) return 0;
  const off = new Set(holidays.filter((h) => h.campusId === "all" || h.campusId === campusId).map((h) => h.date));
  let total = 0;
  const days = Math.min(Math.round((b - a) / 86400000), 500);
  for (let i = 0; i <= days; i++) {
    const d = addDays(from, i);
    if (off.has(d)) continue;
    const wd = weekday(d);
    for (const s of slots) if ((s.day % 7) === wd) total += safe(s.hours);
  }
  return total;
}

export const healthFromBuffer = (ratio: number | null, complete: boolean): Health =>
  complete ? "COMPLETE" : ratio === null || ratio < TIGHT_MIN ? "DANGER" : ratio < ON_TRACK_MIN ? "TIGHT" : "ON_TRACK";

export function computeMetrics(subject: Subject, holidays: Holiday[], today = DEMO_TODAY): SubjectMetrics {
  const warnings: string[] = [];
  const topics = subject.topics;
  const plannedHours = topics.reduce((s, t) => s + safe(t.plannedHours), 0);
  const coveredHours = topics.reduce((s, t) => s + safe(t.plannedHours) * clamp(t.pct || 0, 0, 100) / 100, 0);
  const remainingHours = Math.max(0, plannedHours - coveredHours);
  if (plannedHours === 0) warnings.push("No planned teaching hours defined");

  const complete = plannedHours > 0 && remainingHours < 0.01;
  const target = parseISO(subject.targetDate) !== null ? subject.targetDate : parseISO(subject.examDate) !== null ? subject.examDate : null;
  if (!target) warnings.push("Missing target or exam date");

  const from = parseISO(today) !== null && (diffDays(subject.startDate, today) ?? -1) >= 0 ? today : subject.startDate;
  const availableHours = target ? scheduledHours(subject.slots, from, target, holidays, subject.campusId) : 0;
  const bufferRatio = complete ? null : remainingHours > 0 ? round(availableHours / remainingHours, 2) : null;
  const health = healthFromBuffer(complete ? null : remainingHours > 0 ? availableHours / remainingHours : null, complete);

  const totalSched = target ? scheduledHours(subject.slots, subject.startDate, target, holidays, subject.campusId) : 0;
  const doneSched = scheduledHours(subject.slots, subject.startDate, addDays(today, -1), holidays, subject.campusId);
  const plannedProgressPct = totalSched > 0 ? clamp((doneSched / totalSched) * 100, 0, 100) : 0;
  const completionPct = plannedHours > 0 ? (coveredHours / plannedHours) * 100 : 0;

  const weeksElapsed = Math.max((diffDays(subject.startDate, today) ?? 7) / 7, 1);
  const currentPace = coveredHours / weeksElapsed;
  const weeksLeft = Math.max((diffDays(today, target ?? today) ?? 0) / 7, 1 / 7);
  const requiredPace = remainingHours / weeksLeft;
  const predictedCompletion = complete ? today : currentPace > 0 && remainingHours > 0 ? addDays(today, Math.ceil((remainingHours / currentPace) * 7)) : null;
  const predictedLate = !complete && (predictedCompletion === null || (target !== null && (diffDays(target, predictedCompletion) ?? 0) > 0));

  const scope = topics.filter((t) => t.examScope);
  const scopePlanned = scope.reduce((s, t) => s + safe(t.plannedHours), 0);
  const scopeCovered = scope.reduce((s, t) => s + safe(t.plannedHours) * clamp(t.pct, 0, 100) / 100, 0);

  return {
    plannedHours: round(plannedHours), coveredHours: round(coveredHours), remainingHours: round(remainingHours),
    availableHours: round(availableHours), completionPct: round(completionPct), plannedProgressPct: round(plannedProgressPct),
    bufferRatio, health, predictedCompletion, predictedLate, currentPace: round(currentPace), requiredPace: round(requiredPace),
    shortfallHours: complete ? 0 : Math.max(0, Math.ceil(remainingHours - availableHours)),
    scopeCoveragePct: scopePlanned > 0 ? round((scopeCovered / scopePlanned) * 100) : 0,
    daysToExam: diffDays(today, subject.examDate), warnings,
  };
}

export const HEALTH_META: Record<Health, { label: string; text: string; bg: string; ring: string; dot: string; hex: string }> = {
  ON_TRACK: { label: "ON TRACK", text: "text-emerald-300", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", dot: "bg-emerald-400", hex: "#34d399" },
  TIGHT: { label: "TIGHT", text: "text-amber-300", bg: "bg-amber-500/10", ring: "ring-amber-500/30", dot: "bg-amber-400", hex: "#fbbf24" },
  DANGER: { label: "DANGER", text: "text-red-300", bg: "bg-red-500/10", ring: "ring-red-500/30", dot: "bg-red-400", hex: "#f87171" },
  COMPLETE: { label: "COMPLETE", text: "text-slate-300", bg: "bg-slate-500/10", ring: "ring-slate-500/30", dot: "bg-slate-400", hex: "#94a3b8" },
};

export function healthCounts(list: SubjectMetrics[]): Record<Health, number> {
  const c: Record<Health, number> = { ON_TRACK: 0, TIGHT: 0, DANGER: 0, COMPLETE: 0 };
  list.forEach((m) => { c[m.health]++; });
  return c;
}

export const unitsOf = (topics: Topic[]) => {
  const map = new Map<string, Topic[]>();
  topics.forEach((t) => map.set(t.unit, [...(map.get(t.unit) ?? []), t]));
  return [...map.entries()].map(([unit, ts]) => {
    const planned = ts.reduce((s, t) => s + safe(t.plannedHours), 0);
    const covered = ts.reduce((s, t) => s + safe(t.plannedHours) * clamp(t.pct, 0, 100) / 100, 0);
    return { unit, topics: ts, planned: round(planned), covered: round(covered), pct: planned > 0 ? round((covered / planned) * 100) : 0 };
  });
};

/** Planned date per topic: topics are taught in order, consuming scheduled hours from the subject start date. */
export function lessonPlanDates(subject: Subject, holidays: Holiday[]): Record<string, string> {
  const out: Record<string, string> = {};
  let cum = 0;
  const end = addDays(subject.examDate, 0);
  const cache: { d: string; cum: number }[] = [];
  let total = 0;
  const span = Math.min(diffDays(subject.startDate, end) ?? 0, 400);
  for (let i = 0; i <= span; i++) {
    const d = addDays(subject.startDate, i);
    const h = scheduledHours(subject.slots, d, d, holidays, subject.campusId);
    if (h > 0) { total += h; cache.push({ d, cum: total }); }
  }
  for (const t of subject.topics) {
    cum += safe(t.plannedHours);
    out[t.id] = cache.find((c) => c.cum >= cum - 0.001)?.d ?? subject.examDate;
  }
  return out;
}

export const subjectHealthLabel = (h: Health) => HEALTH_META[h].label;

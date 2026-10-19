import type { Holiday, Session, Subject } from "@/lib/types";
import { computeMetrics, type SubjectMetrics } from "@/lib/engine";
import { uid } from "@/lib/utils";

export const SAMPLE_UPDATE = "Today I completed ionic bonding and started covalent bonding. I explained electron transfer, the octet rule, and Lewis structures. We solved three examples. Covalent bonding is approximately 40% complete.";

export interface Draft {
  id?: string; subjectId: string; date: string; hours: number; topics: { topicId: string; pct: number }[];
  activities: string; homework: string; homeworkSuggested?: boolean; source: Session["source"]; transcript: string; explained: string[];
}

const NUM: Record<string, string> = { one: "One", two: "Two", three: "Three", four: "Four", five: "Five", six: "Six" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Deterministic, rule-based stand-in for AI extraction. It matches known syllabus topics by name and reads simple
 * phrases ("completed", "started", "N%"). It is NOT a language model and can miss or misread input; faculty must verify.
 */
export function proposeFromText(text: string, subject: Subject, date: string, hours: number, source: Draft["source"]): Draft {
  const lower = text.toLowerCase();
  const topics: Draft["topics"] = [];
  subject.topics.forEach((t) => {
    const name = t.name.toLowerCase();
    const at = lower.indexOf(name);
    if (at < 0) return;
    const before = lower.slice(Math.max(0, at - 40), at);
    const pctMatch = lower.slice(at).match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^.]*?(\\d{1,3})\\s?%`));
    const doneVerb = /(completed|finished|wrapped up|covered)\s+(\w+\s+){0,2}$/.test(before);
    const startVerb = /(started|began|begun|introduced)\s+(\w+\s+){0,2}$/.test(before);
    if (!doneVerb && !startVerb && !pctMatch) return; // merely mentioned, not reported as taught
    let pct = doneVerb ? 100 : 30;
    if (pctMatch && !doneVerb) pct = Math.min(100, Number(pctMatch[1]));
    topics.push({ topicId: t.id, pct });
  });
  const explainedMatch = text.match(/explained\s+([^.]+)\./i);
  const explained = explainedMatch ? explainedMatch[1].split(/,\s*(?:and\s+)?|\s+and\s+/).map((x) => x.trim()).filter(Boolean) : [];
  const solved = text.match(/solved\s+(\w+)\s+(examples?|problems?|questions?)/i);
  const activities = solved ? `${NUM[solved[1].toLowerCase()] ?? cap(solved[1])} ${solved[2].toLowerCase()} solved` : (text.split(/(?<=\.)\s+/).find((x) => /solved|worked|exercise|activity|demo/i.test(x)) ?? "");
  const hw = text.split(/(?<=\.)\s+/).find((x) => /homework|assigned|assignment/i.test(x));
  const suggested = !hw && explained.length ? `Practice ${explained[explained.length - 1].replace(/^the\s+/i, "")}` : "";
  return { subjectId: subject.id, date, hours, topics, activities, homework: hw ?? suggested, homeworkSuggested: !hw && !!suggested, source, transcript: text, explained };
}

export function draftToSession(d: Draft, facultyId: string, subject: Subject, verifiedBy: string): Session {
  const name = (id: string) => subject.topics.find((t) => t.id === id)?.name ?? id;
  const done = d.topics.filter((t) => t.pct >= 100).map((t) => name(t.topicId));
  const part = d.topics.filter((t) => t.pct < 100).map((t) => `${name(t.topicId)} (${t.pct}%)`);
  const summary = [done.length && `Completed ${done.join(", ")}.`, part.length && `Progressed ${part.join(", ")}.`, d.activities && `${d.activities}.`].filter(Boolean).join(" ");
  return {
    id: d.id ?? uid("ss"), subjectId: d.subjectId, facultyId, date: d.date, status: "verified", source: d.source, hours: d.hours,
    topics: d.topics, activities: d.activities, homework: d.homework, summary,
    notes: {
      keyConcepts: d.explained.length ? d.explained.map(cap) : d.topics.map((t) => name(t.topicId)),
      detail: [summary, "Demo content generated from the faculty-verified session record, not authored educational material."],
      examples: d.activities ? [d.activities] : [], sources: [`Faculty session record, verified by ${verifiedBy}`],
    },
  };
}

export function previewImpact(subject: Subject, d: Draft, holidays: Holiday[]): { before: SubjectMetrics; after: SubjectMetrics } {
  const after: Subject = { ...subject, topics: subject.topics.map((t) => { const u = d.topics.find((x) => x.topicId === t.id); return u ? { ...t, pct: Math.max(t.pct, Math.min(100, Math.max(0, u.pct))) } : t; }) };
  return { before: computeMetrics(subject, holidays), after: computeMetrics(after, holidays) };
}

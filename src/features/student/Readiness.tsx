"use client";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, EmptyState, HealthBadge, Pill, Progress, Stat } from "@/components/ui";
import { HorizontalBars } from "@/components/ui/charts";
import { DEMO_TODAY, HEALTH_META, lessonPlanDates, unitsOf } from "@/lib/engine";
import { useScopedSubjects, useStore } from "@/lib/store";
import { cn, diffDays, fmtDate, round } from "@/lib/utils";
import { topicAccuracy } from "./helpers";

export function ReadinessPage() {
  const items = useScopedSubjects();
  const { state } = useStore();
  const [id, setId] = useState(items.find((i) => i.subject.id === "s-chem")?.subject.id ?? items[0]?.subject.id);
  const cur = items.find((i) => i.subject.id === id) ?? items[0];
  if (!cur) return <Card><EmptyState title="No enrolled subjects" /></Card>;
  const { subject: s, m } = cur;
  const acc = topicAccuracy(state.attempts);
  const plan = lessonPlanDates(s, state.holidays);
  const units = unitsOf(s.topics);
  const attention = s.topics.map((t) => {
    const a = acc[`${s.id}:${t.id}`]; const late = t.pct < 100 && (diffDays(plan[t.id], DEMO_TODAY) ?? 0) > 0;
    const weak = t.pct > 0 && a && a.total >= 1 && a.right / a.total < 0.7;
    const untested = t.pct >= 100 && !a;
    const reason = late ? `Behind plan (due ${fmtDate(plan[t.id])})` : weak ? `Practice accuracy ${Math.round((a.right / a.total) * 100)}%` : untested ? "Taught but not practised yet" : null;
    return reason ? { t, reason, tone: late || weak ? "red" as const : "amber" as const } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);
  const weakCount = attention.filter((a) => a.tone === "red" && a.reason.startsWith("Practice")).length;
  const studyHours = round(weakCount * 1.5 + attention.filter((a) => a.reason.startsWith("Taught")).length * 0.5, 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Subject">{items.map((i) => <button key={i.subject.id} role="tab" aria-selected={i.subject.id === s.id} onClick={() => setId(i.subject.id)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm", i.subject.id === s.id ? "border-indigo-400/60 bg-indigo-500/10 text-white" : "border-line text-slate-400 hover:text-white")}><span className="h-1.5 w-1.5 rounded-full" style={{ background: HEALTH_META[i.m.health].hex }} />{i.subject.name}</button>)}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Exam-scope completion" value={`${m.scopeCoveragePct}%`} hint="Of exam topics taught" />
        <Stat label="Teaching hours remaining" value={`${m.remainingHours}h`} hint="Class time still needed for the syllabus" />
        <Stat label="Suggested self-study (mock)" value={`${studyHours}h`} hint="For weak or unpractised topics" />
        <Stat label="Exam date" value={fmtDate(s.examDate)} hint={`${m.daysToExam ?? "—"} days to go`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Unit-by-unit syllabus coverage" action={<HealthBadge health={m.health} />}><HorizontalBars data={units.map((u) => ({ name: u.unit.length > 16 ? u.unit.slice(0, 15) + "…" : u.unit, value: u.pct, color: HEALTH_META[m.health].hex }))} height={Math.max(160, units.length * 56)} /></Card>
        <Card className="lg:col-span-2" title="Overall progress"><div className="space-y-4"><div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-300">Syllabus taught</span><span className="tabular-nums text-white">{m.completionPct}%</span></div><Progress value={m.completionPct} planned={m.plannedProgressPct} color={HEALTH_META[m.health].hex} label="Syllabus taught" /></div><div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-300">Exam scope covered</span><span className="tabular-nums text-white">{m.scopeCoveragePct}%</span></div><Progress value={m.scopeCoveragePct} label="Exam scope covered" /></div><p className="text-[11px] leading-relaxed text-slate-500">The white marker shows where the lesson plan expects the class to be today ({m.plannedProgressPct}%). Study-hour figures are rough demo estimates, not predictions.</p></div></Card>
      </div>
      <Card pad={false} title="Topics requiring attention" subtitle="Behind plan, low practice accuracy, or not yet practised">
        {attention.length === 0 ? <EmptyState title="Nothing needs attention" hint="You're on top of this subject." /> : <ul className="divide-y divide-line/60">{attention.map(({ t, reason, tone }) => <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5"><span className="flex items-center gap-2 text-sm text-slate-100"><AlertCircle className={cn("h-4 w-4", tone === "red" ? "text-red-400" : "text-amber-400")} />{t.name}<span className="text-[11px] text-slate-500">{t.unit}</span></span><Pill tone={tone}>{reason}</Pill></li>)}</ul>}
      </Card>
    </div>
  );
}

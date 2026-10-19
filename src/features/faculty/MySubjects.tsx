"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Mic } from "lucide-react";
import { Button, Card, HealthBadge, Pill, Progress, Stat, Tabs } from "@/components/ui";
import { DEMO_TODAY, HEALTH_META, lessonPlanDates, unitsOf } from "@/lib/engine";
import { useScopedSubjects, useStore } from "@/lib/store";
import { cn, diffDays, fmtDate } from "@/lib/utils";

export function MySubjectsPage() {
  const items = useScopedSubjects();
  const { state } = useStore();
  const params = useSearchParams();
  const [id, setId] = useState(params.get("subject") ?? items[0]?.subject.id ?? "");
  const [tab, setTab] = useState<"topics" | "plan">("topics");
  const cur = items.find((i) => i.subject.id === id) ?? items[0];
  const plan = useMemo(() => (cur ? lessonPlanDates(cur.subject, state.holidays) : {}), [cur, state.holidays]);
  if (!cur) return <Card><p className="text-sm text-slate-400">No subjects assigned.</p></Card>;
  const { subject: s, m } = cur;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Subjects">{items.map((i) => <button key={i.subject.id} role="tab" aria-selected={i.subject.id === s.id} onClick={() => setId(i.subject.id)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm", i.subject.id === s.id ? "border-indigo-400/60 bg-indigo-500/10 text-white" : "border-line text-slate-400 hover:text-white")}><span className="h-1.5 w-1.5 rounded-full" style={{ background: HEALTH_META[i.m.health].hex }} />{i.subject.name} <span className="text-xs text-slate-500">{i.subject.code}</span></button>)}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Completion" value={`${m.completionPct}%`} /><Stat label="Remaining hours" value={`${m.remainingHours}h`} hint={`${m.availableHours}h scheduled`} /><Stat label="Buffer ratio" value={m.bufferRatio?.toFixed(2) ?? "—"} /><div className="flex items-center justify-between rounded-xl border border-line bg-panel p-4"><div><p className="text-xs text-slate-400">Subject health</p><div className="mt-2"><HealthBadge health={m.health} /></div></div><Link href={`/app/faculty/log?subject=${s.id}`}><Button variant="primary" size="sm"><Mic className="h-3.5 w-3.5" />Log</Button></Link></div></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "topics", label: "Topic list" }, { id: "plan", label: "Lesson plan" }]} />
      {tab === "topics" ? (
        <div className="grid gap-4 md:grid-cols-2">{unitsOf(s.topics).map((u) => <Card key={u.unit} title={u.unit} subtitle={`${u.covered}/${u.planned}h · ${u.pct}%`}><ul className="space-y-3">{u.topics.map((t) => <li key={t.id}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-200">{t.name}</span><span className="text-xs tabular-nums text-slate-400">{t.pct}% · {t.plannedHours}h</span></div><Progress value={t.pct} label={t.name} /></li>)}</ul></Card>)}</div>
      ) : (
        <Card pad={false} title="Lesson plan" subtitle="Planned date comes from your timetable slots and holidays, in syllabus order."><ul className="divide-y divide-line/60">{s.topics.map((t) => { const late = t.pct < 100 && (diffDays(plan[t.id], DEMO_TODAY) ?? 0) > 0; return <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"><span className="min-w-0"><span className="text-slate-100">{t.name}</span><span className="block text-[11px] text-slate-500">{t.unit} · {t.plannedHours}h</span></span><span className="flex items-center gap-2"><span className={cn("text-xs", late ? "text-red-300" : "text-slate-400")}>{fmtDate(plan[t.id])}</span>{t.pct >= 100 ? <Pill tone="green">Done</Pill> : late ? <Pill tone="red">Overdue</Pill> : t.pct > 0 ? <Pill tone="indigo">{t.pct}%</Pill> : <Pill>Planned</Pill>}</span></li>; })}</ul></Card>
      )}
    </div>
  );
}

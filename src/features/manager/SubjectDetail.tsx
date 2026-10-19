"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Mail, UserRound } from "lucide-react";
import { Card, EmptyState, HealthBadge, Pill, Progress, Stat, Tabs } from "@/components/ui";
import { PaceChart } from "@/components/ui/charts";
import { HEALTH_META, lessonPlanDates, unitsOf, DEMO_TODAY } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { cn, diffDays, fmtDate } from "@/lib/utils";
import { weeklySeries } from "../shared/insights";

type Tab = "overview" | "faculty" | "sessions" | "topics";

export function SubjectDetail({ subjectId }: { subjectId: string }) {
  const { state, metrics } = useStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [focus, setFocus] = useState<string | null>(null);
  const s = state.subjects.find((x) => x.id === subjectId);
  const plan = useMemo(() => (s ? lessonPlanDates(s, state.holidays) : {}), [s, state.holidays]);
  if (!s) return <Card><EmptyState title="Subject not found" hint="It may have been deleted in the Admin workspace." action={<Link href={state.role === "admin" ? "/app/admin/subjects" : "/app/manager/health"} className="text-sm text-indigo-300 hover:underline">Go back</Link>} /></Card>;
  const m = metrics[s.id];
  const fac = state.faculty.find((f) => f.id === s.facultyId);
  const sessions = state.sessions.filter((x) => x.subjectId === s.id).sort((a, b) => b.date.localeCompare(a.date));
  const units = unitsOf(s.topics);
  const topicName = (id: string) => s.topics.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><Link href={state.role === "admin" ? "/app/admin/subjects" : "/app/manager/health"} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Course Health</Link><HealthBadge health={m.health} /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Completion" value={`${m.completionPct}%`} hint={`Plan ${m.plannedProgressPct}%`} />
        <Stat label="Buffer ratio" value={m.bufferRatio === null ? "—" : m.bufferRatio.toFixed(2)} hint={`${m.availableHours}h available ÷ ${m.remainingHours}h left`} />
        <Stat label="Hours covered" value={`${m.coveredHours}/${m.plannedHours}`} hint="Covered / planned" />
        <Stat label="Predicted finish (mock)" value={m.health === "COMPLETE" ? "Done" : fmtDate(m.predictedCompletion)} hint={`Target ${fmtDate(s.targetDate)}`} />
        <Stat label="Exam" value={fmtDate(s.examDate)} hint={m.daysToExam !== null ? `${m.daysToExam} days away` : "No date"} />
      </div>
      {m.warnings.length > 0 && <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{m.warnings.join(" · ")}</div>}
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "overview", label: "Overview" }, { id: "faculty", label: "Faculty" }, { id: "sessions", label: "Sessions", count: sessions.length }, { id: "topics", label: "Topics", count: s.topics.length }]} />

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Unit coverage">{units.map((u) => <div key={u.unit} className="mb-3 last:mb-0"><div className="mb-1 flex justify-between text-xs"><span className="text-slate-200">{u.unit}</span><span className="tabular-nums text-slate-400">{u.covered}/{u.planned}h · {u.pct}%</span></div><Progress value={u.pct} color={HEALTH_META[m.health].hex} label={u.unit} /></div>)}</Card>
          <Card title="Pace versus requirement" subtitle="Illustrative weekly series around the measured average"><PaceChart data={weeklySeries(m)} /><p className="mt-2 text-xs text-slate-400">Delivered {m.currentPace} h/week on average; {m.requiredPace} h/week required to finish by {fmtDate(s.targetDate)}.{m.shortfallHours > 0 && <> Shortfall: <b className="text-red-300">{m.shortfallHours}h</b>.</>}</p></Card>
        </div>
      )}
      {tab === "faculty" && (
        <Card title="Assigned faculty">{fac ? <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-indigo-500/15 text-indigo-300"><UserRound className="h-5 w-5" /></span><div><p className="font-medium text-white">{fac.name}</p><p className="text-xs text-slate-400">{fac.specialty} · {fac.weeklyCapacity}h weekly capacity</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" />{fac.email}</p><div className="mt-3 flex flex-wrap gap-1.5">{state.subjects.filter((x) => x.facultyId === fac.id).map((x) => <Link key={x.id} href={`/app/${state.role}/subject/${x.id}`}><Pill tone={x.id === s.id ? "indigo" : "slate"}>{x.name} · {x.code}</Pill></Link>)}</div></div></div> : <EmptyState title="No faculty assigned" />}</Card>
      )}
      {tab === "sessions" && (
        <Card pad={false} title="Session log" subtitle="Select a topic chip to jump to it">
          {sessions.length === 0 ? <EmptyState title="No sessions recorded yet" /> : <ul className="divide-y divide-line/60">{sessions.map((x) => (
            <li key={x.id} className="px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium text-white">{fmtDate(x.date, true)} · {x.hours}h</span><Pill tone={x.status === "verified" ? "green" : x.status === "missed" ? "red" : "amber"}>{x.status}</Pill></div>
              <p className="mt-1 text-xs text-slate-400">{x.summary}</p>
              {x.topics.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{x.topics.map((t) => <button key={t.topicId} onClick={() => { setFocus(t.topicId); setTab("topics"); }} className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-300 ring-1 ring-inset ring-indigo-500/25 hover:bg-indigo-500/20">{topicName(t.topicId)} · {t.pct}%</button>)}</div>}
            </li>))}</ul>}
        </Card>
      )}
      {tab === "topics" && (
        <Card pad={false} title="Topics and lesson plan"><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-line/70 text-[11px] uppercase tracking-wider text-slate-500"><th className="px-4 py-2.5 font-medium">Topic</th><th className="px-4 py-2.5 font-medium">Hours</th><th className="px-4 py-2.5 font-medium">Planned date</th><th className="px-4 py-2.5 font-medium">Progress</th><th className="px-4 py-2.5 font-medium">Scope</th></tr></thead>
          <tbody>{s.topics.map((t) => { const late = t.pct < 100 && (diffDays(plan[t.id], DEMO_TODAY) ?? 0) > 0; return (
            <tr key={t.id} className={cn("border-b border-line/50 last:border-0", focus === t.id && "bg-indigo-500/10")}><td className="px-4 py-2.5"><span className="text-slate-100">{t.name}</span><span className="block text-[11px] text-slate-500">{t.unit}</span></td><td className="px-4 py-2.5 tabular-nums">{t.plannedHours}</td><td className={cn("px-4 py-2.5", late && "text-red-300")}>{fmtDate(plan[t.id])}{late && " · overdue"}</td><td className="px-4 py-2.5"><div className="flex items-center gap-2"><Progress value={t.pct} className="w-24" label={t.name} /><span className="text-xs tabular-nums text-slate-400">{t.pct}%</span></div></td><td className="px-4 py-2.5">{t.examScope ? <Pill tone="indigo">In scope</Pill> : <Pill>Out</Pill>}</td></tr>); })}</tbody></table></div></Card>
      )}
    </div>
  );
}

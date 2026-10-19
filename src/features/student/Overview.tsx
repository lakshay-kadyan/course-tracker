"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Activity, BookCheck, CalendarDays, FlaskConical } from "lucide-react";
import { Card, EmptyState, HealthBadge, Pill, Progress } from "@/components/ui";
import { DEMO_TODAY, HEALTH_META, lessonPlanDates } from "@/lib/engine";
import { DEMO_NOW } from "@/lib/data";
import { useScopedSubjects, useStore } from "@/lib/store";
import { DAY_NAMES, fmtDate, weekday } from "@/lib/utils";
import { topicName } from "./helpers";

const endT = (start: string, h: number) => { const [a, b] = start.split(":").map(Number); const t = a * 60 + b + h * 60; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

export function StudentOverview() {
  const items = useScopedSubjects();
  const { state } = useStore();
  const ids = new Set(items.map((i) => i.subject.id));
  const wd = weekday(DEMO_TODAY);
  const holiday = state.holidays.some((h) => h.date === DEMO_TODAY && (h.campusId === "all" || h.campusId === "blr"));
  const today = items.flatMap(({ subject: s }) => s.slots.filter((x) => x.day % 7 === wd && !holiday).map((x) => ({ id: s.id + x.id, s, start: x.start, end: endT(x.start, x.hours) }))).sort((a, b) => a.start.localeCompare(b.start));
  const recent = state.sessions.filter((s) => ids.has(s.subjectId) && s.status === "verified").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const upcoming = useMemo(() => items.filter((i) => i.m.health !== "COMPLETE").map(({ subject: s }) => { const t = s.topics.find((x) => x.pct < 100); return t ? { s, t, date: lessonPlanDates(s, state.holidays)[t.id] } : null; }).filter((x): x is NonNullable<typeof x> => !!x), [items, state.holidays]);
  const exams = [...items].sort((a, b) => a.subject.examDate.localeCompare(b.subject.examDate));
  const homework = recent.filter((r) => r.homework).slice(0, 3);
  const activity = [...state.attempts.slice(0, 3).map((a) => ({ k: a.id, d: a.date, t: `Practice: ${a.score}/${a.total} in ${state.subjects.find((s) => s.id === a.subjectId)?.name}` })), ...recent.map((r) => ({ k: r.id, d: r.date, t: `Lecture: ${state.subjects.find((s) => s.id === r.subjectId)?.name} · ${r.summary}` }))].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title={<span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-indigo-300" />Today&apos;s schedule</span>} subtitle={`${DAY_NAMES[wd]}, ${fmtDate(DEMO_TODAY, true)}`}>
          {today.length === 0 ? <EmptyState title="No classes today" /> : <ul className="space-y-2">{today.map((t) => { const st = DEMO_NOW >= t.end ? "done" : DEMO_NOW >= t.start ? "live" : "next"; return <li key={t.id} className="flex items-center gap-3 rounded-lg border border-line bg-black/20 px-3 py-2.5"><span className="w-24 text-xs tabular-nums text-slate-400">{t.start}–{t.end}</span><span className="flex-1 text-sm text-white">{t.s.name}</span><Pill tone={st === "live" ? "green" : st === "done" ? "slate" : "indigo"}>{st === "live" ? "Live now" : st === "done" ? "Done" : "Later"}</Pill></li>; })}</ul>}
        </Card>
        <Card title="Upcoming exams & deadlines">
          <ul className="space-y-2.5">{exams.slice(0, 4).map(({ subject: s, m }) => <li key={s.id} className="flex justify-between text-sm"><span className="text-slate-200">{s.name} exam</span><span className="text-xs text-slate-400">{fmtDate(s.examDate)} · {m.daysToExam}d</span></li>)}
            {homework.map((h) => <li key={h.id} className="flex justify-between gap-2 border-t border-line/60 pt-2.5 text-sm"><span className="text-slate-300">{h.homework}</span><span className="shrink-0 text-xs text-slate-500">HW · {fmtDate(h.date)}</span></li>)}</ul>
        </Card>
      </div>

      <Card title="My subjects" subtitle="Completion shows how much of the syllabus has been taught. The bar marker is where the plan says you should be.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(({ subject: s, m }) => (
          <Link key={s.id} href={`/app/student/lectures?subject=${s.id}`} className="rounded-lg border border-line bg-black/20 p-3 transition-colors hover:border-slate-600"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-white">{s.name}</span><HealthBadge health={m.health} /></div><Progress value={m.completionPct} planned={m.plannedProgressPct} color={HEALTH_META[m.health].hex} label={`${s.name} completion`} /><p className="mt-2 text-[11px] text-slate-400">{m.completionPct}% taught · {m.remainingHours}h of teaching left</p></Link>))}</div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card pad={false} title={<span className="flex items-center gap-2"><BookCheck className="h-4 w-4 text-emerald-300" />Recently taught</span>} action={<Link href="/app/student/lectures" className="text-xs text-indigo-300 hover:underline">Notes</Link>}>
          <ul className="divide-y divide-line/60">{recent.map((r) => { const s = state.subjects.find((x) => x.id === r.subjectId); return <li key={r.id} className="px-4 py-2.5"><p className="text-sm text-slate-100">{r.topics.map((t) => topicName(s, t.topicId)).join(", ") || s?.name}</p><p className="text-xs text-slate-500">{s?.name} · {fmtDate(r.date)}</p></li>; })}</ul>
        </Card>
        <Card pad={false} title={<span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-violet-300" />Upcoming lessons</span>} subtitle="Next planned topic per subject">
          <ul className="divide-y divide-line/60">{upcoming.map(({ s, t, date }) => <li key={s.id} className="flex items-center justify-between px-4 py-2.5"><span><span className="text-sm text-slate-100">{t.name}</span><span className="block text-xs text-slate-500">{s.name}</span></span><span className="text-xs text-slate-400">{fmtDate(date)}</span></li>)}</ul>
        </Card>
        <Card pad={false} title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-slate-400" />Recent activity</span>}>
          {activity.length === 0 ? <EmptyState title="No activity yet" hint="Take a practice quiz to get started." /> : <ul className="divide-y divide-line/60">{activity.map((a) => <li key={a.k} className="px-4 py-2.5 text-sm text-slate-300">{a.t}<span className="block text-xs text-slate-500">{fmtDate(a.d)}</span></li>)}</ul>}
        </Card>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, CircleDot, ClipboardList, Mic, Timer } from "lucide-react";
import { Button, Card, EmptyState, HealthBadge, Pill, Progress } from "@/components/ui";
import { DEMO_TODAY, HEALTH_META } from "@/lib/engine";
import { DEMO_NOW } from "@/lib/data";
import { useScopedSubjects, useStore } from "@/lib/store";
import { addDays, cn, fmtDate, weekday, DAY_NAMES } from "@/lib/utils";
import type { Session } from "@/lib/types";
import type { Draft } from "./proposal";
import { VerificationModal } from "./SessionDialogs";

const end = (start: string, h: number) => { const [hh, mm] = start.split(":").map(Number); const t = hh * 60 + mm + h * 60; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

export function FacultyDashboard() {
  const items = useScopedSubjects();
  const { state, discardSession } = useStore();
  const [fix, setFix] = useState<Session | null>(null);
  const todayWd = weekday(DEMO_TODAY);
  const holidayToday = state.holidays.some((h) => h.date === DEMO_TODAY && (h.campusId === "all" || h.campusId === "blr"));

  const today = useMemo(() => items.flatMap(({ subject: s }) => s.slots.filter((x) => x.day % 7 === todayWd && !holidayToday).map((x) => {
    const e = end(x.start, x.hours);
    const next = s.topics.find((t) => t.pct < 100);
    return { id: s.id + x.id, s, start: x.start, end: e, topic: next?.name ?? "Revision", status: DEMO_NOW >= e ? "done" : DEMO_NOW >= x.start ? "live" : "next" };
  })).sort((a, b) => a.start.localeCompare(b.start)), [items, todayWd, holidayToday]);
  const live = today.find((t) => t.status === "live");

  const upcoming = useMemo(() => {
    const out: { key: string; date: string; s: string; start: string; hours: number }[] = [];
    for (let i = 1; i <= 14 && out.length < 6; i++) {
      const d = addDays(DEMO_TODAY, i);
      if (state.holidays.some((h) => h.date === d && (h.campusId === "all" || h.campusId === "blr"))) continue;
      items.forEach(({ subject: s }) => s.slots.filter((x) => x.day % 7 === weekday(d)).forEach((x) => out.push({ key: d + s.id + x.id, date: d, s: s.name, start: x.start, hours: x.hours })));
    }
    return out.slice(0, 6);
  }, [items, state.holidays]);
  const exams = [...items].sort((a, b) => a.subject.examDate.localeCompare(b.subject.examDate));
  const mine = new Set(items.map((i) => i.subject.id));
  const pending = state.sessions.filter((s) => mine.has(s.subjectId) && s.status === "pending");
  const recent = state.sessions.filter((s) => mine.has(s.subjectId) && s.status !== "pending").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const fixDraft: Draft | null = fix ? { id: fix.id, subjectId: fix.subjectId, date: fix.date, hours: fix.hours || 1, topics: [{ topicId: (state.subjects.find((s) => s.id === fix.subjectId)?.topics.find((t) => t.pct < 100) ?? state.subjects.find((s) => s.id === fix.subjectId)!.topics[0]).id, pct: 100 }], activities: "", homework: "", source: "manual", transcript: "", explained: [] } : null;

  return (
    <div className="space-y-5">
      <div className={cn("flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5", live ? "border-indigo-500/40 bg-gradient-to-r from-indigo-500/15 to-violet-500/5" : "border-line bg-panel")}>
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">{live ? <><span className="relative flex h-2 w-2"><span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400" /><span className="h-2 w-2 rounded-full bg-emerald-400" /></span>Active class · demo clock {DEMO_NOW}</> : "No class in progress"}</p>
          <p className="mt-1 text-xl font-semibold text-white">{live ? `${live.s.name} — ${live.topic}` : "You're clear right now"}</p>
          {live && <p className="text-sm text-slate-400">{live.start}–{live.end} · {live.s.code}</p>}
        </div>
        <Link href={`/app/faculty/log${live ? `?subject=${live.s.id}` : ""}`}><Button variant="primary" className="h-11 px-5"><Mic className="h-4 w-4" />Log Class</Button></Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Today's timetable" subtitle={`${DAY_NAMES[todayWd]}, ${fmtDate(DEMO_TODAY, true)}`}>
          {today.length === 0 ? <EmptyState title={holidayToday ? "Holiday today" : "No classes today"} /> : <ul className="space-y-2">{today.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-lg border border-line bg-black/20 px-3 py-2.5"><span className="w-24 text-xs tabular-nums text-slate-400">{t.start}–{t.end}</span><span className="min-w-0 flex-1"><span className="block text-sm text-white">{t.s.name}</span><span className="block truncate text-xs text-slate-500">Next topic: {t.topic}</span></span><Pill tone={t.status === "live" ? "green" : t.status === "done" ? "slate" : "indigo"}>{t.status === "live" ? "In progress" : t.status === "done" ? "Completed" : "Upcoming"}</Pill></li>))}</ul>}
        </Card>
        <Card title="Upcoming exams" subtitle="Your subjects"><ul className="space-y-2">{exams.map(({ subject: s, m }) => <li key={s.id} className="flex items-center justify-between text-sm"><span className="text-slate-200">{s.name}<span className="block text-[11px] text-slate-500">{s.code} · {s.campusId.toUpperCase()}</span></span><span className="text-right text-xs text-slate-300">{fmtDate(s.examDate)}<span className="block text-slate-500">{m.daysToExam}d</span></span></li>)}</ul></Card>
      </div>

      <Card title="Subject progression" subtitle="Remaining hours are teaching hours still required for the full syllabus.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(({ subject: s, m }) => (
          <Link key={s.id} href={`/app/faculty/subjects?subject=${s.id}`} className="rounded-lg border border-line bg-black/20 p-3 transition-colors hover:border-slate-600"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-white">{s.name}</span><HealthBadge health={m.health} /></div><Progress value={m.completionPct} planned={m.plannedProgressPct} color={HEALTH_META[m.health].hex} label={`${s.name} progress`} /><div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>{m.completionPct}% done</span><span>{m.remainingHours}h remaining · buffer {m.bufferRatio?.toFixed(2) ?? "—"}</span></div></Link>))}</div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card pad={false} title={<span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-amber-300" />Pending session records</span>} subtitle="Held classes without a verified record">
          {pending.length === 0 ? <EmptyState title="All records are verified" /> : <ul className="divide-y divide-line/60">{pending.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-3"><span className="text-sm text-slate-200">{state.subjects.find((s) => s.id === p.subjectId)?.name}<span className="block text-xs text-slate-500">{fmtDate(p.date, true)}</span></span><Button size="sm" variant="primary" onClick={() => setFix(p)}>Complete</Button></li>)}</ul>}
        </Card>
        <Card pad={false} title={<span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-indigo-300" />Upcoming classes</span>}><ul className="divide-y divide-line/60">{upcoming.map((u) => <li key={u.key} className="flex items-center justify-between px-4 py-2.5 text-sm"><span className="text-slate-200">{u.s}</span><span className="text-xs text-slate-400">{DAY_NAMES[weekday(u.date)]} {fmtDate(u.date)} · {u.start}</span></li>)}</ul></Card>
        <Card pad={false} title={<span className="flex items-center gap-2"><Timer className="h-4 w-4 text-slate-400" />Recent class history</span>} action={<Link href="/app/faculty/history" className="text-xs text-indigo-300 hover:underline">All</Link>}>
          <ul className="divide-y divide-line/60">{recent.map((r) => <li key={r.id} className="px-4 py-2.5"><div className="flex items-center justify-between text-sm"><span className="text-slate-200">{state.subjects.find((s) => s.id === r.subjectId)?.name}</span><Pill tone={r.status === "verified" ? "green" : "red"}>{r.status}</Pill></div><p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500"><CircleDot className="mt-0.5 h-3 w-3 shrink-0" />{fmtDate(r.date)} · {r.summary}</p></li>)}</ul>
        </Card>
      </div>
      <VerificationModal open={!!fix} startEdit title="Complete session record" draft={fixDraft} onClose={() => setFix(null)} onSaved={() => setFix(null)} onRejected={() => { if (fix) discardSession(fix.id); setFix(null); }} rejectLabel="The pending record will be removed from your list." />
    </div>
  );
}

"use client";
import { useMemo } from "react";
import { Card, Progress, Pill } from "@/components/ui";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useScopedSubjects, useStore } from "@/lib/store";
import { weightedCoverage } from "../shared/insights";


export function FacultyProgressPage() {
  const items = useScopedSubjects();
  const { state } = useStore();
  const rows = useMemo(() => state.faculty.map((f) => {
    const mine = items.filter((i) => i.subject.facultyId === f.id);
    if (!mine.length) return null;
    const load = mine.reduce((s, i) => s + i.subject.slots.reduce((a, x) => a + x.hours, 0), 0);
    const sessions = state.sessions.filter((s) => s.facultyId === f.id);
    return { id: f.id, name: f.name, specialty: f.specialty, subjects: mine.map((i) => i.subject.name).join(", "), load, capacity: f.weeklyCapacity, util: Math.round((load / f.weeklyCapacity) * 100), coverage: weightedCoverage(mine), danger: mine.filter((i) => i.m.health === "DANGER").length, missed: sessions.filter((s) => s.status === "missed").length, pending: sessions.filter((s) => s.status === "pending").length };
  }).filter((r): r is NonNullable<typeof r> => r !== null), [items, state.faculty, state.sessions]);
  const cols: Column<(typeof rows)[number]>[] = [
    { key: "name", header: "Faculty", sort: (r) => r.name, render: (r) => <><span className="font-medium text-white">{r.name}</span><span className="block text-[11px] text-slate-500">{r.specialty}</span></> },
    { key: "subjects", header: "Subjects", render: (r) => <span className="text-xs">{r.subjects}</span> },
    { key: "util", header: "Weekly load", sort: (r) => r.util, className: "min-w-[150px]", render: (r) => <div className="space-y-1"><div className="flex justify-between text-[11px] tabular-nums"><span className="text-white">{r.load}h / {r.capacity}h</span><span className="text-slate-500">{r.util}%</span></div><Progress value={r.util} color={r.util > 100 ? "#f87171" : "#818cf8"} label={`${r.name} utilisation`} /></div> },
    { key: "coverage", header: "Teaching progress", sort: (r) => r.coverage, align: "right", render: (r) => `${r.coverage}%` },
    { key: "flags", header: "Flags", render: (r) => <span className="flex flex-wrap gap-1">{r.danger > 0 && <Pill tone="red">{r.danger} danger</Pill>}{r.missed > 0 && <Pill tone="amber">{r.missed} missed</Pill>}{r.pending > 0 && <Pill>{r.pending} pending</Pill>}{!r.danger && !r.missed && !r.pending && <Pill tone="green">Clear</Pill>}</span> },
  ];
  return <Card pad={false} title="Faculty teaching progress" subtitle="Weekly load is scheduled hours against stated capacity."><DataTable rows={rows} columns={cols} searchText={(r) => `${r.name} ${r.subjects}`} /></Card>;
}

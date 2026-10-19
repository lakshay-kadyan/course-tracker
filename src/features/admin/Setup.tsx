"use client";
import { useState } from "react";
import { Card, HealthBadge, Select, Tabs, Pill, Input, useToast } from "@/components/ui";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useStore } from "@/lib/store";
import type { Batch, Campus, Faculty, Holiday, Subject } from "@/lib/types";
import { DEMO_TODAY } from "@/lib/engine";
import { addDays, cn, diffDays, fmtDate, parseISO, weekday, DAY_NAMES } from "@/lib/utils";
import { EntityManager } from "./EntityManager";
import { subjectHref } from "@/components/shell/nav";
import Link from "next/link";

export function CampusesPage() {
  const { state } = useStore();
  const cols: Column<Campus>[] = [
    { key: "name", header: "Campus", sort: (r) => r.name, render: (r) => <span className="font-medium text-white">{r.name}</span> },
    { key: "city", header: "City", sort: (r) => r.city },
    { key: "head", header: "Campus head" },
    { key: "students", header: "Students", align: "right", sort: (r) => r.students },
    { key: "batches", header: "Batches", align: "right", render: (r) => state.batches.filter((b) => b.campusId === r.id).length },
    { key: "subjects", header: "Subjects", align: "right", render: (r) => state.subjects.filter((b) => b.campusId === r.id).length },
  ];
  return <EntityManager<Campus> title="Campuses" subtitle="Institution locations and semester context" noun="campus" collection="campuses" rows={state.campuses} columns={cols} searchText={(r) => `${r.name} ${r.city} ${r.head}`}
    blank={() => ({ name: "", city: "", head: "", students: 0 })}
    fields={[{ key: "name", label: "Campus name", type: "text", required: true }, { key: "city", label: "City", type: "text", required: true }, { key: "head", label: "Campus head", type: "text", required: true }, { key: "students", label: "Students", type: "number", min: 0 }]}
    canDelete={(r) => (state.batches.some((b) => b.campusId === r.id) ? "Remove or move this campus's batches first." : null)} />;
}

export function BatchesPage() {
  const { state } = useStore();
  const camp = (id: string) => state.campuses.find((c) => c.id === id)?.name ?? "—";
  const cols: Column<Batch>[] = [
    { key: "name", header: "Batch", sort: (r) => r.name, render: (r) => <span className="font-medium text-white">{r.name}</span> },
    { key: "campus", header: "Campus", sort: (r) => camp(r.campusId), render: (r) => camp(r.campusId) },
    { key: "semester", header: "Semester" }, { key: "students", header: "Students", align: "right", sort: (r) => r.students },
    { key: "dates", header: "Term", render: (r) => `${fmtDate(r.startDate)} – ${fmtDate(r.endDate, true)}` },
    { key: "subjects", header: "Subjects", align: "right", render: (r) => state.subjects.filter((s) => s.batchId === r.id).length },
  ];
  return <EntityManager<Batch> title="Batches" subtitle="Cohorts and their academic terms" noun="batch" collection="batches" rows={state.batches} columns={cols} searchText={(r) => `${r.name} ${camp(r.campusId)} ${r.semester}`}
    blank={() => ({ name: "", campusId: "", semester: "Semester 1", students: 0, startDate: "2026-08-03", endDate: "2026-12-18" })}
    fields={[{ key: "name", label: "Batch name", type: "text", required: true }, { key: "campusId", label: "Campus", type: "select", required: true, options: state.campuses.map((c) => ({ value: c.id, label: c.name })) }, { key: "semester", label: "Semester", type: "text", required: true }, { key: "students", label: "Students", type: "number", min: 0 }, { key: "startDate", label: "Start date", type: "date", required: true }, { key: "endDate", label: "End date", type: "date", required: true }]}
    validate={(v) => ((diffDays(v.startDate, v.endDate) ?? 1) <= 0 ? { endDate: "End date must be after start date" } : {})}
    canDelete={(r) => (state.subjects.some((s) => s.batchId === r.id) ? "This batch still has subjects. Delete them first." : null)} />;
}

export function SubjectsPage() {
  const { state, metrics } = useStore();
  const bat = (id: string) => state.batches.find((b) => b.id === id)?.name ?? "—";
  const fac = (id: string) => state.faculty.find((f) => f.id === id)?.name ?? "Unassigned";
  const cols: Column<Subject>[] = [
    { key: "name", header: "Subject", sort: (r) => r.name, render: (r) => <Link href={subjectHref("admin", r.id)} className="hover:text-indigo-300"><span className="font-medium text-white">{r.name}</span><span className="block text-[11px] text-slate-500">{r.code}</span></Link> },
    { key: "batch", header: "Batch", sort: (r) => bat(r.batchId), render: (r) => bat(r.batchId) },
    { key: "faculty", header: "Faculty", sort: (r) => fac(r.facultyId), render: (r) => fac(r.facultyId) },
    { key: "hours", header: "Planned h", align: "right", sort: (r) => metrics[r.id]?.plannedHours ?? 0, render: (r) => metrics[r.id]?.plannedHours ?? 0 },
    { key: "exam", header: "Exam", sort: (r) => r.examDate, render: (r) => fmtDate(r.examDate) },
    { key: "health", header: "Health", sort: (r) => metrics[r.id]?.health ?? "", render: (r) => metrics[r.id] && <HealthBadge health={metrics[r.id].health} /> },
  ];
  return <EntityManager<Subject> title="Subjects" subtitle="Assign faculty, set target and exam dates. Health is computed live from topics and timetable." noun="subject" collection="subjects" rows={state.subjects} columns={cols} searchText={(r) => `${r.name} ${r.code} ${bat(r.batchId)} ${fac(r.facultyId)}`}
    blank={() => ({ code: "", name: "", campusId: "", batchId: "", facultyId: "", startDate: "2026-08-03", targetDate: "2026-11-26", examDate: "2026-12-05", slots: [], topics: [] })}
    fields={[{ key: "name", label: "Subject name", type: "text", required: true }, { key: "code", label: "Code", type: "text", required: true }, { key: "batchId", label: "Batch", type: "select", required: true, options: state.batches.map((b) => ({ value: b.id, label: b.name })) }, { key: "facultyId", label: "Assigned faculty", type: "select", required: true, options: state.faculty.map((f) => ({ value: f.id, label: `${f.name} (${f.campusId.toUpperCase()})` })) }, { key: "startDate", label: "Start date", type: "date", required: true }, { key: "targetDate", label: "Syllabus target date", type: "date", required: true }, { key: "examDate", label: "Exam date", type: "date", required: true }]}
    validate={(v) => { const e: Record<string, string> = {}; if ((diffDays(v.startDate, v.targetDate) ?? 1) <= 0) e.targetDate = "Target must be after start"; if ((diffDays(v.targetDate, v.examDate) ?? 0) < 0) e.examDate = "Exam must be on or after target"; return e; }}
    deleteNote={(r) => `Deletes ${r.name} with its ${r.topics.length} topics and timetable slots. Session records are kept.`} />;
}

export function FacultyAdminPage() {
  const { state } = useStore();
  const camp = (id: string) => state.campuses.find((c) => c.id === id)?.name ?? "—";
  const load = (id: string) => state.subjects.filter((s) => s.facultyId === id).reduce((n, s) => n + s.slots.reduce((a, x) => a + x.hours, 0), 0);
  const cols: Column<Faculty>[] = [
    { key: "name", header: "Faculty", sort: (r) => r.name, render: (r) => <><span className="font-medium text-white">{r.name}</span><span className="block text-[11px] text-slate-500">{r.email}</span></> },
    { key: "campus", header: "Campus", sort: (r) => camp(r.campusId), render: (r) => camp(r.campusId) },
    { key: "specialty", header: "Specialty" },
    { key: "teaching", header: "Teaching", render: (r) => <span className="text-xs">{state.subjects.filter((s) => s.facultyId === r.id).map((s) => s.name).join(", ") || "—"}</span> },
    { key: "load", header: "Load / capacity", sort: (r) => load(r.id) / r.weeklyCapacity, render: (r) => { const l = load(r.id); return <Pill tone={l > r.weeklyCapacity ? "red" : "slate"}>{l}h / {r.weeklyCapacity}h</Pill>; } },
  ];
  return <EntityManager<Faculty> title="Faculty" subtitle="Faculty roster and weekly capacity. Assign them to subjects in the Subjects page." noun="faculty member" collection="faculty" rows={state.faculty} columns={cols} searchText={(r) => `${r.name} ${r.email} ${r.specialty}`}
    blank={() => ({ name: "", email: "", campusId: "", weeklyCapacity: 12, specialty: "" })}
    fields={[{ key: "name", label: "Full name", type: "text", required: true }, { key: "email", label: "Email", type: "email", required: true }, { key: "campusId", label: "Campus", type: "select", required: true, options: state.campuses.map((c) => ({ value: c.id, label: c.name })) }, { key: "weeklyCapacity", label: "Weekly capacity (h)", type: "number", min: 1, max: 40, required: true }, { key: "specialty", label: "Specialty", type: "text", required: true }]}
    canDelete={(r) => (state.subjects.some((s) => s.facultyId === r.id) ? "Reassign this faculty member's subjects first." : null)} />;
}

export function CalendarPage() {
  const { state, upsert } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<"holidays" | "exams" | "grid">("holidays");
  const [campus, setCampus] = useState("blr");
  const exams = state.subjects.map((s) => ({ id: s.id, s })).sort((a, b) => a.s.examDate.localeCompare(b.s.examDate));
  const holCols: Column<Holiday>[] = [
    { key: "date", header: "Date", sort: (r) => r.date, render: (r) => fmtDate(r.date, true) },
    { key: "name", header: "Occasion", render: (r) => <span className="text-white">{r.name}</span> },
    { key: "campus", header: "Applies to", render: (r) => (r.campusId === "all" ? "All campuses" : state.campuses.find((c) => c.id === r.campusId)?.name) },
  ];
  const examCols: Column<(typeof exams)[number]>[] = [
    { key: "s", header: "Subject", sort: (r) => r.s.name, render: (r) => <span className="text-white">{r.s.name} <span className="text-xs text-slate-500">{r.s.code} · {state.batches.find((b) => b.id === r.s.batchId)?.name}</span></span> },
    { key: "target", header: "Syllabus target", render: (r) => fmtDate(r.s.targetDate) },
    { key: "exam", header: "Exam date", sort: (r) => r.s.examDate, render: (r) => <Input aria-label={`Exam date for ${r.s.name}`} type="date" className="h-8 w-40 py-0" value={r.s.examDate} onChange={(e) => { const v = e.target.value; if (parseISO(v) === null) return; if ((diffDays(r.s.targetDate, v) ?? 0) < 0) { toast("error", "Exam cannot be before the syllabus target date"); return; } upsert("subjects", { ...r.s, examDate: v }); }} /> },
  ];
  return (
    <div className="space-y-4">
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "holidays", label: "Holidays" }, { id: "exams", label: "Exam dates" }, { id: "grid", label: "Working-day calendar" }]} />
      {tab === "holidays" && <EntityManager<Holiday> title="Holidays" subtitle="Holidays remove teaching hours from every affected subject." noun="holiday" collection="holidays" rows={state.holidays} columns={holCols} searchText={(r) => `${r.name} ${r.date}`}
        blank={() => ({ date: "", name: "", campusId: "all" })} fields={[{ key: "name", label: "Occasion", type: "text", required: true }, { key: "date", label: "Date", type: "date", required: true }, { key: "campusId", label: "Applies to", type: "select", required: true, options: [{ value: "all", label: "All campuses" }, ...state.campuses.map((c) => ({ value: c.id, label: c.name }))] }]} />}
      {tab === "exams" && <Card pad={false} title="Examination dates" subtitle="Edit a date inline. Buffer ratios and warnings update immediately."><DataTable rows={exams} columns={examCols} searchText={(r) => r.s.name + r.s.code} /></Card>}
      {tab === "grid" && <Card title="Working days" subtitle="Which days have classes. Saturdays count only if a subject has a Saturday slot." action={<Select aria-label="Campus" value={campus} onChange={(e) => setCampus(e.target.value)} className="h-8 w-auto py-0 text-xs">{state.campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}><CalendarGrid campus={campus} /></Card>}
    </div>
  );
}

function CalendarGrid({ campus }: { campus: string }) {
  const { state } = useStore();
  const subs = state.subjects.filter((s) => s.campusId === campus);
  const days = (m: string) => { const first = `2026-${m}-01`; const lead = (weekday(first) + 6) % 7; const n = new Date(Date.UTC(2026, Number(m), 0)).getUTCDate(); return { first, lead, n }; };
  const info = (d: string) => ({ hol: state.holidays.find((h) => d === h.date && (h.campusId === "all" || h.campusId === campus)), exam: subs.filter((s) => s.examDate === d), classes: subs.reduce((n, s) => n + s.slots.filter((x) => x.day % 7 === weekday(d)).length, 0), sat: weekday(d) === 6 });
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {["10", "11", "12"].map((m) => { const { first, lead, n } = days(m); return (
        <div key={m}><p className="mb-2 text-sm font-medium text-white">{new Date(first + "T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500">{["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <span key={i}>{x}</span>)}
            {Array.from({ length: lead }).map((_, i) => <span key={"e" + i} />)}
            {Array.from({ length: n }).map((_, i) => { const d = addDays(first, i); const f = info(d); const today = d === DEMO_TODAY; return (
              <span key={d} title={f.hol?.name ?? (f.exam.length ? `Exam: ${f.exam.map((e) => e.name).join(", ")}` : `${f.classes} class slots`)} className={cn("grid aspect-square place-items-center rounded-md text-[11px]", f.hol ? "bg-amber-500/15 text-amber-300" : f.exam.length ? "bg-red-500/15 text-red-300" : f.classes ? "bg-indigo-500/10 text-slate-200" : "text-slate-600", today && "ring-1 ring-white", f.sat && f.classes > 0 && "underline decoration-indigo-400")}>{i + 1}</span>); })}</div></div>); })}
      <p className="col-span-full flex flex-wrap gap-4 text-[11px] text-slate-500"><span><b className="text-amber-300">■</b> Holiday</span><span><b className="text-red-300">■</b> Exam</span><span><b className="text-indigo-300">■</b> Class day</span><span>Underline: working Saturday</span><span>Ring: demo today</span><span>{DAY_NAMES[1]}–{DAY_NAMES[5]} default week</span></p>
    </div>
  );
}

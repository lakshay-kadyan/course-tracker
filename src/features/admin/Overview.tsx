"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Building2, GraduationCap, Layers, BookOpen, Users, Gauge, Target } from "lucide-react";
import { Card, Stat } from "@/components/ui";
import { HealthDonut, HorizontalBars, PlannedVsActual } from "@/components/ui/charts";
import { CourseHealthMatrix } from "../shared/Matrix";
import { useScopedSubjects, useStore } from "@/lib/store";
import { HEALTH_META, healthCounts } from "@/lib/engine";
import { avg, weightedCoverage } from "../shared/insights";

export function AdminOverview() {
  const items = useScopedSubjects();
  const { state } = useStore();
  const counts = healthCounts(items.map((i) => i.m));
  const students = state.campuses.reduce((n, c) => n + c.students, 0);

  const campusBars = state.campuses.map((c) => {
    const its = items.filter((i) => i.subject.campusId === c.id);
    return { name: c.city, value: weightedCoverage(its) };
  });
  const util = useMemo(() => state.faculty.map((f) => {
    const load = state.subjects.filter((s) => s.facultyId === f.id).reduce((n, s) => n + s.slots.reduce((a, x) => a + x.hours, 0), 0);
    const pct = Math.round((load / f.weeklyCapacity) * 100);
    return { name: f.name.replace("Dr. ", ""), value: pct, color: pct > 100 ? HEALTH_META.DANGER.hex : pct > 85 ? HEALTH_META.TIGHT.hex : "#818cf8" };
  }).sort((a, b) => b.value - a.value).slice(0, 8), [state.faculty, state.subjects]);
  const progression = items.filter((i) => i.subject.campusId === "blr").map((i) => ({ name: i.subject.name.split(" ")[0], planned: i.m.plannedProgressPct, actual: i.m.completionPct }));
  const scores = useMemo(() => {
    const by = new Map<string, { s: number; t: number }>();
    state.attempts.forEach((a) => { const v = by.get(a.subjectId) ?? { s: 0, t: 0 }; by.set(a.subjectId, { s: v.s + a.score, t: v.t + a.total }); });
    return [...by.entries()].map(([id, v]) => ({ name: state.subjects.find((s) => s.id === id)?.name ?? id, value: Math.round((v.s / v.t) * 100) }));
  }, [state.attempts, state.subjects]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Campuses" value={state.campuses.length} icon={<Building2 className="h-4 w-4" />} />
        <Stat label="Active batches" value={state.batches.length} icon={<Layers className="h-4 w-4" />} />
        <Stat label="Subjects" value={state.subjects.length} icon={<BookOpen className="h-4 w-4" />} />
        <Stat label="Faculty" value={state.faculty.length} icon={<Users className="h-4 w-4" />} />
        <Stat label="Students" value={students} icon={<GraduationCap className="h-4 w-4" />} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Academic health distribution" subtitle="Computed live from topics, timetable and holidays"><HealthDonut counts={counts} /></Card>
        <Card title="Institution readiness" subtitle="Hours-weighted across all campuses">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Syllabus coverage" value={`${weightedCoverage(items)}%`} icon={<Gauge className="h-4 w-4" />} />
            <Stat label="Exam readiness" value={`${avg(items.map((i) => i.m.scopeCoveragePct))}%`} hint="Avg. exam scope" icon={<Target className="h-4 w-4" />} />
          </div>
          <div className="mt-4"><p className="mb-1 text-xs text-slate-400">Coverage by campus</p><HorizontalBars data={campusBars} height={120} /></div>
        </Card>
        <Card title="Faculty utilization" subtitle="Scheduled weekly hours vs capacity. Amber over 85%, red over 100%."><HorizontalBars data={util} height={250} unit="%" /></Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Subject progression: Bengaluru" subtitle="Planned (timetable-based) vs actual (verified sessions)"><PlannedVsActual data={progression} /></Card>
        <Card title="Academic performance" subtitle="Average practice-quiz score by subject (student attempts in this demo)">
          {scores.length ? <HorizontalBars data={scores} height={240} /> : <p className="py-10 text-center text-sm text-slate-500">No practice attempts yet. Sign in as Student (demo) and complete a quiz to see scores here.</p>}
        </Card>
      </div>
      <Card pad={false} title="Course Health Matrix: all campuses" subtitle={<>Drill into any subject. Manage inputs in <Link className="text-indigo-300 hover:underline" href="/app/admin/subjects">Subjects</Link> and <Link className="text-indigo-300 hover:underline" href="/app/admin/curriculum">Curriculum</Link>.</>}>
        <CourseHealthMatrix items={items} role="admin" />
      </Card>
    </div>
  );
}

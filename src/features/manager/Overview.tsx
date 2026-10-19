"use client";
import { useMemo } from "react";
import { AlertTriangle, CalendarX2, CheckCircle2, Gauge, GraduationCap, Target } from "lucide-react";
import { Card, Stat } from "@/components/ui";
import { useScopedSubjects, useStore } from "@/lib/store";
import { healthCounts } from "@/lib/engine";
import { CourseHealthMatrix } from "../shared/Matrix";
import { ReportWidget, WarningFeed } from "../shared/blocks";
import { avg, buildWarnings, buildWeeklyReport, weightedCoverage } from "../shared/insights";
import { PlannedVsActual } from "@/components/ui/charts";

export function ManagerOverview() {
  const items = useScopedSubjects();
  const { state } = useStore();
  const counts = healthCounts(items.map((i) => i.m));
  const warnings = useMemo(() => buildWarnings(items, state.sessions, state.holidays), [items, state.sessions, state.holidays]);
  const report = useMemo(() => buildWeeklyReport(items, state.sessions), [items, state.sessions]);
  const ids = new Set(items.map((i) => i.subject.id));
  const missed = state.sessions.filter((s) => ids.has(s.subjectId) && s.status === "missed").length;
  const pending = state.sessions.filter((s) => ids.has(s.subjectId) && s.status === "pending").length;
  const chart = items.filter((i) => i.subject.batchId === "b1").map((i) => ({ name: i.subject.name.split(" ")[0], planned: i.m.plannedProgressPct, actual: i.m.completionPct }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Syllabus coverage" value={`${weightedCoverage(items)}%`} hint="Hours-weighted" icon={<Gauge className="h-4 w-4" />} />
        <Stat label="Exam-scope readiness" value={`${avg(items.map((i) => i.m.scopeCoveragePct))}%`} hint="Avg. scope covered" icon={<Target className="h-4 w-4" />} />
        <Stat label="On track / Complete" value={`${counts.ON_TRACK} / ${counts.COMPLETE}`} hint="Subjects" icon={<CheckCircle2 className="h-4 w-4" />} tone="text-emerald-400" />
        <Stat label="Tight / Danger" value={`${counts.TIGHT} / ${counts.DANGER}`} hint="Need attention" icon={<AlertTriangle className="h-4 w-4" />} tone="text-amber-400" />
        <Stat label="Missed sessions" value={missed} hint="Not held" icon={<CalendarX2 className="h-4 w-4" />} tone="text-red-400" />
        <Stat label="Pending records" value={pending} hint="Awaiting faculty" icon={<GraduationCap className="h-4 w-4" />} />
      </div>
      <Card pad={false} title="Course Health Matrix" subtitle="Click a subject to drill down: Campus → Batch → Subject → Faculty → Session → Topic. Predictions are mock projections."><CourseHealthMatrix items={items} role="manager" /></Card>
      <div className="grid gap-5 xl:grid-cols-5">
        <Card pad={false} className="xl:col-span-3" title="Early-Warning Feed" subtitle={`${warnings.length} active signals, highest severity first`}><WarningFeed warnings={warnings} role="manager" limit={5} more="/app/manager/warnings" /></Card>
        <div className="space-y-5 xl:col-span-2"><ReportWidget report={report} href="/app/manager/report" />
          <Card title="First-year A: planned vs actual" subtitle="BLR-CS-2026 A"><PlannedVsActual data={chart} height={190} /></Card></div>
      </div>
    </div>
  );
}

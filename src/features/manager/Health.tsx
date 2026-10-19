"use client";
import { Card } from "@/components/ui";
import { PlannedVsActual } from "@/components/ui/charts";
import { useScopedSubjects } from "@/lib/store";
import { CourseHealthMatrix } from "../shared/Matrix";

export function HealthPage() {
  const items = useScopedSubjects();
  const chart = items.filter((i) => i.m.health !== "COMPLETE").map((i) => ({ name: `${i.subject.name.split(" ")[0]} ${i.subject.batchId.toUpperCase()}`, planned: i.m.plannedProgressPct, actual: i.m.completionPct }));
  return (
    <div className="space-y-5">
      <Card pad={false} title="Course Health Matrix" subtitle="Buffer ratio = available teaching hours ÷ remaining required hours. ON TRACK ≥ 1.15 · TIGHT 1.00–1.14 · DANGER < 1.00."><CourseHealthMatrix items={items} role="manager" pageSize={10} /></Card>
      <Card title="Planned vs actual completion" subtitle="Open subjects only. Bars show syllabus completion against the lesson plan."><PlannedVsActual data={chart} height={280} /></Card>
    </div>
  );
}

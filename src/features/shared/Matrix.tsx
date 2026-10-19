"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button, HealthBadge, Progress, Select, Tooltip } from "@/components/ui";
import { subjectHref } from "@/components/shell/nav";
import { HEALTH_META } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Health, Role } from "@/lib/types";
import { downloadCSV, fmtDate } from "@/lib/utils";
import type { Item } from "./insights";

export function CourseHealthMatrix({ items, role, pageSize = 8 }: { items: Item[]; role: Role; pageSize?: number }) {
  const { state } = useStore();
  const [batch, setBatch] = useState("all");
  const [health, setHealth] = useState<"all" | Health>("all");
  const batches = useMemo(() => state.batches.filter((b) => items.some((i) => i.subject.batchId === b.id)), [state.batches, items]);
  const rows = items.filter((i) => (batch === "all" || i.subject.batchId === batch) && (health === "all" || i.m.health === health)).map((i) => ({ ...i, id: i.subject.id }));
  const fac = (id: string) => state.faculty.find((f) => f.id === id)?.name ?? "Unassigned";
  const bat = (id: string) => state.batches.find((b) => b.id === id)?.name ?? "";

  const cols: Column<(typeof rows)[number]>[] = [
    { key: "subject", header: "Subject", sort: (r) => r.subject.name, render: (r) => <Link href={subjectHref(role, r.subject.id)} className="group block"><span className="font-medium text-white group-hover:text-indigo-300">{r.subject.name}</span><span className="block text-[11px] text-slate-500">{r.subject.code} · {bat(r.subject.batchId)}</span></Link> },
    { key: "faculty", header: "Faculty", sort: (r) => fac(r.subject.facultyId), render: (r) => <span className="text-slate-300">{fac(r.subject.facultyId)}</span> },
    { key: "progress", header: "Planned vs actual", sort: (r) => r.m.completionPct, className: "min-w-[150px]", render: (r) => (
      <div className="space-y-1"><div className="flex justify-between text-[11px] tabular-nums"><span className="text-white">{r.m.completionPct}%</span><span className="text-slate-500">plan {r.m.plannedProgressPct}%</span></div><Progress value={r.m.completionPct} planned={r.m.plannedProgressPct} color={HEALTH_META[r.m.health].hex} label={`${r.subject.name} completion`} /></div>) },
    { key: "hours", header: "Hours P / C / R / A", className: "whitespace-nowrap tabular-nums", render: (r) => <Tooltip text="Planned / Covered / Remaining / Available before target date"><span className="text-slate-300">{r.m.plannedHours} / {r.m.coveredHours} / <b className="text-white">{r.m.remainingHours}</b> / {r.m.availableHours}</span></Tooltip> },
    { key: "buffer", header: "Buffer", align: "right", sort: (r) => r.m.bufferRatio ?? 99, render: (r) => <span className={r.m.health === "COMPLETE" ? "text-slate-500" : "font-semibold text-white"}>{r.m.bufferRatio === null ? "—" : r.m.bufferRatio.toFixed(2)}</span> },
    { key: "predicted", header: "Predicted finish (mock)", sort: (r) => r.m.predictedCompletion ?? "9999", className: "whitespace-nowrap", render: (r) => r.m.health === "COMPLETE" ? <span className="text-slate-500">Done</span> : <Tooltip text={`Target ${fmtDate(r.subject.targetDate)}`}><span className={r.m.predictedLate ? "text-red-300" : "text-slate-300"}>{fmtDate(r.m.predictedCompletion)}</span></Tooltip> },
    { key: "status", header: "Status", sort: (r) => r.m.health, render: (r) => <HealthBadge health={r.m.health} /> },
  ];
  return (
    <DataTable rows={rows} columns={cols} pageSize={pageSize} searchText={(r) => `${r.subject.name} ${r.subject.code} ${fac(r.subject.facultyId)}`} rowLabel={(r) => `Open ${r.subject.name}`}
      toolbar={<>
        <Select aria-label="Filter by batch" value={batch} onChange={(e) => setBatch(e.target.value)} className="h-9 w-auto py-0"><option value="all">All batches</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
        <Select aria-label="Filter by status" value={health} onChange={(e) => setHealth(e.target.value as "all" | Health)} className="h-9 w-auto py-0"><option value="all">All statuses</option>{(Object.keys(HEALTH_META) as Health[]).map((h) => <option key={h} value={h}>{HEALTH_META[h].label}</option>)}</Select>
        <Button size="sm" onClick={() => downloadCSV("course-health.csv", rows.map((r) => ({ Subject: r.subject.name, Code: r.subject.code, Batch: bat(r.subject.batchId), Faculty: fac(r.subject.facultyId), "Completion %": r.m.completionPct, "Planned h": r.m.plannedHours, "Covered h": r.m.coveredHours, "Remaining h": r.m.remainingHours, "Available h": r.m.availableHours, Buffer: r.m.bufferRatio ?? "", Predicted: r.m.predictedCompletion ?? "", Status: HEALTH_META[r.m.health].label })))}><Download className="h-3.5 w-3.5" />Export</Button>
      </>} />
  );
}

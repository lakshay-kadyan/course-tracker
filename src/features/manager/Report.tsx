"use client";
import { useMemo, useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { Button, Card, HealthBadge, Select, useToast } from "@/components/ui";
import { PaceChart } from "@/components/ui/charts";
import { useScopedSubjects, useStore } from "@/lib/store";
import { fmtDate } from "@/lib/utils";
import { buildWeeklyReport, weeklySeries } from "../shared/insights";

export function ReportPage() {
  const all = useScopedSubjects();
  const { state } = useStore();
  const toast = useToast();
  const [batch, setBatch] = useState("all");
  const items = all.filter((i) => batch === "all" || i.subject.batchId === batch);
  const report = useMemo(() => buildWeeklyReport(items, state.sessions), [items, state.sessions]);
  const batches = state.batches.filter((b) => all.some((i) => i.subject.batchId === b.id));
  const download = () => {
    const txt = [`Weekly Academic Report (demo) — ${fmtDate(report.generatedFor, true)}`, "", report.headline, "", ...report.recommendations.map((r) => `- ${r.subject}: ${r.text}`)].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" })); a.download = "weekly-report.txt"; a.click(); toast("success", "Report downloaded");
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-slate-400"><Sparkles className="h-4 w-4 text-violet-300" />Week of {fmtDate(report.generatedFor, true)} · rule-based demo, no AI model connected</p>
        <div className="flex gap-2"><Select aria-label="Filter by batch" value={batch} onChange={(e) => setBatch(e.target.value)} className="h-9 w-auto py-0"><option value="all">All batches</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select><Button onClick={download}><Download className="h-4 w-4" />Download</Button></div>
      </div>
      <Card className="border-indigo-500/20 bg-gradient-to-br from-[#12193a] to-panel" title="Summary"><p className="text-base leading-relaxed text-slate-100">{report.headline}</p></Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Recommended actions" subtitle="Ordered by lowest buffer ratio first">
          {report.recommendations.length === 0 ? <p className="text-sm text-slate-400">No interventions needed this week.</p> : (
            <ul className="space-y-3">{report.recommendations.map((r) => { const it = items.find((i) => i.subject.id === r.subjectId)!; return (
              <li key={r.subjectId} className="rounded-lg border border-line bg-black/20 p-3"><div className="mb-1 flex items-center justify-between gap-2"><span className="text-sm font-medium text-white">{r.subject} <span className="text-xs text-slate-500">{it.subject.code}</span></span><HealthBadge health={it.m.health} /></div><p className="text-xs leading-relaxed text-slate-300">{r.text}</p></li>); })}</ul>)}
        </Card>
        <div className="space-y-5">
          {report.highest && <Card title={`Pace: ${report.highest.subject.name}`} subtitle="Illustrative weekly series around the measured average"><PaceChart data={weeklySeries(report.highest.m)} /></Card>}
          <Card title="What is going well">{report.wins.length ? <ul className="space-y-1.5 text-sm text-slate-300">{report.wins.map((w) => <li key={w}>• {w}</li>)}</ul> : <p className="text-sm text-slate-400">Nothing to highlight yet.</p>}</Card>
        </div>
      </div>
    </div>
  );
}

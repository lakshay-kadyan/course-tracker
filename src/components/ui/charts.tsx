"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HEALTH_META } from "@/lib/engine";
import type { Health } from "@/lib/types";

const axis = { stroke: "#475569", fontSize: 11, tickLine: false, axisLine: false } as const;
const tip = { contentStyle: { background: "#0d1426", border: "1px solid #1e293b", borderRadius: 10, fontSize: 12, color: "#e2e8f0" }, labelStyle: { color: "#94a3b8" }, cursor: { fill: "rgba(99,102,241,.08)" } };

export function HealthDonut({ counts }: { counts: Record<Health, number> }) {
  const data = (Object.keys(counts) as Health[]).map((h) => ({ name: HEALTH_META[h].label, value: counts[h], color: HEALTH_META[h].hex }));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={data} dataKey="value" innerRadius={44} outerRadius={64} paddingAngle={2} stroke="none">{data.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip {...tip} /></PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold text-white">{total}</span><span className="text-[10px] uppercase tracking-wider text-slate-500">subjects</span></div>
      </div>
      <ul className="space-y-1.5 text-sm">{data.map((d) => <li key={d.name} className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} /><span className="w-20 text-xs text-slate-400">{d.name}</span><span className="tabular-nums">{d.value}</span></li>)}</ul>
    </div>
  );
}

export interface ProgressDatum { name: string; planned: number; actual: number; scope?: number }
export function PlannedVsActual({ data, height = 260 }: { data: ProgressDatum[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Planned versus actual syllabus completion by subject">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -18, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#1e293b" />
          <XAxis dataKey="name" {...axis} interval={0} tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis {...axis} domain={[0, 100]} unit="%" />
          <Tooltip {...tip} formatter={(v) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} iconType="circle" />
          <Bar dataKey="planned" name="Planned" fill="#334155" radius={[4, 4, 0, 0]} />
          <Bar dataKey="actual" name="Actual" fill="#818cf8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBars({ data, height = 240, color = "#818cf8", unit = "%" }: { data: { name: string; value: number; color?: string }[]; height?: number; color?: string; unit?: string }) {
  return (
    <div style={{ height }} role="img" aria-label="Bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#1e293b" />
          <XAxis type="number" {...axis} domain={[0, 100]} unit={unit} />
          <YAxis type="category" dataKey="name" {...axis} width={110} tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <Tooltip {...tip} formatter={(v) => `${v}${unit}`} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>{data.map((d, i) => <Cell key={i} fill={d.color ?? color} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaceChart({ data, height = 220 }: { data: { week: string; actual: number; required: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Weekly teaching hours versus required pace">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#1e293b" />
          <XAxis dataKey="week" {...axis} />
          <YAxis {...axis} unit="h" />
          <Tooltip {...tip} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} iconType="circle" />
          <Line dataKey="actual" name="Delivered h/wk" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
          <Line dataKey="required" name="Required h/wk" stroke="#f87171" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export { ReferenceLine };

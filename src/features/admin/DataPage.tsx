"use client";
import { useMemo, useState } from "react";
import { Download, FileUp, RotateCcw, Upload } from "lucide-react";
import { Button, Card, ConfirmDialog, Pill, Select, Textarea, useToast } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Collection } from "@/lib/types";
import { downloadCSV, parseCSV, parseISO, uid } from "@/lib/utils";

type Kind = "campuses" | "batches" | "faculty" | "holidays";
interface Spec { label: string; cols: string[]; sample: string; build: (r: Record<string, string>, ctx: Ctx) => { rec?: Record<string, unknown>; error?: string } }
interface Ctx { campuses: { id: string; name: string }[] }
const num = (s: string) => (s.trim() !== "" && Number.isFinite(Number(s)) ? Number(s) : null);
const campusId = (v: string, c: Ctx) => c.campuses.find((x) => x.id === v || x.name.toLowerCase() === v.toLowerCase())?.id;

const SPECS: Record<Kind, Spec> = {
  campuses: { label: "Campuses", cols: ["name", "city", "head", "students"], sample: "name,city,head,students\nChennai Campus,Chennai,Anita Rao,60",
    build: (r) => { const s = num(r.students); return !r.name || !r.city ? { error: "name and city are required" } : s === null || s < 0 ? { error: "students must be a number ≥ 0" } : { rec: { name: r.name, city: r.city, head: r.head, students: s } }; } },
  batches: { label: "Batches", cols: ["name", "campus", "semester", "students", "startDate", "endDate"], sample: "name,campus,semester,students,startDate,endDate\nBLR-CS-2026 B,blr,Semester 1,65,2026-08-03,2026-12-18",
    build: (r, c) => { const cid = campusId(r.campus, c); const s = num(r.students);
      if (!r.name) return { error: "name is required" }; if (!cid) return { error: `unknown campus “${r.campus}”` }; if (s === null) return { error: "students must be a number" };
      if (parseISO(r.startDate) === null || parseISO(r.endDate) === null) return { error: "dates must be YYYY-MM-DD" }; if (r.endDate <= r.startDate) return { error: "endDate must be after startDate" };
      return { rec: { name: r.name, campusId: cid, semester: r.semester, students: s, startDate: r.startDate, endDate: r.endDate } }; } },
  faculty: { label: "Faculty", cols: ["name", "email", "campus", "weeklyCapacity", "specialty"], sample: "name,email,campus,weeklyCapacity,specialty\nDr. Meera Das,meera.das@mirai.demo,blr,12,Biology",
    build: (r, c) => { const cid = campusId(r.campus, c); const w = num(r.weeklyCapacity);
      if (!r.name) return { error: "name is required" }; if (!/^\S+@\S+\.\S+$/.test(r.email)) return { error: "invalid email" }; if (!cid) return { error: `unknown campus “${r.campus}”` }; if (w === null || w < 1 || w > 40) return { error: "weeklyCapacity must be 1–40" };
      return { rec: { name: r.name, email: r.email, campusId: cid, weeklyCapacity: w, specialty: r.specialty } }; } },
  holidays: { label: "Holidays", cols: ["name", "date", "campus"], sample: "name,date,campus\nFoundation Day,2026-11-20,all",
    build: (r, c) => { const cid = r.campus === "all" ? "all" : campusId(r.campus, c);
      if (!r.name) return { error: "name is required" }; if (parseISO(r.date) === null) return { error: "date must be YYYY-MM-DD" }; if (!cid) return { error: `unknown campus “${r.campus}”` };
      return { rec: { name: r.name, date: r.date, campusId: cid } }; } },
};

export function DataPage() {
  const { state, metrics, upsert, reset, cloud } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("faculty");
  const [text, setText] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const spec = SPECS[kind];

  const preview = useMemo(() => {
    const rows = text.trim() ? parseCSV(text) : [];
    const missing = rows.length ? spec.cols.filter((c) => !(c in rows[0])) : [];
    return { missing, items: missing.length ? [] : rows.map((r, i) => ({ line: i + 2, row: r, ...spec.build(r, state) })) };
  }, [text, spec, state]);
  const valid = preview.items.filter((i) => i.rec);

  const exports: { label: string; file: string; rows: () => Record<string, string | number>[] }[] = [
    { label: "Course health", file: "course-health.csv", rows: () => state.subjects.map((s) => { const m = metrics[s.id]; return { subject: s.name, code: s.code, batch: state.batches.find((b) => b.id === s.batchId)?.name ?? "", faculty: state.faculty.find((f) => f.id === s.facultyId)?.name ?? "", plannedHours: m.plannedHours, coveredHours: m.coveredHours, remainingHours: m.remainingHours, availableHours: m.availableHours, bufferRatio: m.bufferRatio ?? "", health: m.health, predictedCompletion: m.predictedCompletion ?? "" }; }) },
    { label: "Faculty", file: "faculty.csv", rows: () => state.faculty.map((f) => ({ name: f.name, email: f.email, campus: f.campusId, weeklyCapacity: f.weeklyCapacity, specialty: f.specialty })) },
    { label: "Sessions", file: "sessions.csv", rows: () => state.sessions.map((s) => ({ date: s.date, subject: state.subjects.find((x) => x.id === s.subjectId)?.name ?? "", status: s.status, source: s.source, hours: s.hours, summary: s.summary })) },
    { label: "Holidays", file: "holidays.csv", rows: () => state.holidays.map((h) => ({ name: h.name, date: h.date, campus: h.campusId })) },
  ];
  const doImport = () => {
    valid.forEach((i) => upsert(kind as Collection, { ...i.rec, id: uid(kind.slice(0, 3)) } as { id: string }));
    toast("success", `Imported ${valid.length} ${spec.label.toLowerCase()} record${valid.length === 1 ? "" : "s"}`);
    setText("");
  };
  const readFile = (f?: File) => { if (!f) return; if (f.size > 500_000) { toast("error", "File is too large for the demo importer (500 KB max)"); return; } f.text().then(setText); };

  return (
    <div className="space-y-5">
      <Card title="Export data" subtitle="Download the current local demo data as CSV.">
        <div className="flex flex-wrap gap-2">{exports.map((e) => <Button key={e.file} onClick={() => { const r = e.rows(); if (!r.length) { toast("error", `No ${e.label.toLowerCase()} to export`); return; } downloadCSV(e.file, r); toast("success", `${e.file} downloaded`); }}><Download className="h-4 w-4" />{e.label}</Button>)}</div>
      </Card>
      <Card title="Import CSV" subtitle="Everything is validated in your browser and saved to local demo data only. Nothing is uploaded."
        action={<Select aria-label="Record type" className="h-9 w-auto" value={kind} onChange={(e) => { setKind(e.target.value as Kind); setText(""); }}>{(Object.keys(SPECS) as Kind[]).map((k) => <option key={k} value={k}>{SPECS[k].label}</option>)}</Select>}>
        <p className="text-xs text-slate-400">Required columns: <code className="text-slate-200">{spec.cols.join(", ")}</code>. Campus can be an id (e.g. <code>blr</code>) or exact name.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 text-xs font-medium text-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/40 hover:border-slate-600"><FileUp className="h-3.5 w-3.5" />Choose .csv file<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
          <Button size="sm" onClick={() => setText(spec.sample)}>Load sample</Button>
          <Button size="sm" variant="ghost" onClick={() => downloadCSV(`${kind}-template.csv`, [Object.fromEntries(spec.cols.map((c) => [c, ""]))])}>Download template</Button>
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-300" htmlFor="csv-text">CSV content</label>
        <Textarea id="csv-text" className="mt-1.5 min-h-32 font-mono text-xs" placeholder="Paste CSV with a header row…" value={text} onChange={(e) => setText(e.target.value)} />
        {preview.missing.length > 0 && <p role="alert" className="mt-3 text-xs text-red-400">Missing required column{preview.missing.length > 1 ? "s" : ""}: {preview.missing.join(", ")}</p>}
        {preview.items.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[520px] text-left text-xs"><thead><tr className="border-b border-line text-[11px] uppercase tracking-wider text-slate-500"><th className="px-3 py-2">Line</th><th className="px-3 py-2">Record</th><th className="px-3 py-2">Result</th></tr></thead>
              <tbody>{preview.items.slice(0, 50).map((i) => <tr key={i.line} className="border-b border-line/50 last:border-0"><td className="px-3 py-2 text-slate-500">{i.line}</td><td className="px-3 py-2 text-slate-200">{i.row[spec.cols[0]]}</td><td className="px-3 py-2">{i.rec ? <Pill tone="green">Valid</Pill> : <Pill tone="red">{i.error}</Pill>}</td></tr>)}</tbody></table>
          </div>)}
        <div className="mt-4 flex items-center gap-3"><Button variant="primary" disabled={!valid.length} onClick={doImport}><Upload className="h-4 w-4" />Import {valid.length || ""} valid row{valid.length === 1 ? "" : "s"}</Button>
          {preview.items.length > valid.length && <span className="text-xs text-amber-300">{preview.items.length - valid.length} row(s) with errors will be skipped</span>}</div>
      </Card>
      {!cloud && <Card title="Reset demo data" subtitle="Restores the original sample dataset and clears all local changes, sessions and quiz attempts.">
        <Button variant="danger" onClick={() => setConfirmReset(true)}><RotateCcw className="h-4 w-4" />Reset to sample data</Button>
      </Card>}
      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} danger confirmLabel="Reset" title="Reset all demo data?" message="Every change you made in this browser will be lost." onConfirm={() => { reset(); toast("success", "Demo data restored"); }} />
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Field, HealthBadge, Input, Modal, Select, Stat, useToast } from "@/components/ui";
import { useStore } from "@/lib/store";
import { DAY_NAMES, cn, uid } from "@/lib/utils";

const DAYS = [1, 2, 3, 4, 5, 6];
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const endOf = (start: string, hours: number) => { const t = toMin(start) + hours * 60; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

export function TimetablePage() {
  const { state, metrics, upsert } = useStore();
  const toast = useToast();
  const [campus, setCampus] = useState("blr");
  const subs = state.subjects.filter((s) => s.campusId === campus);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ subjectId: "", day: "1", start: "09:00", hours: "2" });
  const [err, setErr] = useState<Record<string, string>>({});

  const rows = useMemo(() => subs.flatMap((s) => s.slots.map((x) => ({ s, x }))), [subs]);
  const facName = (id: string) => state.faculty.find((p) => p.id === id)?.name ?? "—";

  const add = () => {
    const e: Record<string, string> = {};
    const s = state.subjects.find((x) => x.id === f.subjectId);
    const h = Number(f.hours), d = Number(f.day);
    if (!s) e.subjectId = "Choose a subject";
    if (!/^\d{2}:\d{2}$/.test(f.start)) e.start = "Enter a start time";
    if (!Number.isFinite(h) || h <= 0 || h > 4) e.hours = "Hours must be between 0.5 and 4";
    if (s && !e.start && !e.hours) {
      const a0 = toMin(f.start), a1 = a0 + h * 60;
      const clash = state.subjects.filter((o) => o.facultyId === s.facultyId || (o.batchId === s.batchId)).flatMap((o) => o.slots.filter((x) => x.day === d).map((x) => ({ o, x })))
        .find(({ x }) => a0 < toMin(x.start) + x.hours * 60 && toMin(x.start) < a1);
      if (clash) e.start = `Clashes with ${clash.o.name} (${clash.x.start}–${endOf(clash.x.start, clash.x.hours)}) for the same faculty or batch`;
    }
    setErr(e);
    if (Object.keys(e).length || !s) return;
    upsert("subjects", { ...s, slots: [...s.slots, { id: uid("sl"), day: d, start: f.start, hours: h }] });
    toast("success", `Slot added to ${s.name}. Available hours updated.`);
    setOpen(false);
  };
  const removeSlot = (subjectId: string, slotId: string) => {
    const s = state.subjects.find((x) => x.id === subjectId);
    if (s) { upsert("subjects", { ...s, slots: s.slots.filter((x) => x.id !== slotId) }); toast("success", "Slot removed"); }
  };

  return (
    <div className="space-y-5">
      <Card title="Weekly timetable" subtitle="Recurring weekly slots. Holidays are skipped automatically when available hours are calculated."
        action={<div className="flex gap-2"><Select aria-label="Campus" className="h-9 w-auto" value={campus} onChange={(e) => setCampus(e.target.value)}>{state.campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Button variant="primary" size="sm" className="h-9" onClick={() => { setF({ subjectId: subs[0]?.id ?? "", day: "1", start: "09:00", hours: "2" }); setErr({}); setOpen(true); }} disabled={!subs.length}><Plus className="h-3.5 w-3.5" />Add slot</Button></div>}>
        <div className="overflow-x-auto"><div className="grid min-w-[760px] grid-cols-6 gap-2">
          {DAYS.map((d) => (
            <div key={d} className="rounded-lg border border-line/70 bg-black/10 p-2">
              <p className="mb-2 text-xs font-medium text-slate-400">{DAY_NAMES[d]}</p>
              <div className="space-y-1.5">
                {rows.filter((r) => r.x.day === d).sort((a, b) => a.x.start.localeCompare(b.x.start)).map(({ s, x }) => (
                  <div key={x.id} className="group rounded-md border border-indigo-500/20 bg-indigo-500/10 p-2 text-xs">
                    <div className="flex items-start justify-between gap-1"><span className="font-medium text-white">{s.name}</span>
                      <button aria-label={`Remove ${s.name} slot on ${DAY_NAMES[d]} at ${x.start}`} onClick={() => removeSlot(s.id, x.id)} className="rounded p-0.5 text-slate-500 hover:text-red-300"><Trash2 className="h-3 w-3" /></button></div>
                    <p className="text-slate-400">{x.start}–{endOf(x.start, x.hours)} · {x.hours}h</p>
                    <p className="truncate text-slate-500">{facName(s.facultyId)}</p>
                  </div>))}
                {!rows.some((r) => r.x.day === d) && <p className="py-3 text-center text-[11px] text-slate-600">No classes</p>}
              </div>
            </div>))}
        </div></div>
      </Card>
      <Card pad={false} title="Weekly hours by subject" subtitle="Scheduled hours/week against hours still required">
        <div className="grid gap-px bg-line/50 sm:grid-cols-2 xl:grid-cols-3">
          {subs.map((s) => { const m = metrics[s.id]; const wk = s.slots.reduce((n, x) => n + x.hours, 0); return (
            <div key={s.id} className="bg-panel p-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-white">{s.name}</span><HealthBadge health={m.health} /></div>
              <div className="mt-3 grid grid-cols-3 gap-2"><Stat label="Per week" value={`${wk}h`} /><Stat label="Available" value={`${m.availableHours}h`} /><Stat label="Required" value={`${m.remainingHours}h`} /></div>
              <p className={cn("mt-2 text-xs", m.shortfallHours > 0 ? "text-red-300" : "text-slate-500")}>{m.shortfallHours > 0 ? `Shortfall of about ${m.shortfallHours}h before the target date.` : "Enough scheduled hours before the target date."}</p></div>); })}
        </div>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Add timetable slot" description="Slots cannot overlap for the same faculty member or batch." footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={add}>Add slot</Button></>}>
        <form noValidate onSubmit={(e) => { e.preventDefault(); add(); }} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Subject *" error={err.subjectId}>{(a) => <Select {...a} value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })}>{subs.map((s) => <option key={s.id} value={s.id}>{s.name} · {state.batches.find((b) => b.id === s.batchId)?.name}</option>)}</Select>}</Field></div>
          <Field label="Day">{(a) => <Select {...a} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })}>{DAYS.map((d) => <option key={d} value={d}>{DAY_NAMES[d]}{d === 6 ? " (Saturday)" : ""}</option>)}</Select>}</Field>
          <Field label="Start time *" error={err.start}>{(a) => <Input {...a} type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />}</Field>
          <div className="sm:col-span-2"><Field label="Duration (hours) *" error={err.hours}>{(a) => <Input {...a} type="number" step="0.5" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} />}</Field></div>
          <button type="submit" className="hidden" />
        </form>
      </Modal>
    </div>
  );
}

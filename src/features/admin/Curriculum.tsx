"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Card, ConfirmDialog, Field, HealthBadge, Input, Modal, Pill, Progress, Select, Stat, useToast } from "@/components/ui";
import { useStore } from "@/lib/store";
import { lessonPlanDates, unitsOf } from "@/lib/engine";
import type { Subject, Topic } from "@/lib/types";
import { fmtDate, uid } from "@/lib/utils";

type Draft = { unit: string; name: string; plannedHours: string; examScope: boolean };

export function CurriculumPage() {
  const { state, metrics, upsert } = useStore();
  const toast = useToast();
  const [sid, setSid] = useState(state.subjects[0]?.id ?? "");
  const subject = state.subjects.find((s) => s.id === sid) as Subject | undefined;
  const [edit, setEdit] = useState<{ topic: Topic | null } | null>(null);
  const [draft, setDraft] = useState<Draft>({ unit: "", name: "", plannedHours: "1", examScope: true });
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [del, setDel] = useState<Topic | null>(null);

  if (!subject) return <Card><p className="text-sm text-slate-400">No subjects exist. Add one in Subjects first.</p></Card>;
  const m = metrics[subject.id];
  const dates = lessonPlanDates(subject, state.holidays);
  const units = unitsOf(subject.topics);
  const save = (s: Subject) => upsert("subjects", s);

  const open = (t: Topic | null) => {
    setDraft(t ? { unit: t.unit, name: t.name, plannedHours: String(t.plannedHours), examScope: t.examScope } : { unit: units[units.length - 1]?.unit ?? "Unit 1", name: "", plannedHours: "1", examScope: true });
    setErrors({}); setEdit({ topic: t });
  };
  const submit = () => {
    const e: typeof errors = {};
    const h = Number(draft.plannedHours);
    if (!draft.name.trim()) e.name = "Topic name is required";
    if (!draft.unit.trim()) e.unit = "Unit is required";
    if (!Number.isFinite(h) || h <= 0 || h > 20) e.plannedHours = "Enter hours between 0.5 and 20";
    setErrors(e);
    if (Object.keys(e).length) return;
    const base = { unit: draft.unit.trim(), name: draft.name.trim(), plannedHours: h, examScope: draft.examScope };
    const topics = edit?.topic ? subject.topics.map((t) => (t.id === edit.topic!.id ? { ...t, ...base } : t)) : [...subject.topics, { id: uid("t"), pct: 0, ...base }];
    save({ ...subject, topics });
    toast("success", edit?.topic ? "Topic updated. Health recalculated." : "Topic added. Health recalculated.");
    setEdit(null);
  };

  return (
    <div className="space-y-5">
      <Card title="Subject curriculum" subtitle="Units, topics, planned teaching hours and exam scope. Every change recalculates health instantly."
        action={<Select aria-label="Subject" className="h-9 w-auto min-w-56" value={sid} onChange={(e) => setSid(e.target.value)}>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.code} · {state.batches.find((b) => b.id === s.batchId)?.name}</option>)}</Select>}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Planned hours" value={m.plannedHours} />
          <Stat label="Covered" value={m.coveredHours} hint={`${m.completionPct}% complete`} />
          <Stat label="Remaining" value={m.remainingHours} />
          <Stat label="Available hours" value={m.availableHours} hint="Until target date" />
          <Stat label="Health" value={<HealthBadge health={m.health} />} hint={m.bufferRatio === null ? "No buffer ratio" : `Buffer ${m.bufferRatio.toFixed(2)}`} />
        </div>
      </Card>
      <Card pad={false} title="Topics & lesson plan" subtitle="Planned dates assume topics are taught in order across scheduled slots, skipping holidays."
        action={<Button variant="primary" size="sm" onClick={() => open(null)}><Plus className="h-3.5 w-3.5" />Add topic</Button>}>
        {units.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No topics yet. Add the first topic to define the syllabus.</p>}
        {units.map((u) => (
          <div key={u.unit} className="border-b border-line/60 last:border-0">
            <div className="flex flex-wrap items-center gap-3 bg-white/[.02] px-4 py-2.5">
              <span className="text-sm font-medium text-white">{u.unit}</span>
              <span className="text-xs text-slate-500">{u.covered}/{u.planned} h</span>
              <Progress value={u.pct} className="ml-auto max-w-40" label={`${u.unit} progress`} /><span className="w-10 text-right text-xs tabular-nums text-slate-400">{u.pct}%</span>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><tbody>
              {u.topics.map((t) => (
                <tr key={t.id} className="border-t border-line/40 hover:bg-white/[.03]">
                  <td className="px-4 py-2.5 text-slate-200">{t.name}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-slate-400">{t.plannedHours}h</td>
                  <td className="px-2 py-2.5 text-xs text-slate-500">Plan: {fmtDate(dates[t.id])}</td>
                  <td className="px-2 py-2.5 tabular-nums text-xs text-slate-400">{t.pct}%</td>
                  <td className="px-2 py-2.5">{t.examScope ? <Pill tone="indigo">In exam scope</Pill> : <Pill>Out of scope</Pill>}</td>
                  <td className="px-4 py-2.5 text-right"><span className="inline-flex gap-1">
                    <button aria-label={`Edit ${t.name}`} onClick={() => open(t)} className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
                    <button aria-label={`Delete ${t.name}`} onClick={() => setDel(t)} className="rounded p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></span></td>
                </tr>))}
            </tbody></table></div>
          </div>))}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.topic ? "Edit topic" : "Add topic"} description={`${subject.name} · progress is only changed by verified sessions.`} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={submit}>{edit?.topic ? "Save changes" : "Add topic"}</Button></>}>
        <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <Field label="Unit *" error={errors.unit}>{(a) => <Input {...a} list="unit-list" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />}</Field>
          <datalist id="unit-list">{units.map((u) => <option key={u.unit} value={u.unit} />)}</datalist>
          <Field label="Topic name *" error={errors.name}>{(a) => <Input {...a} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}</Field>
          <Field label="Planned teaching hours *" error={errors.plannedHours}>{(a) => <Input {...a} type="number" step="0.5" value={draft.plannedHours} onChange={(e) => setDraft({ ...draft, plannedHours: e.target.value })} />}</Field>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={draft.examScope} onChange={(e) => setDraft({ ...draft, examScope: e.target.checked })} className="h-4 w-4 accent-indigo-500" />Included in examination scope</label>
          <button type="submit" className="hidden" />
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger confirmLabel="Delete topic" title="Delete this topic?" message={del ? `“${del.name}” (${del.plannedHours}h) will be removed from the syllabus. Covered hours and health will be recalculated.` : ""}
        onConfirm={() => { if (del) { save({ ...subject, topics: subject.topics.filter((t) => t.id !== del.id) }); toast("success", "Topic deleted"); } }} />
    </div>
  );
}

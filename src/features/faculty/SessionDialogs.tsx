"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, ConfirmDialog, Field, HealthBadge, Input, Modal, Pill, Select, Textarea, useToast } from "@/components/ui";
import { usePersona, useStore } from "@/lib/store";
import type { Subject } from "@/lib/types";
import { parseISO } from "@/lib/utils";
import { draftToSession, previewImpact, type Draft } from "./proposal";

/** Editable record form, used for "Edit before saving" and for manual entry. */
export function SessionForm({ subject, draft, onChange, errors }: { subject: Subject; draft: Draft; onChange: (d: Draft) => void; errors: Record<string, string> }) {
  const used = new Set(draft.topics.map((t) => t.topicId));
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Class date" error={errors.date}>{(a) => <Input {...a} type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />}</Field>
        <Field label="Hours taught" error={errors.hours}>{(a) => <Input {...a} type="number" step="0.5" min="0.5" max="8" value={draft.hours} onChange={(e) => set({ hours: Number(e.target.value) })} />}</Field>
      </div>
      <fieldset className="space-y-2"><legend className="mb-1 text-xs font-medium text-slate-300">Topics covered</legend>
        {draft.topics.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select aria-label={`Topic ${i + 1}`} value={t.topicId} onChange={(e) => set({ topics: draft.topics.map((x, j) => (j === i ? { ...x, topicId: e.target.value } : x)) })}>
              {subject.topics.filter((x) => x.id === t.topicId || !used.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
            <div className="flex items-center gap-1"><Input aria-label={`Completion percent for topic ${i + 1}`} type="number" min={0} max={100} className="w-20" value={t.pct} onChange={(e) => set({ topics: draft.topics.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)) })} /><span className="text-xs text-slate-500">%</span></div>
            <button type="button" aria-label={`Remove topic ${i + 1}`} onClick={() => set({ topics: draft.topics.filter((_, j) => j !== i) })} className="rounded p-1.5 text-slate-500 hover:bg-white/5 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
          </div>))}
        {errors.topics && <p role="alert" className="text-[11px] text-red-400">{errors.topics}</p>}
        <Button size="sm" disabled={used.size >= subject.topics.length} onClick={() => { const n = subject.topics.find((x) => !used.has(x.id)); if (n) set({ topics: [...draft.topics, { topicId: n.id, pct: 100 }] }); }}><Plus className="h-3.5 w-3.5" />Add topic</Button>
      </fieldset>
      <Field label="Activities">{(a) => <Input {...a} value={draft.activities} onChange={(e) => set({ activities: e.target.value })} placeholder="e.g. Three examples solved" />}</Field>
      <Field label="Homework">{(a) => <Textarea {...a} value={draft.homework} onChange={(e) => set({ homework: e.target.value, homeworkSuggested: false })} placeholder="Optional" />}</Field>
    </div>
  );
}

export function validateDraft(d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (parseISO(d.date) === null) e.date = "Enter a valid date";
  if (!(d.hours > 0 && d.hours <= 8)) e.hours = "Between 0.5 and 8 hours";
  if (d.topics.length === 0) e.topics = "Add at least one topic";
  else if (d.topics.some((t) => !(t.pct >= 0 && t.pct <= 100) || Number.isNaN(t.pct))) e.topics = "Percentages must be between 0 and 100";
  return e;
}

/** AI Verification Modal: Confirm / Edit / Reject. Confirm writes to the local mock dataset only. */
export function VerificationModal({ open, draft, onClose, onSaved, onRejected, startEdit, rejectLabel, title }: { open: boolean; draft: Draft | null; onClose: () => void; onSaved: () => void; onRejected: () => void; startEdit?: boolean; rejectLabel?: string; title?: string }) {
  const { state, saveSession } = useStore();
  const persona = usePersona();
  const toast = useToast();
  const [mode, setMode] = useState<"review" | "edit">("review");
  const [work, setWork] = useState<Draft | null>(draft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState(false);
  useEffect(() => { if (open) { setWork(draft); setMode(startEdit ? "edit" : "review"); setErrors({}); } }, [open, draft, startEdit]);
  const subject = state.subjects.find((s) => s.id === work?.subjectId);
  const impact = useMemo(() => (subject && work ? previewImpact(subject, work, state.holidays) : null), [subject, work, state.holidays]);
  if (!work || !subject) return null;
  const name = (id: string) => subject.topics.find((t) => t.id === id)?.name ?? id;

  const confirm = () => {
    const e = validateDraft(work); setErrors(e);
    if (Object.keys(e).length) { setMode("edit"); return; }
    saveSession(draftToSession(work, persona.facultyId ?? subject.facultyId, subject, persona.name));
    toast("success", `Session saved. ${subject.name} progress updated across dashboards.`); onSaved();
  };
  return (
    <>
      <Modal open={open} onClose={onClose} wide title={title ?? "Verify proposed session record"} description={title ? `${subject.name}. Saved to the local demo dataset on confirm.` : `${subject.name} · ${work.date}. Generated by a demo rule-based parser, not a real AI model. Review before saving.`}
        footer={mode === "review" ? (<>
          <Button variant="danger" onClick={() => setRejecting(true)}><X className="h-4 w-4" />Reject</Button>
          <Button onClick={() => setMode("edit")}><Pencil className="h-4 w-4" />Edit</Button>
          <Button variant="primary" onClick={confirm}><Check className="h-4 w-4" />Confirm</Button></>) : (<>
          <Button onClick={() => { setWork(draft); setMode("review"); setErrors({}); }}>Cancel edits</Button>
          <Button variant="primary" onClick={confirm}><Check className="h-4 w-4" />Save & confirm</Button></>)}>
        {mode === "edit" ? <SessionForm subject={subject} draft={work} onChange={setWork} errors={errors} /> : (
          <div className="space-y-4">
            {work.topics.length === 0 && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">No syllabus topics were recognised in the text. Choose Edit to add them manually.</p>}
            <ul className="space-y-2">{work.topics.map((t) => <li key={t.topicId} className="flex items-center justify-between rounded-lg border border-line bg-black/20 px-3 py-2 text-sm"><span className="text-slate-100">{name(t.topicId)}</span><Pill tone={t.pct >= 100 ? "green" : "indigo"}>{t.pct}% completed</Pill></li>)}</ul>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-black/20 px-3 py-2"><dt className="text-[11px] uppercase tracking-wider text-slate-500">Activities</dt><dd className="mt-0.5 text-slate-100">{work.activities || "—"}</dd></div>
              <div className="rounded-lg border border-line bg-black/20 px-3 py-2"><dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">Homework{work.homeworkSuggested && <Pill tone="amber">suggested</Pill>}</dt><dd className="mt-0.5 text-slate-100">{work.homework || "—"}</dd></div>
            </dl>
            {impact && work.topics.length > 0 && (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-slate-300">
                <p className="mb-1.5 font-medium text-white">Effect on {subject.name} if confirmed (mock projection)</p>
                <div className="flex flex-wrap items-center gap-2">Completion {impact.before.completionPct}% <ArrowRight className="h-3 w-3" /> <b className="text-white">{impact.after.completionPct}%</b><span className="text-slate-600">·</span>Buffer {impact.before.bufferRatio?.toFixed(2) ?? "—"} <ArrowRight className="h-3 w-3" /> <b className="text-white">{impact.after.bufferRatio?.toFixed(2) ?? "—"}</b><HealthBadge health={impact.after.health} /></div>
              </div>)}
          </div>)}
      </Modal>
      <ConfirmDialog open={rejecting} onClose={() => setRejecting(false)} danger confirmLabel="Reject record" title="Reject this proposed record?" message={rejectLabel ?? "The proposal will be discarded and nothing will be saved."} onConfirm={() => { toast("info", "Proposed record discarded"); onRejected(); }} />
    </>
  );
}

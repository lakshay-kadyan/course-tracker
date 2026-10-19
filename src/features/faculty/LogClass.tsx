"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Mic, PenLine, Sparkles, Wand2 } from "lucide-react";
import LiveLectureRecorder from "@/components/LiveLectureRecorder";
import Link from "next/link";
import { Button, Card, Field, Pill, Select, Skeleton, Textarea } from "@/components/ui";
import { DEMO_TODAY } from "@/lib/engine";
import { useScopedSubjects } from "@/lib/store";
import { cn } from "@/lib/utils";
import { proposeFromText, SAMPLE_UPDATE, type Draft } from "./proposal";
import { VerificationModal } from "./SessionDialogs";

const STEPS = ["Lecture input", "Transcript preview", "AI session review", "Faculty verification", "Record saved"];

export function LogClassPage() {
  const items = useScopedSubjects();
  const params = useSearchParams();
  const [subjectId, setSubjectId] = useState(params.get("subject") ?? "s-chem");
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sampleTranscript, setSampleTranscript] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fromMic, setFromMic] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const urlRef = useRef<string | null>(null);
  useEffect(() => () => { timers.current.forEach(clearTimeout); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const subject = items.find((i) => i.subject.id === subjectId)?.subject ?? items[0]?.subject;
  const step = saved ? 4 : open ? 3 : busy ? 2 : text.trim() ? 1 : 0;
  const hours = useMemo(() => subject?.slots.find((s) => s.day === 1)?.hours ?? subject?.slots[0]?.hours ?? 1, [subject]);

  const clearAudio = () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = null; setAudioUrl(null); setSampleTranscript(false); };
  const onRecording = (blob: Blob) => { clearAudio(); const u = URL.createObjectURL(blob); urlRef.current = u; setAudioUrl(u); setSaved(false); setFromMic(true); };
  const generate = () => {
    if (!subject || !text.trim()) return;
    setBusy(true);
    timers.current.push(setTimeout(() => { setDraft(proposeFromText(text, subject, DEMO_TODAY, hours, fromMic ? "voice" : "text")); setBusy(false); setOpen(true); }, 1100));
  };
  const reset = () => { setText(""); clearAudio(); setDraft(null); setOpen(false); setFromMic(false); };

  if (!subject) return <Card><p className="text-sm text-slate-400">No subjects are assigned to you.</p></Card>;
  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Workflow progress">
        {STEPS.map((s, i) => <li key={s} className={cn("flex items-center gap-2 rounded-full border px-3 py-1", i === step ? "border-indigo-400/60 bg-indigo-500/10 text-white" : i < step ? "border-emerald-500/30 text-emerald-300" : "border-line text-slate-500")}><span className="tabular-nums">{i + 1}</span>{s}</li>)}
      </ol>
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title={<span className="flex items-center gap-2"><Mic className="h-4 w-4 text-violet-300" />Voice capture</span>} subtitle="Records with your microphone (with permission). Transcription and AI are not connected yet, so the review below is a rule-based demo."
          action={<Select aria-label="Subject" value={subject.id} onChange={(e) => { setSubjectId(e.target.value); reset(); }} className="h-8 w-auto py-0 text-xs">{items.map((i) => <option key={i.subject.id} value={i.subject.id}>{i.subject.name} · {i.subject.code}</option>)}</Select>}>
          <LiveLectureRecorder onRecordingReady={onRecording} onRecordingStart={clearAudio} />
          {audioUrl && (
            <div className="mt-3 space-y-2 rounded-lg border border-line bg-black/20 p-3">
              <p className="text-xs text-slate-300">Your recording (plays from browser memory only)</p>
              <audio controls src={audioUrl} className="w-full" aria-label="Recorded lecture audio" />
              <p className="text-[11px] text-amber-300">Speech-to-text is not connected in this prototype, so this audio is not transcribed. Type your update below, or insert the sample transcript to try the review flow.</p>
              <Button size="sm" onClick={() => { setText(SAMPLE_UPDATE); setSampleTranscript(true); setFromMic(true); }}><FileText className="h-3.5 w-3.5" />Insert sample transcript (demo)</Button>
            </div>)}
          <div className="mt-4">
            <Field label="Transcript preview / text update" hint="Reliable alternative: type or paste your update here.">{(a) => <Textarea {...a} value={text} onChange={(e) => { setText(e.target.value); setFromMic(false); setSampleTranscript(false); setSaved(false); }} placeholder="Describe what you taught today…" className="min-h-[120px]" />}</Field>
            {sampleTranscript && <p className="mt-1 text-[11px] text-amber-300">This is a sample transcript, not a transcription of your recording. Edit it before generating the review.</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={generate} disabled={!text.trim() || busy}><Wand2 className="h-4 w-4" />Generate session review</Button>
            <Button onClick={() => { setText(SAMPLE_UPDATE); setFromMic(false); setSaved(false); }}><FileText className="h-4 w-4" />Use sample text</Button>
            <Button variant="ghost" onClick={() => setManual(true)}><PenLine className="h-4 w-4" />Manual entry</Button>
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" />AI-generated session review</span>} subtitle="Rule-based demo extraction. Always verify.">
            {busy ? <div className="space-y-2" role="status" aria-label="Generating review"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-16" /></div>
              : saved ? <div className="flex items-start gap-2 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4" /><div><p>Session saved to the local demo dataset.</p><p className="mt-1 text-xs text-slate-400">Subject progress, manager health views and the student lecture feed now reflect it.</p><div className="mt-3 flex gap-2"><Link href="/app/faculty" className="text-xs text-indigo-300 hover:underline">Back to dashboard</Link><button onClick={reset} className="text-xs text-indigo-300 hover:underline">Log another</button></div></div></div>
              : draft ? <div className="space-y-2 text-sm"><p className="text-slate-300">A proposed record is ready with {draft.topics.length} topic{draft.topics.length !== 1 && "s"}.</p><Button variant="primary" size="sm" onClick={() => setOpen(true)}>Open verification</Button></div>
              : <p className="text-sm text-slate-400">Provide a lecture update and generate a review. Nothing is saved until you confirm it.</p>}
          </Card>
          <Card title="Sample update"><p className="text-xs italic leading-relaxed text-slate-400">&ldquo;{SAMPLE_UPDATE}&rdquo;</p><div className="mt-2 flex gap-1.5"><Pill tone="indigo">Chemistry</Pill><Pill>Chemical Bonding</Pill></div></Card>
        </div>
      </div>

      <VerificationModal open={open} draft={draft} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); setSaved(true); setDraft(null); setText(""); clearAudio(); }} onRejected={() => { setOpen(false); setDraft(null); }} />
      <VerificationModal open={manual} startEdit title="Manual session entry" draft={{ subjectId: subject.id, date: DEMO_TODAY, hours, topics: [{ topicId: (subject.topics.find((t) => t.pct < 100) ?? subject.topics[0]).id, pct: 100 }], activities: "", homework: "", source: "manual", transcript: "", explained: [] }} onClose={() => setManual(false)} onSaved={() => { setManual(false); setSaved(true); }} onRejected={() => setManual(false)} rejectLabel="The manual entry will be discarded." />
    </div>
  );
}

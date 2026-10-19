"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Lock, RotateCcw, XCircle } from "lucide-react";
import { Button, Card, EmptyState, Pill, Select, useToast } from "@/components/ui";
import { questions } from "@/lib/questions";
import { useScopedSubjects, useStore } from "@/lib/store";
import { DEMO_TODAY } from "@/lib/engine";
import { cn, fmtDate, uid } from "@/lib/utils";
import type { Question } from "@/lib/types";
import { taughtOn, topicName } from "./helpers";

const TONE = { Easy: "green", Medium: "amber", Hard: "red" } as const;

export function PracticePage() {
  const items = useScopedSubjects();
  const { state, addAttempt } = useStore();
  const toast = useToast();
  const params = useSearchParams();
  const [subjectId, setSubjectId] = useState(params.get("subject") ?? items.find((i) => questions.some((q) => q.subjectId === i.subject.id))?.subject.id ?? "");
  const [diff, setDiff] = useState("all");
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const subject = items.find((i) => i.subject.id === subjectId)?.subject;
  const all = questions.filter((q) => q.subjectId === subjectId);
  const unlocked = all.filter((q) => (subject?.topics.find((t) => t.id === q.topicId)?.pct ?? 0) > 0);
  const locked = all.length - unlocked.length;
  const list = unlocked.filter((q) => diff === "all" || q.difficulty === diff);
  const answered = list.filter((q) => choices[q.id] !== undefined).length;
  const score = list.filter((q) => choices[q.id] === q.answer).length;
  const history = state.attempts.filter((a) => a.subjectId === subjectId);

  const submit = () => {
    if (answered < list.length) { toast("error", `Answer all ${list.length} questions before submitting`); return; }
    addAttempt({ id: uid("at"), date: DEMO_TODAY, subjectId, score, total: list.length, answers: list.map((q) => ({ qid: q.id, choice: choices[q.id], correct: choices[q.id] === q.answer })) });
    setSubmitted(true); toast("success", `Scored ${score}/${list.length}. Saved to practice history.`);
  };
  const retry = () => { setChoices({}); setSubmitted(false); };
  const lecture = (q: Question) => taughtOn(state.sessions, q.subjectId, q.topicId);
  const pick = (id: string, v: number) => { if (!submitted) setChoices((c) => ({ ...c, [id]: v })); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Subject" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); retry(); }} className="w-auto">{items.map((i) => <option key={i.subject.id} value={i.subject.id}>{i.subject.name}</option>)}</Select>
        <Select aria-label="Difficulty" value={diff} onChange={(e) => { setDiff(e.target.value); retry(); }} className="w-auto"><option value="all">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option></Select>
        <span className="text-xs text-slate-500">Demo problem bank. Questions unlock once a related topic has been taught.</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {all.length === 0 ? <Card><EmptyState title="No questions for this subject yet" hint="The demo bank covers Chemistry, Mathematics, Physics and Programming." /></Card>
            : list.length === 0 ? <Card><EmptyState title="No unlocked questions match" hint={locked ? `${locked} question(s) unlock as more topics are taught.` : "Try another difficulty."} /></Card>
            : <>
              {submitted && <div role="status" className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3"><p className="text-sm text-white">Score: <b>{score}/{list.length}</b> ({Math.round((score / list.length) * 100)}%)</p><Button size="sm" onClick={retry}><RotateCcw className="h-3.5 w-3.5" />Try again</Button></div>}
              {list.map((q) => { const c = choices[q.id]; return (
                <Card key={q.id}>
                  <div className="mb-2 flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-slate-400">{q.id}</span><Pill tone={TONE[q.difficulty]}>{q.difficulty}</Pill><Pill>{topicName(subject, q.topicId)}</Pill>{lecture(q) && <span className="text-[11px] text-slate-500">Taught {fmtDate(lecture(q))}</span>}</div>
                  <p className="text-sm font-medium text-white">{q.stem}</p>
                  <div role="radiogroup" aria-label={`${q.id} options`} className="mt-3 grid gap-2">{q.options.map((o, i) => { const right = submitted && i === q.answer; const wrong = submitted && c === i && i !== q.answer; return (
                    <button key={i} role="radio" aria-checked={c === i} onClick={() => pick(q.id, i)} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors", right ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100" : wrong ? "border-red-500/50 bg-red-500/10 text-red-100" : c === i ? "border-indigo-400 bg-indigo-500/10 text-white" : "border-line text-slate-300 hover:border-slate-600")}>
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current text-[10px]">{String.fromCharCode(65 + i)}</span>{o}{right && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400" />}{wrong && <XCircle className="ml-auto h-4 w-4 text-red-400" />}</button>); })}</div>
                  {submitted && <p className="mt-3 rounded-lg bg-black/25 px-3 py-2 text-xs text-slate-300"><b className={c === q.answer ? "text-emerald-300" : "text-red-300"}>{c === q.answer ? "Correct." : "Not quite."}</b> {q.explanation}</p>}
                </Card>); })}
              {!submitted && <div className="flex items-center gap-3"><Button variant="primary" onClick={submit}>Submit answers</Button><span className="text-xs text-slate-500">{answered}/{list.length} answered</span></div>}
            </>}
        </div>
        <div className="space-y-5">
          {locked > 0 && <Card><p className="flex items-start gap-2 text-xs text-slate-400"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />{locked} question{locked > 1 ? "s are" : " is"} locked until the related topic is taught.</p></Card>}
          <Card pad={false} title="Practice history" subtitle={subject?.name}>{history.length === 0 ? <EmptyState title="No attempts yet" hint="Submit a quiz to start your history." /> : <ul className="divide-y divide-line/60">{history.map((a) => <li key={a.id} className="px-4 py-2.5 text-sm"><div className="flex items-center justify-between"><span className="text-white">{a.score}/{a.total}</span><span className="text-xs text-slate-500">{fmtDate(a.date)}</span></div><p className="mt-0.5 text-[11px] text-slate-500">{a.answers.map((x) => `${x.qid}${x.correct ? "✓" : "✗"}`).join("  ")}</p></li>)}</ul>}</Card>
        </div>
      </div>
    </div>
  );
}

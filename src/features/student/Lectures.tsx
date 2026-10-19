"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Info, Search } from "lucide-react";
import { Card, EmptyState, Input, Pill, Select } from "@/components/ui";
import { useScopedSubjects, useStore } from "@/lib/store";
import { cn, fmtDate } from "@/lib/utils";
import { topicName } from "./helpers";

export function LecturesPage() {
  const items = useScopedSubjects();
  const { state } = useStore();
  const params = useSearchParams();
  const [subject, setSubject] = useState(params.get("subject") ?? "all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const ids = new Set(items.map((i) => i.subject.id));
  const subj = (id: string) => state.subjects.find((s) => s.id === id);
  const feed = useMemo(() => state.sessions.filter((s) => ids.has(s.subjectId) && s.status === "verified" && (subject === "all" || s.subjectId === subject) && (!from || s.date >= from) &&
    (!q || `${s.summary} ${s.topics.map((t) => topicName(subj(s.subjectId), t.topicId)).join(" ")} ${s.notes?.keyConcepts.join(" ") ?? ""}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.sessions, subject, q, from, items]);
  useEffect(() => { if (!selected || !feed.some((f) => f.id === selected)) setSelected(feed[0]?.id ?? null); }, [feed, selected]);
  const cur = feed.find((f) => f.id === selected);
  const curSub = cur ? subj(cur.subjectId) : undefined;
  const today = feed.find((f) => f.date === "2026-10-12");

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Demonstration content. Notes are generated from faculty-verified session records and sample material. They are not verified educational facts; check them against your textbook.</p>
      {today && <Card className="border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 to-transparent" title="Today's lecture summary" subtitle={`${subj(today.subjectId)?.name} · ${fmtDate(today.date)}`}><p className="text-sm text-slate-200">{today.summary}</p></Card>}
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs"><span className="sr-only">Search lectures</span><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics or notes…" className="pl-8" /></label>
        <Select aria-label="Filter by subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-auto"><option value="all">All subjects</option>{items.map((i) => <option key={i.subject.id} value={i.subject.id}>{i.subject.name}</option>)}</Select>
        <label className="flex items-center gap-2 text-xs text-slate-400">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" aria-label="From date" /></label>
      </div>
      {feed.length === 0 ? <Card><EmptyState title="No lectures match" hint="Adjust filters or search." /></Card> : (
        <div className="grid gap-5 lg:grid-cols-5">
          <Card pad={false} className="lg:col-span-2" title="Lecture feed"><ul className="max-h-[560px] divide-y divide-line/60 overflow-y-auto">{feed.map((f) => <li key={f.id}><button onClick={() => setSelected(f.id)} className={cn("w-full px-4 py-3 text-left transition-colors hover:bg-white/[.03]", f.id === selected && "bg-indigo-500/10")}><div className="flex items-center justify-between"><span className="text-sm font-medium text-white">{subj(f.subjectId)?.name}</span><span className="text-[11px] text-slate-500">{fmtDate(f.date)}</span></div><p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{f.summary}</p>{f.notes && <span className="mt-1.5 inline-block"><Pill tone="indigo">Notes</Pill></span>}</button></li>)}</ul></Card>
          {cur && <Card className="lg:col-span-3" title={<span className="flex items-center gap-2"><BookOpenText className="h-4 w-4 text-indigo-300" />{curSub?.name} · {fmtDate(cur.date, true)}</span>} subtitle={cur.topics.map((t) => topicName(curSub, t.topicId)).join(" · ")}>
            <div className="space-y-5 text-sm">
              <section><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Summary</h3><p className="text-slate-200">{cur.summary}</p></section>
              {cur.notes ? <>
                <section><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Key concepts</h3><div className="flex flex-wrap gap-1.5">{cur.notes.keyConcepts.map((k) => <Pill key={k} tone="indigo">{k}</Pill>)}</div></section>
                <section><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Detailed notes</h3><ul className="list-disc space-y-1 pl-5 text-slate-300">{cur.notes.detail.map((d) => <li key={d}>{d}</li>)}</ul></section>
                {cur.notes.examples.length > 0 && <section><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Examples</h3><ul className="space-y-1">{cur.notes.examples.map((e) => <li key={e} className="rounded-lg bg-black/20 px-3 py-1.5 text-slate-300">{e}</li>)}</ul></section>}
              </> : <p className="rounded-lg bg-black/20 px-3 py-2 text-xs text-slate-400">Detailed notes have not been published for this lecture.</p>}
              {cur.homework && <section><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Homework</h3><p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-amber-100">{cur.homework}</p></section>}
              <section><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Sources</h3><ul className="space-y-0.5 text-xs text-slate-400">{(cur.notes?.sources ?? ["Faculty session record"]).map((s) => <li key={s}>• {s}</li>)}</ul></section>
            </div>
          </Card>}
        </div>
      )}
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";
import { Card, Modal, Pill, Select } from "@/components/ui";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useScopedSubjects, useStore } from "@/lib/store";
import type { Session } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

export function HistoryPage() {
  const items = useScopedSubjects();
  const { state } = useStore();
  const [subject, setSubject] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<Session | null>(null);
  const mine = new Set(items.map((i) => i.subject.id));
  const name = (id: string) => state.subjects.find((s) => s.id === id)?.name ?? id;
  const topicName = (sid: string, tid: string) => state.subjects.find((s) => s.id === sid)?.topics.find((t) => t.id === tid)?.name ?? tid;
  const rows = useMemo(() => state.sessions.filter((s) => mine.has(s.subjectId) && (subject === "all" || s.subjectId === subject) && (status === "all" || s.status === status)).sort((a, b) => b.date.localeCompare(a.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.sessions, subject, status, items]);
  const cols: Column<Session>[] = [
    { key: "date", header: "Date", sort: (r) => r.date, render: (r) => fmtDate(r.date, true) },
    { key: "subject", header: "Subject", sort: (r) => name(r.subjectId), render: (r) => <span className="text-white">{name(r.subjectId)}</span> },
    { key: "topics", header: "Topics", render: (r) => <span className="text-xs">{r.topics.map((t) => `${topicName(r.subjectId, t.topicId)} ${t.pct}%`).join(", ") || "—"}</span> },
    { key: "hours", header: "Hours", align: "right", sort: (r) => r.hours, render: (r) => r.hours },
    { key: "source", header: "Source", render: (r) => <Pill>{r.source === "seed" ? "sample" : r.source}</Pill> },
    { key: "status", header: "Status", sort: (r) => r.status, render: (r) => <Pill tone={r.status === "verified" ? "green" : r.status === "missed" ? "red" : "amber"}>{r.status}</Pill> },
  ];
  return (
    <>
      <Card pad={false} title="Session history" subtitle="Search, filter and open any record.">
        <DataTable rows={rows} columns={cols} searchText={(r) => `${name(r.subjectId)} ${r.summary} ${r.topics.map((t) => topicName(r.subjectId, t.topicId)).join(" ")}`} onRowClick={setView} rowLabel={(r) => `Open session ${r.date}`}
          toolbar={<><Select aria-label="Filter subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 w-auto py-0"><option value="all">All subjects</option>{items.map((i) => <option key={i.subject.id} value={i.subject.id}>{i.subject.name}</option>)}</Select><Select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-auto py-0"><option value="all">All statuses</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="missed">Missed</option></Select></>} />
      </Card>
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `${name(view.subjectId)} · ${fmtDate(view.date, true)}` : ""} description={view ? `${view.hours}h · ${view.status}` : ""}>
        {view && <div className="space-y-3 text-sm"><p className="text-slate-300">{view.summary}</p>{view.topics.length > 0 && <ul className="space-y-1">{view.topics.map((t) => <li key={t.topicId} className="flex justify-between rounded-lg bg-black/20 px-3 py-1.5"><span>{topicName(view.subjectId, t.topicId)}</span><span className="text-slate-400">{t.pct}%</span></li>)}</ul>}<p><b className="text-slate-400">Activities:</b> {view.activities || "—"}</p><p><b className="text-slate-400">Homework:</b> {view.homework || "—"}</p></div>}
      </Modal>
    </>
  );
}

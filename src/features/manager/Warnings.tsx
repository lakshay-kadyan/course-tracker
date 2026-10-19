"use client";
import { useMemo, useState } from "react";
import { Card, Tabs } from "@/components/ui";
import { useScopedSubjects, useStore } from "@/lib/store";
import { WarningFeed } from "../shared/blocks";
import { buildWarnings, WARNING_LABEL, type Warning } from "../shared/insights";

export function WarningsPage() {
  const items = useScopedSubjects();
  const { state } = useStore();
  const [tab, setTab] = useState<"all" | Warning["kind"]>("all");
  const all = useMemo(() => buildWarnings(items, state.sessions, state.holidays), [items, state.sessions, state.holidays]);
  const list = tab === "all" ? all : all.filter((w) => w.kind === tab);
  const kinds = Object.keys(WARNING_LABEL) as Warning["kind"][];
  return (
    <Card pad={false} title="Early-Warning Feed" subtitle="Signals are computed from the same engine as the health matrix.">
      <div className="px-4 pt-2"><Tabs value={tab} onChange={setTab} tabs={[{ id: "all", label: "All", count: all.length }, ...kinds.map((k) => ({ id: k, label: WARNING_LABEL[k], count: all.filter((w) => w.kind === k).length }))]} /></div>
      <WarningFeed warnings={list} role="manager" />
    </Card>
  );
}

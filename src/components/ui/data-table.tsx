"use client";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./index";

export interface Column<T> { key: string; header: string; render?: (r: T) => ReactNode; sort?: (r: T) => string | number; className?: string; align?: "right" }

export function DataTable<T extends { id: string }>({ rows, columns, searchText, pageSize = 8, onRowClick, toolbar, emptyTitle = "No records match", rowLabel }: {
  rows: T[]; columns: Column<T>[]; searchText?: (r: T) => string; pageSize?: number; onRowClick?: (r: T) => void; toolbar?: ReactNode; emptyTitle?: string; rowLabel?: (r: T) => string;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const data = useMemo(() => {
    let r = rows;
    if (q && searchText) r = r.filter((x) => searchText(x).toLowerCase().includes(q.toLowerCase()));
    const col = columns.find((c) => c.key === sort?.key);
    if (sort && col?.sort) { const f = col.sort; r = [...r].sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; }); }
    return r;
  }, [rows, q, sort, columns, searchText]);

  const pages = Math.max(1, Math.ceil(data.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const slice = data.slice(cur * pageSize, cur * pageSize + pageSize);

  return (
    <div>
      {(searchText || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-4 py-3">
          {searchText && (
            <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <span className="sr-only">Search table</span>
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search…" className="h-9 w-full rounded-lg border border-line bg-[#0b1226] pl-8 pr-3 text-sm placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </label>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">{toolbar}</div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line/70 text-[11px] uppercase tracking-wider text-slate-500">
              {columns.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined} className={cn("px-4 py-2.5 font-medium", c.align === "right" && "text-right")}>
                  {c.sort ? (
                    <button className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-300" onClick={() => setSort((s) => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))}>
                      {c.header}{sort?.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id} onClick={onRowClick ? () => onRowClick(r) : undefined} onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(r); } : undefined} tabIndex={onRowClick ? 0 : undefined} aria-label={onRowClick ? rowLabel?.(r) : undefined}
                className={cn("border-b border-line/50 transition-colors last:border-0 hover:bg-white/[.03]", onRowClick && "cursor-pointer")}>
                {columns.map((c) => <td key={c.key} className={cn("px-4 py-3 align-middle text-slate-300", c.align === "right" && "text-right tabular-nums", c.className)}>{c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!slice.length && <EmptyState title={emptyTitle} hint="Try a different search or filter." />}
      </div>
      {data.length > pageSize && (
        <div className="flex items-center justify-between border-t border-line/70 px-4 py-2.5 text-xs text-slate-400">
          <span>{cur * pageSize + 1}–{Math.min(data.length, (cur + 1) * pageSize)} of {data.length}</span>
          <div className="flex items-center gap-1">
            <button aria-label="Previous page" disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded p-1.5 hover:bg-white/5 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <span>Page {cur + 1} / {pages}</span>
            <button aria-label="Next page" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="rounded p-1.5 hover:bg-white/5 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

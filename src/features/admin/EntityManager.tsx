"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Card, ConfirmDialog, Field, Input, Modal, Select, useToast } from "@/components/ui";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useStore } from "@/lib/store";
import type { Collection } from "@/lib/types";
import { uid } from "@/lib/utils";

export interface FieldDef { key: string; label: string; type: "text" | "number" | "date" | "email" | "select"; options?: { value: string; label: string }[]; required?: boolean; min?: number; max?: number; hint?: string }

export function EntityManager<T extends { id: string }>({ title, subtitle, noun, collection, rows, columns, fields, blank, validate, searchText, extra, canDelete, deleteNote }: {
  title: string; subtitle: string; noun: string; collection: Collection; rows: T[]; columns: Column<T>[]; fields: FieldDef[]; blank: () => Omit<T, "id">;
  validate?: (v: Record<string, string>) => Record<string, string | undefined>; searchText: (r: T) => string; extra?: ReactNode; canDelete?: (r: T) => string | null; deleteNote?: (r: T) => string;
}) {
  const { upsert, remove } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [del, setDel] = useState<T | null>(null);

  const open = (r: T | "new") => {
    const base = r === "new" ? (blank() as Record<string, unknown>) : (r as unknown as Record<string, unknown>);
    setValues(Object.fromEntries(fields.map((f) => [f.key, String(base[f.key] ?? "")])));
    setErrors({}); setEditing(r);
  };
  const save = () => {
    const e: Record<string, string> = {};
    fields.forEach((f) => {
      const v = values[f.key]?.trim() ?? "";
      if (f.required && !v) e[f.key] = `${f.label} is required`;
      else if (f.type === "number" && v) { const n = Number(v); if (Number.isNaN(n)) e[f.key] = "Enter a number"; else if (f.min !== undefined && n < f.min) e[f.key] = `Minimum ${f.min}`; else if (f.max !== undefined && n > f.max) e[f.key] = `Maximum ${f.max}`; }
      else if (f.type === "email" && v && !/^\S+@\S+\.\S+$/.test(v)) e[f.key] = "Enter a valid email";
      else if (f.type === "date" && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) e[f.key] = "Use a valid date";
    });
    Object.entries(validate?.(values) ?? {}).forEach(([k, m]) => { if (m) e[k] = m; });
    setErrors(e);
    if (Object.keys(e).length) return;
    const parsed = Object.fromEntries(fields.map((f) => [f.key, f.type === "number" ? Number(values[f.key]) : values[f.key].trim()]));
    const isNew = editing === "new";
    const rec = { ...(isNew ? blank() : (editing as T)), ...parsed, id: isNew ? uid(collection.slice(0, 3)) : (editing as T).id };
    upsert(collection, rec as { id: string });
    toast("success", `${noun} ${isNew ? "added" : "updated"}`); setEditing(null);
  };
  const actionCol: Column<T> = { key: "actions", header: "", align: "right", render: (r) => (
    <span className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
      <button aria-label={`Edit ${noun}`} onClick={() => open(r)} className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
      <button aria-label={`Delete ${noun}`} onClick={() => { const block = canDelete?.(r); if (block) toast("error", block); else setDel(r); }} className="rounded p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
    </span>) };
  const cols = useMemo(() => [...columns, actionCol], [columns]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Card pad={false} title={title} subtitle={subtitle} action={<Button variant="primary" size="sm" onClick={() => open("new")}><Plus className="h-3.5 w-3.5" />Add {noun}</Button>}>
        <DataTable rows={rows} columns={cols} searchText={searchText} toolbar={extra} emptyTitle={`No ${noun}s yet`} />
      </Card>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? `Add ${noun}` : `Edit ${noun}`} description="Changes are saved to local demo data." footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save}>{editing === "new" ? "Add" : "Save changes"}</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-4 sm:grid-cols-2" noValidate>
          {fields.map((f) => (
            <div key={f.key} className={f.type === "select" || f.key === "name" ? "sm:col-span-2" : ""}>
              <Field label={f.label + (f.required ? " *" : "")} error={errors[f.key]} hint={f.hint}>{(a) => f.type === "select"
                ? <Select {...a} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}><option value="">Select…</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
                : <Input {...a} type={f.type} step={f.type === "number" ? "any" : undefined} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />}</Field>
            </div>))}
          <button type="submit" className="hidden" />
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger confirmLabel="Delete" title={`Delete this ${noun}?`} message={del ? (deleteNote?.(del) ?? "This removes it from the demo dataset.") : ""} onConfirm={() => { if (del) { remove(collection, del.id); toast("success", `${noun} deleted`); } }} />
    </>
  );
}

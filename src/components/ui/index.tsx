"use client";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Inbox, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HEALTH_META } from "@/lib/engine";
import type { Health } from "@/lib/types";

export function Card({ title, subtitle, action, children, className, pad = true }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn("rounded-xl border border-line bg-panel anim-fade", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line/70 px-4 py-3">
          <div className="min-w-0"><h2 className="text-sm font-semibold text-white">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}</div>
          {action}
        </header>
      )}
      <div className={cn(pad && "p-4")}>{children}</div>
    </section>
  );
}

export function HealthBadge({ health, className }: { health: Health; className?: string }) {
  const m = HEALTH_META[health];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset", m.bg, m.text, m.ring, className)}><span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} aria-hidden />{m.label}</span>;
}
export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "indigo" | "green" | "amber" | "red" }) {
  const t = { slate: "bg-slate-500/10 text-slate-300 ring-slate-500/20", indigo: "bg-indigo-500/10 text-indigo-300 ring-indigo-500/30", green: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30", amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30", red: "bg-red-500/10 text-red-300 ring-red-500/30" }[tone];
  return <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", t)}>{children}</span>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };
export function Button({ variant = "secondary", size = "md", className, ...p }: BtnProps) {
  const v = {
    primary: "bg-gradient-to-b from-indigo-500 to-violet-600 text-white shadow-sm hover:from-indigo-400 hover:to-violet-500",
    secondary: "border border-line bg-panel-2 text-slate-200 hover:border-slate-600 hover:bg-[#1a2540]",
    ghost: "text-slate-300 hover:bg-white/5",
    danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  }[variant];
  return <button type="button" {...p} className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm", v, className)} />;
}

export function Progress({ value, planned, color = "#818cf8", label, className }: { value: number; planned?: number; color?: string; label?: string; className?: string }) {
  const v = Math.min(100, Math.max(0, value || 0));
  return (
    <div className={cn("relative h-1.5 w-full rounded-full bg-slate-800", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: color }} />
      {planned !== undefined && <div className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-white/70" style={{ left: `${Math.min(100, Math.max(0, planned))}%` }} title={`Planned ${Math.round(planned)}%`} />}
    </div>
  );
}

export function Stat({ label, value, hint, icon, tone }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4 transition-colors hover:border-slate-700">
      <div className="flex items-center justify-between text-xs text-slate-400"><span>{label}</span><span className={cn("text-slate-500", tone)}>{icon}</span></div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) { return <div className={cn("skeleton", className)} aria-hidden />; }
export function PageSkeleton() {
  return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-8 w-56" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-72" /></div>;
}
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center"><Inbox className="h-8 w-8 text-slate-600" aria-hidden /><p className="text-sm font-medium text-slate-300">{title}</p>{hint && <p className="max-w-xs text-xs text-slate-500">{hint}</p>}{action}</div>;
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return <span className="group relative inline-flex">{children}<span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 w-max max-w-[220px] -translate-x-1/2 rounded-md border border-line bg-[#0d1426] px-2 py-1 text-[11px] leading-snug text-slate-200 opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">{text}</span></span>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn("relative -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors", value === t.id ? "border-indigo-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200")}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded bg-slate-800 px-1.5 text-[10px] text-slate-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, wide }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>("button,input,select,textarea,a[href],[tabindex]:not([tabindex='-1'])");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,select,textarea,button:not([data-close])")?.focus(), 30);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="anim-backdrop absolute inset-0 bg-[#050913]/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={cn("anim-modal relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-panel shadow-2xl sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div><h2 id={id} className="text-base font-semibold text-white">{title}</h2>{description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}</div>
          <button data-close onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>, document.body);
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button onClick={onClose}>Cancel</Button><Button variant={danger ? "danger" : "primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}>
      <p className="text-sm text-slate-300">{message}</p>
    </Modal>
  );
}

const field = "w-full rounded-lg border border-line bg-[#0b1226] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition-colors hover:border-slate-600 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (p: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-300">{label}</label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": error ? `${id}-e` : undefined })}
      {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
      {error && <p id={`${id}-e`} role="alert" className="flex items-center gap-1 text-[11px] text-red-400"><XCircle className="h-3 w-3" />{error}</p>}
    </div>
  );
}
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(field, "aria-[invalid=true]:border-red-500/60", className)} />;
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(field, "pr-8", className)} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn(field, "min-h-[84px] resize-y", className)} />;

export function Menu({ trigger, children, align = "right", label }: { trigger: ReactNode; children: (close: () => void) => ReactNode; align?: "left" | "right"; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={label} className="rounded-lg">{trigger}</button>
      {open && <div role="menu" className={cn("anim-fade absolute z-40 mt-2 min-w-56 rounded-xl border border-line bg-panel p-1.5 shadow-2xl", align === "right" ? "right-0" : "left-0")}>{children(() => setOpen(false))}</div>}
    </div>
  );
}
export const MenuItem = ({ icon, children, onClick, danger }: { icon?: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) => (
  <button role="menuitem" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white/5", danger ? "text-red-300" : "text-slate-200")}>{icon}{children}</button>
);

type Toast = { id: number; kind: "success" | "error" | "info"; text: string };
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="anim-modal pointer-events-auto flex items-start gap-2 rounded-xl border border-line bg-panel p-3 text-sm shadow-xl">
            {t.kind === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : t.kind === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />}
            <span className="text-slate-200">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

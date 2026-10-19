"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, CalendarRange, ChevronRight, LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, RotateCcw, Search, Settings, ShieldAlert, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersona, useScopedSubjects, useStore } from "@/lib/store";
import { SEMESTER_LABEL } from "@/lib/data";
import { HEALTH_META, healthCounts } from "@/lib/engine";
import type { Health, Role } from "@/lib/types";
import { Button, ConfirmDialog, Field, Input, Menu, MenuItem, Modal, PageSkeleton, useToast } from "@/components/ui";
import { NAV, ROLE_META, subjectHref } from "./nav";

export interface Crumb { label: string; href?: string }

export function AppShell({ role, slug, title, crumbs, children }: { role: Role; slug: string; title: string; crumbs: Crumb[]; children: ReactNode }) {
  const { state, ready, cloud, setRole, logout } = useStore();
  const persona = usePersona();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [settings, setSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { reset: resetData } = useStore();
  const toast = useToast();

  useEffect(() => { if (ready && !state.loggedIn) router.replace("/login"); }, [ready, state.loggedIn, router]);
  useEffect(() => {
    if (!ready || !state.loggedIn || state.role === role) return;
    if (cloud) router.replace(`/app/${state.role}`); // a signed-in user can only open their own role's area
    else setRole(role);
  }, [ready, cloud, state.loggedIn, state.role, role, setRole, router]);
  useEffect(() => { setDrawer(false); }, [slug]);

  const switchRole = (r: Role) => { setRole(r); router.push(`/app/${r}`); toast("info", `Demo view: ${ROLE_META[r].label}`); };

  if (!ready || !state.loggedIn || state.role !== role) {
    return <div className="min-h-screen bg-app p-6"><PageSkeleton /></div>;
  }

  return (
    <div className="flex min-h-screen bg-app">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-indigo-500 focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      {drawer && <div className="anim-backdrop fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setDrawer(false)} aria-hidden />}
      <aside aria-label="Primary" className={cn("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-[#080e22] transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", drawer ? "translate-x-0" : "-translate-x-full", collapsed ? "w-64 lg:w-[68px]" : "w-64")}>
        <div className="flex h-14 items-center justify-between gap-2 border-b border-line px-4">
          <Link href={`/app/${role}`} className="flex items-center gap-2.5 overflow-hidden">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">M</span>
            <span className={cn("leading-tight", collapsed && "lg:hidden")}><span className="block text-sm font-semibold text-white">Mirai</span><span className="block text-[10px] uppercase tracking-widest text-slate-500">Academic OS</span></span>
          </Link>
          <button className="rounded-md p-1 text-slate-400 hover:bg-white/5 lg:hidden" onClick={() => setDrawer(false)} aria-label="Close navigation"><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          <p className={cn("px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600", collapsed && "lg:hidden")}>{ROLE_META[role].short} workspace</p>
          {NAV[role].map((n) => {
            const active = slug === n.slug || (n.slug !== "" && slug.startsWith(n.slug + "/"));
            return (
              <Link key={n.slug} href={`/app/${role}${n.slug ? "/" + n.slug : ""}`} aria-current={active ? "page" : undefined} title={n.label}
                className={cn("group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors", active ? "bg-indigo-500/10 text-white ring-1 ring-inset ring-indigo-500/25" : "text-slate-400 hover:bg-white/5 hover:text-slate-100")}>
                <n.icon className={cn("h-4 w-4 shrink-0", active ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300")} />
                <span className={cn("truncate", collapsed && "lg:hidden")}>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={cn("m-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-snug text-amber-200/80", collapsed && "lg:hidden")}>
          <p className="mb-0.5 flex items-center gap-1 font-semibold text-amber-300"><ShieldAlert className="h-3 w-3" />{cloud ? "Connected to Supabase" : "Prototype mode"}</p>
          {cloud ? "Signed in. What you see and change is limited by your role in the database." : "Demo data in your browser only. Roles are switchable views, not real access control."}
        </div>
        <button onClick={() => setCollapsed((c) => !c)} className="hidden items-center gap-2 border-t border-line px-4 py-3 text-xs text-slate-500 hover:text-slate-300 lg:flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" />Collapse</>}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-app/85 px-3 backdrop-blur sm:gap-3 sm:px-5">
          <button className="rounded-lg p-2 text-slate-300 hover:bg-white/5 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation"><MenuIcon className="h-5 w-5" /></button>
          <GlobalSearch role={role} />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs text-slate-400 xl:flex"><CalendarRange className="h-3.5 w-3.5" />{role === "admin" ? "All campuses" : state.campuses.find((c) => c.id === persona.campusId)?.name} · {SEMESTER_LABEL}</span>
            {!cloud && <RoleSwitcher role={role} onSwitch={switchRole} />}
            <Notifications role={role} />
            <Menu label="Profile menu" trigger={<span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">{state.profiles[role].name.split(" ").map((w) => w[0]).slice(-2).join("")}</span>}>
              {(close) => (<>
                <div className="px-2.5 py-2"><p className="text-sm font-medium text-white">{state.profiles[role].name}</p><p className="text-xs text-slate-400">{persona.title}</p></div>
                <div className="my-1 border-t border-line" />
                <MenuItem icon={<Settings className="h-4 w-4" />} onClick={() => { close(); setSettings(true); }}>Profile settings</MenuItem>
                {!cloud && <MenuItem icon={<RotateCcw className="h-4 w-4" />} onClick={() => { close(); setConfirmReset(true); }}>Reset demo data</MenuItem>}
                <MenuItem icon={<LogOut className="h-4 w-4" />} danger onClick={() => { close(); logout(); router.push("/login"); }}>{cloud ? "Sign out" : "Sign out of demo"}</MenuItem>
              </>)}
            </Menu>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-3 py-3 sm:px-5">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
              {crumbs.map((c, i) => (<span key={i} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{c.href ? <Link href={c.href} className="hover:text-slate-300">{c.label}</Link> : <span className={i === crumbs.length - 1 ? "text-slate-300" : ""}>{c.label}</span>}</span>))}
            </nav>
            <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-white">{title}</h1>
          </div>
          <HealthTicker />
        </div>

        <main id="main" className="min-w-0 flex-1 px-3 py-5 sm:px-5">{children}</main>
      </div>

      <SettingsDialog open={settings} onClose={() => setSettings(false)} role={role} />
      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo data?" confirmLabel="Reset" danger message="This discards all changes you made in this browser and restores the original sample dataset." onConfirm={() => { resetData(); toast("success", "Demo data restored"); }} />
    </div>
  );
}

function HealthTicker() {
  const items = useScopedSubjects();
  const counts = healthCounts(items.map((i) => i.m));
  return (
    <div className="flex items-center gap-1.5" role="status" aria-label="Academic system health">
      <span className="mr-1 hidden text-[10px] font-semibold uppercase tracking-widest text-slate-500 sm:inline">Health</span>
      {(Object.keys(counts) as Health[]).map((h) => (
        <span key={h} title={`${counts[h]} subject(s) ${HEALTH_META[h].label}`} className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset", HEALTH_META[h].bg, HEALTH_META[h].text, HEALTH_META[h].ring)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", HEALTH_META[h].dot)} />{counts[h]}<span className="hidden font-medium opacity-80 md:inline">{HEALTH_META[h].label}</span>
        </span>
      ))}
    </div>
  );
}

function RoleSwitcher({ role, onSwitch }: { role: Role; onSwitch: (r: Role) => void }) {
  return (
    <>
      <div className="hidden items-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-1 md:flex" role="group" aria-label="Demo role switcher">
        <span className="pl-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-300/80">Demo view</span>
        {(Object.keys(ROLE_META) as Role[]).map((r) => (
          <button key={r} onClick={() => onSwitch(r)} aria-pressed={r === role} className={cn("rounded-lg px-2.5 py-1 text-xs font-medium transition-colors", r === role ? "bg-indigo-500 text-white shadow" : "text-slate-300 hover:bg-white/5")}>{ROLE_META[r].short}</button>
        ))}
      </div>
      <div className="md:hidden">
        <Menu label="Switch demo role" trigger={<span className="flex h-8 items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 text-xs font-medium text-indigo-200"><Sparkles className="h-3.5 w-3.5" />{ROLE_META[role].short}</span>}>
          {(close) => (<><p className="px-2.5 py-1.5 text-[11px] text-slate-500">Demo view only. Not real access control.</p>{(Object.keys(ROLE_META) as Role[]).map((r) => <MenuItem key={r} onClick={() => { close(); onSwitch(r); }}>{ROLE_META[r].label}{r === role && " ✓"}</MenuItem>)}</>)}
        </Menu>
      </div>
    </>
  );
}

function Notifications({ role }: { role: Role }) {
  const { state, markRead } = useStore();
  const list = state.notifications.filter((n) => n.roles.includes(role));
  const unread = list.filter((n) => !n.read).length;
  return (
    <Menu label={`Notifications, ${unread} unread`} trigger={<span className="relative grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel text-slate-300 hover:text-white"><Bell className="h-4 w-4" />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">{unread}</span>}</span>}>
      {() => (
        <div className="w-80 max-w-[85vw]">
          <div className="flex items-center justify-between px-2.5 py-1.5"><p className="text-sm font-medium text-white">Notifications</p>{unread > 0 && <button onClick={() => markRead()} className="text-xs text-indigo-300 hover:underline">Mark all read</button>}</div>
          <ul className="max-h-80 overflow-y-auto">
            {list.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-500">You&apos;re all caught up.</li>}
            {list.map((n) => (
              <li key={n.id}><button onClick={() => markRead(n.id)} className="flex w-full gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-white/5">
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-indigo-400")} />
                <span><span className="block text-sm text-slate-100">{n.title}</span><span className="block text-xs text-slate-400">{n.body}</span><span className="text-[10px] text-slate-600">{n.time}</span></span>
              </button></li>
            ))}
          </ul>
        </div>
      )}
    </Menu>
  );
}

function GlobalSearch({ role }: { role: Role }) {
  const items = useScopedSubjects();
  const { state } = useStore();
  const persona = usePersona();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const out: { key: string; label: string; sub: string; href: string }[] = [];
    items.forEach(({ subject: s }) => {
      if (`${s.name} ${s.code}`.toLowerCase().includes(t)) out.push({ key: s.id, label: `${s.name} (${s.code})`, sub: "Subject", href: subjectHref(role, s.id) });
      s.topics.forEach((tp) => { if (tp.name.toLowerCase().includes(t)) out.push({ key: s.id + tp.id, label: tp.name, sub: `Topic · ${s.name}`, href: subjectHref(role, s.id) }); });
    });
    if (role === "admin" || role === "manager") state.faculty.filter((f) => f.name.toLowerCase().includes(t) && (role === "admin" || f.campusId === persona.campusId)).forEach((f) => out.push({ key: f.id, label: f.name, sub: "Faculty", href: `/app/${role}/faculty` }));
    return out.slice(0, 8);
  }, [q, items, role, state.faculty, persona.campusId]);
  return (
    <div className="relative max-w-sm flex-1">
      <label className="relative block"><span className="sr-only">Global search</span>
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Search subjects, topics, faculty…" className="h-9 w-full rounded-lg border border-line bg-panel pl-8 pr-3 text-sm placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
      </label>
      {open && q.trim().length >= 2 && (
        <ul className="anim-fade absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-xl border border-line bg-panel p-1 shadow-2xl">
          {results.length === 0 && <li className="px-3 py-3 text-xs text-slate-500">No results in your scope.</li>}
          {results.map((r) => <li key={r.key}><button onMouseDown={() => { router.push(r.href); setQ(""); }} className="flex w-full flex-col rounded-lg px-2.5 py-2 text-left hover:bg-white/5"><span className="text-sm text-slate-100">{r.label}</span><span className="text-[11px] text-slate-500">{r.sub}</span></button></li>)}
        </ul>
      )}
    </div>
  );
}

function SettingsDialog({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  const { state, saveProfile, cloud } = useStore();
  const toast = useToast();
  const [p, setP] = useState(state.profiles[role]);
  const [err, setErr] = useState<{ name?: string; email?: string }>({});
  useEffect(() => { if (open) { setP(state.profiles[role]); setErr({}); } }, [open, role, state.profiles]);
  const save = () => {
    const e: typeof err = {};
    if (p.name.trim().length < 2) e.name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(p.email)) e.email = "Enter a valid email";
    setErr(e);
    if (Object.keys(e).length) return;
    saveProfile(role, p); toast("success", cloud ? "Profile saved" : "Profile saved (stored locally)"); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Profile settings" description="Saved only in this browser." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save changes</Button></>}>
      <div className="space-y-4">
        <Field label="Display name" error={err.name}>{(a) => <Input {...a} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />}</Field>
        <Field label="Email" error={err.email}>{(a) => <Input {...a} type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} />}</Field>
        {[["emailAlerts", "Email me alerts (demo preference)"], ["weeklyDigest", "Weekly digest (demo preference)"]].map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="h-4 w-4 accent-indigo-500" checked={p[k as "emailAlerts"]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} />{l}</label>
        ))}
      </div>
    </Modal>
  );
}

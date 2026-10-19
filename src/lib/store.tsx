"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { AppState, Attempt, Collection, Persona, Profile, Role, Session, Subject } from "./types";
import { PERSONAS, seedState } from "./data";
import { computeMetrics, type SubjectMetrics } from "./engine";
import { uid } from "./utils";
import { getSupabase, supabaseConfigured } from "./supabase/client";
import * as db from "./supabase/data";
import { useToast } from "@/components/ui";

const KEY = "mirai-demo-v1";
/** Connected to Supabase when both NEXT_PUBLIC_SUPABASE_* variables are set; otherwise the local demo. */
const CLOUD = supabaseConfigured;
const emptyState = (): AppState => ({ ...seedState(), me: null, loggedIn: false, campuses: [], batches: [], faculty: [], subjects: [], holidays: [], sessions: [], attempts: [], notifications: [] });


type Action =
  | { t: "hydrate"; s: AppState }
  | { t: "login"; role: Role }
  | { t: "logout" }
  | { t: "role"; role: Role }
  | { t: "upsert"; c: Collection; r: { id: string } }
  | { t: "remove"; c: Collection; id: string }
  | { t: "session"; s: Session }
  | { t: "discard"; id: string }
  | { t: "attempt"; a: Attempt }
  | { t: "read"; id?: string }
  | { t: "profile"; role: Role; p: Profile }
  | { t: "reset" };

function reducer(st: AppState, a: Action): AppState {
  switch (a.t) {
    case "hydrate": return a.s;
    case "login": return { ...st, loggedIn: true, role: a.role };
    case "logout": return { ...st, loggedIn: false };
    case "role": return { ...st, role: a.role };
    case "upsert": {
      const list = st[a.c] as { id: string }[];
      const next = list.some((x) => x.id === a.r.id) ? list.map((x) => (x.id === a.r.id ? a.r : x)) : [...list, a.r];
      return { ...st, [a.c]: next } as AppState;
    }
    case "remove": return { ...st, [a.c]: (st[a.c] as { id: string }[]).filter((x) => x.id !== a.id) } as AppState;
    case "session": {
      // Confirming a session replaces a pending record or adds a new one, and raises topic progress (never lowers it).
      const sessions = st.sessions.some((x) => x.id === a.s.id) ? st.sessions.map((x) => (x.id === a.s.id ? a.s : x)) : [a.s, ...st.sessions];
      const subjects = st.subjects.map((sub) => {
        if (sub.id !== a.s.subjectId || a.s.status !== "verified") return sub;
        return { ...sub, topics: sub.topics.map((t) => { const u = a.s.topics.find((x) => x.topicId === t.id); return u ? { ...t, pct: Math.max(t.pct, Math.min(100, u.pct)) } : t; }) };
      });
      const note = { id: uid("n"), title: "Session verified", body: `${a.s.summary.slice(0, 80)}`, time: "just now", read: false, roles: ["manager", "admin", "student"] as Role[] };
      return { ...st, sessions, subjects, notifications: a.s.status === "verified" ? [note, ...st.notifications] : st.notifications };
    }
    case "discard": return { ...st, sessions: st.sessions.filter((x) => x.id !== a.id) };
    case "attempt": return { ...st, attempts: [a.a, ...st.attempts] };
    case "read": return { ...st, notifications: st.notifications.map((n) => (!a.id || n.id === a.id ? { ...n, read: true } : n)) };
    case "profile": return { ...st, profiles: { ...st.profiles, [a.role]: a.p } };
    case "reset": return seedState();
  }
}

export type SignInResult = { role: Role } | { error: string };
interface Ctx {
  state: AppState; ready: boolean; cloud: boolean;
  login: (r: Role) => void; signIn: (email: string, password: string) => Promise<SignInResult>; logout: () => void; setRole: (r: Role) => void;
  upsert: <T extends { id: string }>(c: Collection, r: T) => void; remove: (c: Collection, id: string) => void;
  saveSession: (s: Session) => void; discardSession: (id: string) => void; addAttempt: (a: Attempt) => void;
  markRead: (id?: string) => void; saveProfile: (r: Role, p: Profile) => void; reset: () => void;
  metrics: Record<string, SubjectMetrics>;
}
const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, CLOUD ? emptyState : seedState);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const userId = useRef<string | null>(null);
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  /** Cloud mode: (re)load everything the signed-in role may see. Returns the role, or null when signed out. */
  const refresh = useCallback(async (): Promise<Role | null> => {
    const client = getSupabase();
    const user = (await client.auth.getSession()).data.session?.user;
    if (!user) { userId.current = null; dispatch({ t: "hydrate", s: emptyState() }); return null; }
    const l = await db.loadAll(client, user.id);
    if (!l) throw new Error("NO_PROFILE");
    userId.current = user.id;
    const base = emptyState();
    dispatch({ t: "hydrate", s: { ...base, loggedIn: true, role: l.me.role, me: l.me, campuses: l.campuses, batches: l.batches, faculty: l.faculty, subjects: l.subjects, holidays: l.holidays, sessions: l.sessions, attempts: l.attempts, notifications: l.notifications, profiles: { ...base.profiles, [l.me.role]: l.profile } } });
    return l.me.role;
  }, []);

  useEffect(() => {
    if (!CLOUD) {
      try { const raw = localStorage.getItem(KEY); if (raw) dispatch({ t: "hydrate", s: { ...seedState(), ...JSON.parse(raw) } }); } catch { /* ignore corrupt storage */ }
      loaded.current = true; setReady(true);
      return;
    }
    let alive = true;
    refresh().catch((e: Error) => { if (alive) toastRef.current("error", e.message === "NO_PROFILE" ? "This account has no role yet. Ask an administrator to link it." : `Could not load data: ${e.message}`); })
      .finally(() => { if (alive) { loaded.current = true; setReady(true); } });
    const { data } = getSupabase().auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") { userId.current = null; dispatch({ t: "hydrate", s: emptyState() }); } });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [refresh]);

  // The local demo keeps its data in this browser. Cloud data is never copied to localStorage.
  useEffect(() => { if (!CLOUD && loaded.current) try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full */ } }, [state]);

  /** Runs a database write. On failure the user is told and the screen is re-synced from the database. */
  const write = useCallback((fn: (c: ReturnType<typeof getSupabase>) => Promise<void>, thenRefresh = false) => {
    if (!CLOUD) return;
    fn(getSupabase()).then(() => (thenRefresh ? refresh() : undefined)).catch((e: Error) => {
      toastRef.current("error", `Not saved: ${e.message}`);
      refresh().catch(() => undefined);
    });
  }, [refresh]);

  const metrics = useMemo(() => Object.fromEntries(state.subjects.map((s: Subject) => [s.id, computeMetrics(s, state.holidays)])), [state.subjects, state.holidays]);
  const v = useMemo<Ctx>(() => ({
    state, ready, metrics, cloud: CLOUD,
    login: (role) => { if (!CLOUD) dispatch({ t: "login", role }); },
    signIn: async (email, password) => {
      const client = getSupabase();
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error && (error.name === "AuthRetryableFetchError" || !error.status)) return { error: "Could not reach Supabase. Check your internet connection and the project URL in .env.local." };
      if (error) return { error: /confirm/i.test(error.message) ? "This email is not confirmed yet. In Supabase, open Authentication > Users and confirm it." : "Email or password is incorrect." };
      try {
        const role = await refresh();
        return role ? { role } : { error: "Sign-in did not complete. Try again." };
      } catch (e) {
        if ((e as Error).message === "NO_PROFILE") { await client.auth.signOut(); return { error: "This account has no role yet. Run supabase/link-users.sql to link it." }; }
        return { error: `Signed in, but data could not be loaded: ${(e as Error).message}` };
      }
    },
    logout: () => { if (CLOUD) { void getSupabase().auth.signOut(); userId.current = null; dispatch({ t: "hydrate", s: emptyState() }); } else dispatch({ t: "logout" }); },
    setRole: (role) => { if (!CLOUD) dispatch({ t: "role", role }); },
    upsert: (c, r) => {
      dispatch({ t: "upsert", c, r });
      write((cl) => c === "subjects" ? db.saveSubjectRows(cl, r as unknown as Subject) : c === "sessions" ? db.confirmSession(cl, r as unknown as Session) : db.saveRecord(cl, c, r as unknown as Record<string, unknown>));
    },
    remove: (c, id) => { dispatch({ t: "remove", c, id }); write((cl) => db.removeRecord(cl, c, id), true); },
    saveSession: (s) => { dispatch({ t: "session", s }); write((cl) => db.confirmSession(cl, s), true); },
    discardSession: (id) => { dispatch({ t: "discard", id }); write((cl) => db.removeRecord(cl, "sessions", id)); },
    addAttempt: (a) => { dispatch({ t: "attempt", a }); write((cl) => db.insertAttempt(cl, a)); },
    markRead: (id) => { dispatch({ t: "read", id }); write((cl) => db.markNotificationsRead(cl, id ? [id] : state.notifications.filter((n) => !n.read).map((n) => n.id))); },
    saveProfile: (role, p) => { dispatch({ t: "profile", role, p }); const uidNow = userId.current; if (uidNow) write((cl) => db.saveProfileRow(cl, uidNow, p)); },
    reset: () => { if (CLOUD) toastRef.current("info", "Reset is only available in the local demo. Your data is stored in Supabase."); else dispatch({ t: "reset" }); },
  }), [state, ready, metrics, refresh, write]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export const useStore = () => { const c = useContext(C); if (!c) throw new Error("StoreProvider missing"); return c; };

/** Role-scoped subject visibility: students and faculty only ever receive their own subjects. */
export function useScopedSubjects() {
  const { state, metrics } = useStore();
  return useMemo(() => {
    const p = state.me ?? PERSONAS[state.role];
    const subs = state.subjects.filter((s) => state.role === "admin" || (state.role === "manager" && s.campusId === p.campusId) || (state.role === "faculty" && s.facultyId === p.facultyId) || (state.role === "student" && s.batchId === p.batchId));
    return subs.map((s) => ({ subject: s, m: metrics[s.id] }));
  }, [state.role, state.me, state.subjects, metrics]);
}
/** The signed-in person's scope: from Supabase in cloud mode, from the sample personas in the local demo. */
export const usePersona = (): Persona => { const { state } = useStore(); return state.me ?? PERSONAS[state.role]; };

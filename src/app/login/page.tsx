"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, Building2, Eye, EyeOff, GraduationCap, Info, Mic, ShieldAlert, Users } from "lucide-react";
import { Button, Field, Input, Modal, useToast } from "@/components/ui";
import { useStore } from "@/lib/store";
import { PERSONAS } from "@/lib/data";
import type { Role } from "@/lib/types";

const ENTRIES: { role: Role; label: string; desc: string; icon: typeof Users }[] = [
  { role: "admin", label: "Admin / Program Manager", desc: "Institution-wide setup and control", icon: Building2 },
  { role: "manager", label: "Campus Manager", desc: "Course health and early intervention", icon: Users },
  { role: "faculty", label: "Faculty", desc: "Log and verify classes", icon: Mic },
  { role: "student", label: "Student", desc: "Learn, practise, prepare", icon: GraduationCap },
];
const FLOW = ["Plan", "Teach", "Capture", "Verify", "Measure", "Learn", "Practice", "Predict"];

export default function LoginPage() {
  const { login, signIn, cloud, state, ready } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errs, setErrs] = useState<{ email?: string; pw?: string; form?: string }>({});
  const [forgot, setForgot] = useState(false);
  const [fEmail, setFEmail] = useState("");
  const [fSent, setFSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { try { const r = localStorage.getItem("mirai-remember"); if (r) setEmail(r); } catch { /* noop */ } }, []);
  useEffect(() => { if (ready && state.loggedIn) router.replace(`/app/${state.role}`); }, [ready, state.loggedIn, state.role, router]);

  const enter = (role: Role) => { setBusy(true); login(role); router.push(`/app/${role}`); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: typeof errs = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = "Enter a valid email address";
    if (pw.length < 6) er.pw = "Password must be at least 6 characters";
    setErrs(er);
    if (Object.keys(er).length) return;
    try { if (remember) localStorage.setItem("mirai-remember", email); else localStorage.removeItem("mirai-remember"); } catch { /* noop */ }
    if (cloud) {
      setBusy(true);
      const res = await signIn(email.trim(), pw);
      if ("error" in res) { setBusy(false); setErrs({ form: res.error }); return; }
      router.push(`/app/${res.role}`);
      return;
    }
    const match = (Object.keys(PERSONAS) as Role[]).find((r) => PERSONAS[r].email === email.trim().toLowerCase());
    if (!match || pw !== "demo1234") { setErrs({ form: "Those demo credentials don't match. Use a demo email with password demo1234, or pick a role below." }); return; }
    enter(match);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="grid-bg relative hidden flex-col justify-between overflow-hidden border-r border-line bg-[#080e22] p-10 lg:flex">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white">M</span><div className="leading-tight"><p className="font-semibold text-white">Mirai School of Technology</p><p className="text-[11px] uppercase tracking-widest text-slate-500">Academic Operating System</p></div></div>
        <div className="relative max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">Know whether every course will finish on time, <span className="bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">before the exam finds out.</span></h1>
          <p className="mt-4 text-slate-400">One connected workflow links the planned curriculum to verified classroom delivery, student practice, and a clear forecast for management.</p>
          <ol className="mt-8 flex flex-wrap gap-2" aria-label="Academic workflow">{FLOW.map((f, i) => <li key={f} className="flex items-center gap-2 text-xs text-slate-300"><span className="rounded-md border border-line bg-panel px-2 py-1">{f}</span>{i < FLOW.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600" />}</li>)}</ol>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-slate-500"><BookOpen className="h-3.5 w-3.5" />{cloud ? "Connected to Supabase. Sign in with your Mirai account." : "Frontend prototype with sample data. No real accounts, AI, or transcription are connected."}</p>
      </aside>

      <main className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md anim-fade">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white">M</span><p className="font-semibold text-white">Mirai Academic OS</p></div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Sign in</h2>
          <p className="mt-1 text-sm text-slate-400">{cloud ? "Use the email and password for your Mirai account." : "Demo sign-in. Credentials are checked against sample accounts only."}</p>

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            {errs.form && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{errs.form}</div>}
            <Field label="Email" error={errs.email} hint={cloud ? undefined : "Try faculty: priya.nair@mirai.demo"}>{(a) => <Input {...a} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mirai.demo" />}</Field>
            <Field label="Password" error={errs.pw} hint={cloud ? undefined : "Demo password: demo1234"}>{(a) => (
              <div className="relative"><Input {...a} type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:text-white">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            )}</Field>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-indigo-500" />Remember me</label>
              <button type="button" onClick={() => { setForgot(true); setFSent(false); setFEmail(email); }} className="text-indigo-300 hover:underline">Forgot password?</button>
            </div>
            <Button type="submit" variant="primary" className="w-full" disabled={busy}>{busy ? "Signing in…" : cloud ? "Sign in" : "Sign in to demo"}</Button>
          </form>

          {!cloud && (<>
          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-600"><span className="h-px flex-1 bg-line" />or enter a demo role<span className="h-px flex-1 bg-line" /></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ENTRIES.map((e) => (
              <button key={e.role} onClick={() => enter(e.role)} className="group rounded-xl border border-line bg-panel p-3 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-500/50">
                <e.icon className="h-4 w-4 text-indigo-300" /><p className="mt-2 text-sm font-medium text-white">{e.label}</p><p className="text-xs text-slate-500">{e.desc}</p>
              </button>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 text-[11px] leading-snug text-slate-500"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />Role entry is for demonstration. It does not verify identity or enforce permissions.</p>
          </>)}
        </div>
      </main>

      <Modal open={forgot} onClose={() => setForgot(false)} title="Reset password" description={cloud ? "Contact your administrator." : "Demo interaction only."} footer={<><Button onClick={() => setForgot(false)}>Close</Button>{!cloud && !fSent && <Button variant="primary" onClick={() => { if (!/^\S+@\S+\.\S+$/.test(fEmail)) { toast("error", "Enter a valid email"); return; } setFSent(true); }}>Send reset link</Button>}</>}>
        {cloud ? <p className="flex items-start gap-2 text-sm text-slate-300"><Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />Password resets are handled by your administrator in Supabase (Authentication, Users).</p>
        : fSent ? <p className="flex items-start gap-2 text-sm text-slate-300"><Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />Simulated: no email was sent because this prototype has no backend. In the demo, use password <code className="rounded bg-slate-800 px-1">demo1234</code>.</p>
          : <Field label="Account email">{(a) => <Input {...a} type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />}</Field>}
      </Modal>
    </div>
  );
}

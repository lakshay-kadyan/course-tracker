export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const DAY = 86400000;
export const parseISO = (s: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s ?? "")) return null;
  const t = Date.parse(s + "T00:00:00Z");
  return Number.isNaN(t) ? null : t;
};
export const toISO = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => { const t = parseISO(s); return t === null ? s : toISO(t + n * DAY); };
export const diffDays = (a: string, b: string): number | null => {
  const x = parseISO(a), y = parseISO(b);
  return x === null || y === null ? null : Math.round((y - x) / DAY);
};
export const fmtDate = (s: string | null | undefined, withYear = false) => {
  const t = s ? parseISO(s) : null;
  if (t === null) return "—";
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
};
export const weekday = (s: string) => { const t = parseISO(s); return t === null ? 0 : new Date(t).getUTCDay(); };
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const round = (n: number, d = 1) => { const f = 10 ** d; return Math.round(n * f) / f; };
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function downloadCSV(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const split = (l: string) => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()).slice(0, -1);
  const head = split(lines[0] + ",");
  return lines.slice(1).map((l) => { const c = split(l + ","); return Object.fromEntries(head.map((h, i) => [h, c[i] ?? ""])); });
}

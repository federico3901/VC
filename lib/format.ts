export function money(v: number | null | undefined, compact = true): string {
  if (v == null) return "—";
  if (!compact) return "$" + v.toLocaleString("en-US");
  const a = Math.abs(v);
  if (a >= 1e9) return `$${trim(v / 1e9)}B`;
  if (a >= 1e6) return `$${trim(v / 1e6)}M`;
  if (a >= 1e3) return `$${trim(v / 1e3)}k`;
  return `$${v}`;
}

function trim(n: number) {
  return n.toFixed(n >= 100 ? 0 : 1).replace(/\.0$/, "");
}

export const pct = (v: number | null | undefined, digits = 0) => (v == null ? "—" : `${v.toFixed(digits)}%`);
export const num = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-US"));

export function date(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v.length === 7 ? v + "-01" : v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-US", v.length === 7 ? { month: "short", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
}

export function daysSince(v: string | null | undefined, now = new Date()): number | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

export const today = () => new Date().toISOString().slice(0, 10);

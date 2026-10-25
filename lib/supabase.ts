// Server-only access to the Supabase `dossiers` table through its REST API (PostgREST).
// The secret key never reaches the browser; every request already passed the team password.
import "server-only";

export function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim().replace(/\/+$/, "");
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  return url && key ? { url, key } : null;
}

export interface DossierRow {
  id: string;
  data: unknown;
  updated_at?: string;
}

async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase not configured");
  const headers: Record<string, string> = { apikey: cfg.key, "Content-Type": "application/json" };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys only in apikey.
  if (cfg.key.startsWith("eyJ")) headers.Authorization = `Bearer ${cfg.key}`;
  if (init.prefer) headers.Prefer = init.prefer;
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    if (/PGRST205|dossiers/.test(body) && res.status === 404)
      throw new Error("The `dossiers` table does not exist yet: run supabase/schema.sql in the Supabase SQL Editor.");
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

export async function listDossiers(): Promise<DossierRow[]> {
  const res = await rest("dossiers?select=id,data,updated_at&order=updated_at.desc");
  return res.json();
}

export async function upsertDossiers(rows: DossierRow[]) {
  if (!rows.length) return;
  const now = new Date().toISOString();
  await rest("dossiers?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(rows.map((r) => ({ id: r.id, data: r.data, updated_at: now }))),
  });
}

export async function deleteDossier(id: string) {
  await rest(`dossiers?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
}

export const validId = (id: unknown): id is string => typeof id === "string" && /^[a-z0-9-]{1,120}$/i.test(id);

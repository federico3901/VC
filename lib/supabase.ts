// Server-only access to the Supabase `dossiers` table through its REST API (PostgREST).
// The secret key never reaches the browser; every request already passed the team password.
import "server-only";

/**
 * Accepts the project URL in the forms people usually paste: "https://<ref>.supabase.co",
 * with a trailing "/rest/v1", or the dashboard link "https://supabase.com/dashboard/project/<ref>".
 */
export function normalizeSupabaseUrl(raw: string): string {
  let url = raw.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  const dash = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) return `https://${dash[1]}.supabase.co`;
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  // Only the origin matters: drop any path such as "/rest/v1/" (the cause of PostgREST error PGRST125).
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/** Reads the role out of a legacy JWT key ("anon" / "service_role"); null for other key formats. */
function jwtRole(key: string): string | null {
  try {
    return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role ?? null;
  } catch {
    return null;
  }
}

export function supabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim().replace(/^["']|["']$/g, "");
  return rawUrl?.trim() && key ? { url: normalizeSupabaseUrl(rawUrl), key } : null;
}

/** Problems that can be spotted from the configuration alone, before calling Supabase. */
function configProblem(cfg: { url: string; key: string }): string | null {
  if (cfg.key.startsWith("sb_publishable_") || jwtRole(cfg.key) === "anon")
    return "SUPABASE_SECRET_KEY holds the public (publishable/anon) key. Use the secret key (sb_secret_…) or the legacy service_role key.";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(cfg.url) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(cfg.url))
    return `SUPABASE_URL "${cfg.url}" does not look like a project URL (https://<project>.supabase.co).`;
  return null;
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
  const problem = configProblem(cfg);
  if (problem) throw new Error(problem);
  let res: Response;
  try {
    res = await fetch(`${cfg.url}/rest/v1/${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new Error(`Cannot reach ${cfg.url}. Check SUPABASE_URL (Project Settings → Data API → Project URL) and that the project is not paused.`);
  }
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 404 && /PGRST205|dossiers/.test(body))
      throw new Error("The `dossiers` table does not exist yet: run supabase/schema.sql in Supabase → SQL Editor.");
    if (res.status === 401 || /Invalid API key|No API key/i.test(body))
      throw new Error("Supabase rejected the key. Copy the secret key (sb_secret_…) from Project Settings → API Keys into SUPABASE_SECRET_KEY, then redeploy.");
    if (/42501|row-level security|permission denied/i.test(body))
      throw new Error("Permission denied: the key in SUPABASE_SECRET_KEY is not the secret/service_role key.");
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

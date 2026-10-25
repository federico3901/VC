"use client";

// Dossier store.
// - With Supabase configured (see README) dossiers live in the shared `dossiers` table: each change is
//   saved to the server, and the list is refreshed when the window regains focus, so the whole team
//   sees the same data. The browser keeps a local copy as a cache.
// - Without Supabase everything stays in this browser's localStorage, as before.
// In both modes, tabs of the same browser follow each other's changes instead of overwriting them.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { normalizeStartup } from "./model";
import { sampleStartups } from "./sample";
import type { Startup } from "./types";

export const KEY = "topline.intake.v1";

export type Backend = "loading" | "local" | "supabase";
export type SyncState = "idle" | "saving" | "error";

interface Store {
  ready: boolean;
  startups: Startup[];
  backend: Backend;
  sync: SyncState;
  syncError: string | null;
  get: (id: string) => Startup | undefined;
  save: (s: Startup) => void;
  update: (id: string, fn: (s: Startup) => Startup) => void;
  remove: (id: string) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

function readLocal(): Startup[] | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Older saves are upgraded to the current shape; nothing is dropped.
    return Array.isArray(parsed) ? parsed.map(normalizeStartup) : null;
  } catch {
    // Never let unreadable data be replaced silently: keep a copy aside.
    try {
      localStorage.setItem(`${KEY}.unreadable-${Date.now()}`, raw);
    } catch {}
    return null;
  }
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json" }, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState<Backend>("loading");
  const [sync, setSync] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  const latest = useRef<Startup[]>([]);
  latest.current = startups;
  const dirty = useRef(new Set<string>()); // ids to upsert
  const deleted = useRef(new Set<string>()); // ids to delete
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remote = backend === "supabase";

  // ---- initial load ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocal();
      try {
        const json = await api("/api/dossiers");
        if (json.configured) {
          const server: Startup[] = (json.dossiers as unknown[]).map(normalizeStartup);
          const ids = new Set(server.map((s) => s.id));
          // Anything saved only in this browser is uploaded, so nothing is left behind.
          const onlyLocal = (local ?? (server.length ? [] : sampleStartups())).filter((s) => !ids.has(s.id));
          if (onlyLocal.length) await api("/api/dossiers", { method: "POST", body: JSON.stringify({ dossiers: onlyLocal }) });
          if (cancelled) return;
          setStartups([...server, ...onlyLocal]);
          setBackend("supabase");
          setReady(true);
          return;
        }
      } catch (e) {
        // Supabase configured but unreachable / table missing: keep working locally and say why.
        if (!cancelled) setSyncError((e as Error).message);
      }
      if (cancelled) return;
      setStartups(local ?? sampleStartups());
      setBackend("local");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- local cache (both modes) ----
  useEffect(() => {
    if (!ready) return;
    try {
      const next = JSON.stringify(startups);
      if (localStorage.getItem(KEY) !== next) localStorage.setItem(KEY, next);
    } catch {}
  }, [startups, ready]);

  // ---- other tabs of this browser: follow their changes instead of overwriting them ----
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) setStartups(parsed.map(normalizeStartup));
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ---- push changes to Supabase (debounced, per dossier) ----
  const flush = useCallback(async () => {
    timer.current = null;
    const ups = [...dirty.current];
    const dels = [...deleted.current];
    dirty.current.clear();
    deleted.current.clear();
    if (!ups.length && !dels.length) return;
    setSync("saving");
    try {
      for (const id of ups) {
        const s = latest.current.find((x) => x.id === id);
        if (s) await api(`/api/dossiers/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(s) });
      }
      for (const id of dels) await api(`/api/dossiers/${encodeURIComponent(id)}`, { method: "DELETE" });
      setSync("idle");
      setSyncError(null);
    } catch (e) {
      // Put them back so the next change (or focus) retries.
      ups.forEach((id) => dirty.current.add(id));
      dels.forEach((id) => deleted.current.add(id));
      setSync("error");
      setSyncError((e as Error).message);
    }
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }, [flush]);

  const markDirty = useCallback(
    (id: string) => {
      if (!remote) return;
      deleted.current.delete(id);
      dirty.current.add(id);
      schedule();
    },
    [remote, schedule],
  );

  // ---- pick up colleagues' changes when the window regains focus ----
  useEffect(() => {
    if (!remote) return;
    const refresh = async () => {
      if (dirty.current.size || deleted.current.size) return flush();
      try {
        const json = await api("/api/dossiers");
        if (!json.configured) return;
        setStartups((json.dossiers as unknown[]).map(normalizeStartup));
      } catch {}
    };
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [remote, flush]);

  // Save pending changes before the page goes away.
  useEffect(() => {
    const onHide = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        flush();
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flush]);

  const save = useCallback(
    (s: Startup) => {
      setStartups((all) => (all.some((x) => x.id === s.id) ? all.map((x) => (x.id === s.id ? s : x)) : [s, ...all]));
      markDirty(s.id);
    },
    [markDirty],
  );
  const update = useCallback(
    (id: string, fn: (s: Startup) => Startup) => {
      setStartups((all) => all.map((x) => (x.id === id ? fn(x) : x)));
      markDirty(id);
    },
    [markDirty],
  );
  const remove = useCallback(
    (id: string) => {
      setStartups((all) => all.filter((x) => x.id !== id));
      if (remote) {
        dirty.current.delete(id);
        deleted.current.add(id);
        schedule();
      }
    },
    [remote, schedule],
  );
  // Only offered in local mode: with Supabase it would wipe the team's data.
  const reset = useCallback(() => {
    if (!remote) setStartups(sampleStartups());
  }, [remote]);

  const value = useMemo<Store>(
    () => ({
      ready, startups, backend, sync, syncError,
      get: (id) => startups.find((s) => s.id === id),
      save, update, remove, reset,
    }),
    [ready, startups, backend, sync, syncError, save, update, remove, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

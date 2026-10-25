"use client";

// Client-side store. The sample keeps dossiers in localStorage so it runs with zero backend;
// swapping this for a database (Supabase/Postgres) only touches this file.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizeStartup } from "./model";
import { sampleStartups } from "./sample";
import type { Startup } from "./types";

export const KEY = "topline.intake.v1";

/** Copies a raw save to a dated backup key. Backups are listed and restorable on /backups. */
export function writeBackup(label: string, raw: string | null) {
  if (!raw) return;
  try {
    localStorage.setItem(`${KEY}.backup-${label}-${Date.now()}`, raw);
  } catch {}
}

/** One snapshot per day of the data as it was when the app opened; the last 7 are kept. */
function dailySnapshot(raw: string) {
  try {
    const key = `${KEY}.daily-${new Date().toISOString().slice(0, 10)}`;
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    const days = Object.keys(localStorage).filter((k) => k.startsWith(`${KEY}.daily-`)).sort();
    for (const k of days.slice(0, Math.max(0, days.length - 7))) localStorage.removeItem(k);
  } catch {}
}

interface Store {
  ready: boolean;
  startups: Startup[];
  get: (id: string) => Startup | undefined;
  save: (s: Startup) => void;
  update: (id: string, fn: (s: Startup) => Startup) => void;
  remove: (id: string) => void;
  reset: () => void;
  replaceAll: (list: Startup[]) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let data: Startup[] | null = null;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch {}
    if (raw) {
      dailySnapshot(raw);
      try {
        // A save from before multi-product support is copied before it is upgraded. Each copy gets its
        // own timestamped key so a later load can never overwrite an earlier backup.
        if (!raw.includes('"products"')) {
          const prev = Object.keys(localStorage).filter((k) => k.startsWith(`${KEY}.backup-before-products`));
          if (!prev.some((k) => localStorage.getItem(k) === raw)) writeBackup("before-products", raw);
        }
      } catch {}
      try {
        const parsed = JSON.parse(raw);
        // Older saves are upgraded to the current shape; nothing is dropped.
        if (Array.isArray(parsed)) data = parsed.map(normalizeStartup);
      } catch {
        // Never replace unreadable saved data with the samples: keep a copy and stop here.
        try {
          localStorage.setItem(`${KEY}.unreadable-${Date.now()}`, raw);
        } catch {}
      }
    }
    setStartups(data ?? sampleStartups());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(startups));
    } catch {}
  }, [startups, ready]);

  const save = useCallback((s: Startup) => {
    setStartups((all) => (all.some((x) => x.id === s.id) ? all.map((x) => (x.id === s.id ? s : x)) : [s, ...all]));
  }, []);
  const update = useCallback((id: string, fn: (s: Startup) => Startup) => {
    setStartups((all) => all.map((x) => (x.id === id ? fn(x) : x)));
  }, []);
  const remove = useCallback((id: string) => setStartups((all) => all.filter((x) => x.id !== id)), []);
  const reset = useCallback(() => {
    try {
      writeBackup("before-reset", localStorage.getItem(KEY));
    } catch {}
    setStartups(sampleStartups());
  }, []);
  const replaceAll = useCallback((list: Startup[]) => {
    try {
      writeBackup("before-restore", localStorage.getItem(KEY));
    } catch {}
    setStartups(list.map(normalizeStartup));
  }, []);

  const value = useMemo<Store>(
    () => ({ ready, startups, get: (id) => startups.find((s) => s.id === id), save, update, remove, reset, replaceAll }),
    [ready, startups, save, update, remove, reset, replaceAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

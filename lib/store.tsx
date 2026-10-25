"use client";

// Client-side store. The sample keeps dossiers in localStorage so it runs with zero backend;
// swapping this for a database (Supabase/Postgres) only touches this file.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizeStartup } from "./model";
import { sampleStartups } from "./sample";
import type { Startup } from "./types";

const KEY = "topline.intake.v1";

interface Store {
  ready: boolean;
  startups: Startup[];
  get: (id: string) => Startup | undefined;
  save: (s: Startup) => void;
  update: (id: string, fn: (s: Startup) => Startup) => void;
  remove: (id: string) => void;
  reset: () => void;
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
      try {
        // A save from before multi-product support gets a one-time backup before it is upgraded.
        if (!raw.includes('"products"')) localStorage.setItem(`${KEY}.backup-before-products`, raw);
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
  const reset = useCallback(() => setStartups(sampleStartups()), []);

  const value = useMemo<Store>(
    () => ({ ready, startups, get: (id) => startups.find((s) => s.id === id), save, update, remove, reset }),
    [ready, startups, save, update, remove, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

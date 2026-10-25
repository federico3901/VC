"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "@/components/bits";
import { completeness, normalizeStartup } from "@/lib/model";
import { KEY, useStore } from "@/lib/store";
import type { Startup } from "@/lib/types";

interface Backup {
  key: string;
  label: string;
  at: number | null;
  dossiers: Startup[] | null; // null = could not be read
}

function describe(key: string): { label: string; at: number | null } {
  const rest = key.slice(KEY.length + 1);
  const ts = rest.match(/-(\d{12,})$/);
  const at = ts ? Number(ts[1]) : null;
  if (rest.startsWith("daily-")) return { label: `Daily snapshot · ${rest.slice(6)}`, at: Date.parse(rest.slice(6)) || null };
  if (rest.startsWith("backup-before-products")) return { label: "Before the multi-product update", at };
  if (rest.startsWith("backup-before-reset")) return { label: "Before “Reset sample data”", at };
  if (rest.startsWith("backup-before-restore")) return { label: "Before a restore", at };
  if (rest.startsWith("unreadable")) return { label: "Save that could not be loaded", at };
  return { label: rest, at };
}

function readBackups(): Backup[] {
  const out: Backup[] = [];
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(`${KEY}.`)) continue;
      const { label, at } = describe(key);
      let dossiers: Startup[] | null = null;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "");
        if (Array.isArray(parsed)) dossiers = parsed.map(normalizeStartup);
      } catch {}
      out.push({ key, label, at, dossiers });
    }
  } catch {}
  return out.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

const when = (t: number | null) =>
  t ? new Date(t).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export default function BackupsPage() {
  const { startups, ready, replaceAll } = useStore();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready) setBackups(readBackups());
  }, [ready, startups]);

  const currentIds = useMemo(() => new Set(startups.map((s) => s.id)), [startups]);

  function restoreOne(d: Startup) {
    const exists = currentIds.has(d.id);
    if (exists && !confirm(`Replace the current “${d.name}” with this backup version? The current data is backed up first.`)) return;
    replaceAll(exists ? startups.map((s) => (s.id === d.id ? d : s)) : [d, ...startups]);
    setToast(`${d.name} restored.`);
  }

  function restoreAll(b: Backup) {
    if (!b.dossiers) return;
    if (!confirm(`Replace all current data (${startups.length} companies) with this backup (${b.dossiers.length} companies)? The current data is backed up first.`)) return;
    replaceAll(b.dossiers);
    setToast(`Restored ${b.dossiers.length} companies from “${b.label}”.`);
  }

  function download() {
    const blob = new Blob([JSON.stringify(startups, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `topline-intake-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importFile(f: File) {
    try {
      const parsed = JSON.parse(await f.text());
      if (!Array.isArray(parsed)) throw new Error("not a list");
      const list = parsed.map(normalizeStartup);
      if (!confirm(`Replace all current data with the ${list.length} companies in “${f.name}”? The current data is backed up first.`)) return;
      replaceAll(list);
      setToast(`Imported ${list.length} companies.`);
    } catch {
      setToast("That file is not a Topline Intake backup.");
    }
  }

  if (!ready) return <main className="page" />;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Saved in this browser · {typeof window !== "undefined" ? window.location.host : ""}</div>
          <h1 className="display">Backups &amp; restore</h1>
        </div>
        <div className="row">
          <button className="btn" onClick={() => file.current?.click()}>Import file…</button>
          <button className="btn primary" onClick={download}>Download backup (.json)</button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="callout" style={{ marginBottom: 14 }}>
        Data is stored per browser <em>and per web address</em>. If a company is missing, check you are on the same
        address you used before (e.g. <span className="mono">vc-five-puce.vercel.app</span>, not a deployment-specific
        link), then look for it in the backups below.
      </div>

      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-head">
          <h2 className="panel-title">Current data</h2>
          <span className="eyebrow">{startups.length} companies</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {startups.map((s) => (
            <span key={s.id} className="chip">{s.name}</span>
          ))}
        </div>
      </section>

      {!backups.length && <div className="panel muted">No backups in this browser yet.</div>}

      <div className="stack-v" style={{ gap: 14 }}>
        {backups.map((b) => (
          <section key={b.key} className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">{b.label}</h2>
                <div className="eyebrow">
                  {when(b.at)}
                  {b.dossiers ? ` · ${b.dossiers.length} companies` : " · unreadable"}
                </div>
              </div>
              {b.dossiers && (
                <button className="btn small" onClick={() => restoreAll(b)}>Restore all</button>
              )}
            </div>
            {b.dossiers ? (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th className="r">Dossier</th>
                      <th className="r">Notes</th>
                      <th>Now</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {b.dossiers.map((d) => {
                      const cur = startups.find((s) => s.id === d.id);
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 600 }}>{d.name}</td>
                          <td className="r num">{completeness(d).pct}%</td>
                          <td className="r num">{d.notes.length}</td>
                          <td className="muted" style={{ fontSize: 12.5 }}>
                            {!cur ? (
                              <span className="tag" style={{ color: "var(--serious)" }}>Missing now</span>
                            ) : (
                              `current: ${completeness(cur).pct}% · ${cur.notes.length} notes`
                            )}
                          </td>
                          <td className="r">
                            <button className="btn small" onClick={() => restoreOne(d)}>
                              {cur ? "Restore this version" : "Restore"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="muted">This copy could not be read.</div>
            )}
          </section>
        ))}
      </div>
      {toast && <Toast onClose={() => setToast(null)}>{toast}</Toast>}
    </main>
  );
}

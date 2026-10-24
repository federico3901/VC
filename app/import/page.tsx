"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SearchIcon, StatusBadge, Toast } from "@/components/bits";
import { date, money } from "@/lib/format";
import type { NotionDeal } from "@/lib/notion-map";
import { useStore } from "@/lib/store";
import { describeMerge, syncDeal } from "@/lib/sync";
import type { DealStatus } from "@/lib/types";

export default function ImportPage() {
  const { startups, save, ready } = useStore();
  const [deals, setDeals] = useState<NotionDeal[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notion/deals", { cache: "no-store" });
      const json = await res.json();
      setConfigured(json.configured);
      setDeals(json.deals ?? []);
      if (json.error) setError(json.error);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const linked = useMemo(() => new Map(startups.filter((s) => s.notionPageId).map((s) => [s.notionPageId!, s])), [startups]);
  const rows = deals.filter((d) => !q || d.firm.toLowerCase().includes(q.toLowerCase()));

  async function importOne(d: NotionDeal) {
    const r = await syncDeal(d.pageId, startups);
    save(r.startup);
    return r;
  }

  async function run(d: NotionDeal) {
    setBusy(d.pageId);
    try {
      const r = await importOne(d);
      setToast(`${d.firm}: ${describeMerge(r)}`);
    } catch (e) {
      setToast(`${d.firm}: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function syncAllLinked() {
    setBusy("all");
    let ok = 0;
    let changed = 0;
    for (const d of deals.filter((x) => linked.has(x.pageId))) {
      try {
        const r = await importOne(d);
        ok++;
        if (r.updated.length) changed++;
      } catch {}
    }
    setBusy(null);
    setToast(`Synced ${ok} linked dossiers · ${changed} had changes.`);
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Topline Ventures › Operating Hub › Database › Deal Flow</div>
          <h1 className="display">Notion sync</h1>
        </div>
        <div className="row">
          <button className="btn" onClick={load} disabled={loading}>↻ Refresh list</button>
          <button className="btn primary" onClick={syncAllLinked} disabled={!!busy || !linked.size}>
            {busy === "all" ? "Syncing…" : `Sync all linked (${deals.filter((d) => linked.has(d.pageId)).length})`}
          </button>
        </div>
      </div>

      {configured === false && (
        <div className="callout warn" style={{ marginBottom: 14 }}>
          <strong>Demo mode.</strong> No <span className="mono">NOTION_TOKEN</span> is set, so these rows are fictional examples.
          Add your integration token to <span className="mono">.env.local</span> (see README) to read the real Deal Flow database.
        </div>
      )}
      {error && <div className="callout warn" style={{ marginBottom: 14 }}>Notion error: {error}</div>}

      <div className="grid g-main">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Deal Flow rows</h2>
            <label className="search" style={{ minWidth: 200 }}>
              <SearchIcon />
              <input placeholder="Filter by firm" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Firm</th>
                  <th>Deal status</th>
                  <th>Stage</th>
                  <th className="r">Raising</th>
                  <th className="r">Score</th>
                  <th>Edited</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="muted">Loading from Notion…</td></tr>
                )}
                {!loading && rows.map((d) => {
                  const s = linked.get(d.pageId);
                  const status = (d.status === "To be reviwed" ? "To be reviewed" : d.status) as DealStatus | null;
                  return (
                    <tr key={d.pageId}>
                      <td>
                        <div className="co-name">{d.firm || "Untitled"}</div>
                        <div className="co-sub">{d.industries.join(", ") || d.notes.slice(0, 60)}</div>
                      </td>
                      <td>{status ? <StatusBadge status={status} /> : "—"}</td>
                      <td>{d.stage ?? "—"}</td>
                      <td className="r num">{money(d.raising)}</td>
                      <td className="r num">{d.score ?? "—"}</td>
                      <td className="num muted" style={{ fontSize: 12 }}>{date(d.lastEdited)}</td>
                      <td className="r">
                        <div className="row" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          {s && <Link className="btn ghost small" href={`/companies/${s.id}`}>Open</Link>}
                          <button className={`btn small ${s ? "" : "primary"}`} disabled={!!busy || !ready} onClick={() => run(d)}>
                            {busy === d.pageId ? "…" : s ? "Sync" : "Import"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !rows.length && (
                  <tr><td colSpan={7} className="muted">No rows.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel" style={{ alignSelf: "start" }}>
          <h2 className="panel-title" style={{ marginBottom: 10 }}>How the sync works</h2>
          <div className="stack-v" style={{ fontSize: 13 }}>
            <p className="muted" style={{ margin: 0 }}>
              Each Deal Flow property maps directly onto a dossier field through the Notion API. No AI model is involved, so there is no inference cost.
            </p>
            <div className="table-wrap"><table className="data" style={{ fontSize: 12 }}>
              <thead><tr><th>Notion</th><th>Dossier</th></tr></thead>
              <tbody>
                {[
                  ["Firm", "Company name"],
                  ["Stage / Industry", "Stage / Sectors"],
                  ["Deal Status", "Status"],
                  ["Raising / Raised", "Round size / Raised to date"],
                  ["Valuation", "Pre-money (reported)"],
                  ["Round Info", "Instrument + round notes"],
                  ["Website / Headquarter", "Website / HQ"],
                  ["Drive", "Documents"],
                  ["Last Contact", "Last contact"],
                  ["Score", "Notion score"],
                  ["Notes + page body", "Timeline entry"],
                ].map(([a, b]) => (
                  <tr key={a}><td className="mono" style={{ fontSize: 11 }}>{a}</td><td>{b}</td></tr>
                ))}
              </tbody>
            </table></div>
            <div className="callout">
              <strong>Founder calls win.</strong> Notion fills empty fields and refreshes the fields it owns, but never
              overwrites a value captured on a call, from a deck or edited by hand. Each field shows its source.
            </div>
          </div>
        </aside>
      </div>
      {toast && <Toast onClose={() => setToast(null)}>{toast}</Toast>}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { HBars } from "@/components/charts";
import { Monogram, StatusBadge } from "@/components/bits";
import { PipelineTable } from "@/components/PipelineTable";
import { completeness, ddProgress, weightedScore } from "@/lib/model";
import { daysSince, money } from "@/lib/format";
import { useStore } from "@/lib/store";
import { DEAL_STATUSES, STAGES } from "@/lib/types";

const ACTIVE = new Set(["First Meeting", "Second Meeting", "DD", "IC Review"]);

export default function Dashboard() {
  const { startups, ready } = useStore();
  const router = useRouter();

  const m = useMemo(() => {
    const active = startups.filter((s) => ACTIVE.has(s.status));
    const scores = startups.map((s) => weightedScore(s) ?? s.notionScore).filter((v): v is number => v != null);
    const byStatus = DEAL_STATUSES.map((st) => ({ label: st, value: startups.filter((s) => s.status === st).length }));
    const sectorCount = new Map<string, number>();
    startups.forEach((s) => s.sectors.forEach((x) => sectorCount.set(x, (sectorCount.get(x) ?? 0) + 1)));
    const bySector = [...sectorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
    const byStage = STAGES.map((st) => ({ label: st, value: startups.filter((s) => s.stage === st).length }));

    const attention: { id: string; name: string; status: (typeof startups)[number]["status"]; reason: string }[] = [];
    for (const s of startups) {
      const reasons: string[] = [];
      const flags = ddProgress(s).flags;
      if (flags) reasons.push(`${flags} DD red flag${flags > 1 ? "s" : ""}`);
      const d = daysSince(s.lastContact);
      if (ACTIVE.has(s.status) && d != null && d > 14) reasons.push(`No contact in ${d} days`);
      const pct = completeness(s).pct;
      if (ACTIVE.has(s.status) && pct < 40) reasons.push(`Dossier ${pct}% complete`);
      if (reasons.length) attention.push({ id: s.id, name: s.name, status: s.status, reason: reasons.join(" · ") });
    }
    return {
      active,
      inDD: startups.filter((s) => s.status === "DD" || s.status === "IC Review").length,
      capital: active.reduce((a, s) => a + (s.round.raising ?? 0), 0),
      ourTickets: active.reduce((a, s) => a + (s.round.ourTicket ?? 0), 0),
      avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      avgComplete: startups.length ? startups.reduce((a, s) => a + completeness(s).pct, 0) / startups.length : 0,
      invested: startups.filter((s) => s.status === "Invested").length,
      byStatus,
      bySector,
      byStage,
      attention,
    };
  }, [startups]);

  if (!ready) return <main className="page" />;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Topline Ventures · Deal flow</div>
          <h1 className="display">Pipeline dashboard</h1>
        </div>
        <div className="row">
          <Link className="btn" href="/import">↻ Sync from Notion</Link>
          <Link className="btn primary" href="/companies?new=1">+ New company</Link>
        </div>
      </div>

      <section className="grid g-kpi" style={{ marginBottom: 14 }}>
        <Kpi label="Active deals" value={String(m.active.length)} sub={`${startups.length} total tracked`} />
        <Kpi label="In DD / IC" value={String(m.inDD)} sub={`${m.invested} invested`} />
        <Kpi label="Capital sought" value={money(m.capital)} sub="Sum of active rounds" />
        <Kpi label="Avg score" value={m.avgScore != null ? m.avgScore.toFixed(0) : "—"} sub="Weighted, 0–100" />
        <Kpi label="Avg dossier" value={`${Math.round(m.avgComplete)}%`} sub="Fields completed" />
      </section>

      <section className="grid g-3" style={{ marginBottom: 14 }}>
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Funnel</h2>
            <span className="eyebrow">Deals by status</span>
          </div>
          <HBars rows={m.byStatus} labelWidth={118} format={(v) => String(v)} onClick={(l) => router.push(`/companies?status=${encodeURIComponent(l)}`)} />
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Sectors</h2>
            <span className="eyebrow">Top 8</span>
          </div>
          <HBars rows={m.bySector} labelWidth={118} format={(v) => String(v)} />
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Needs attention</h2>
            <span className="eyebrow">{m.attention.length} items</span>
          </div>
          <div className="stack-v">
            {m.attention.slice(0, 7).map((a, i) => (
              <Link key={a.id + i} href={`/companies/${a.id}`} className="row" style={{ flexWrap: "nowrap", gap: 10 }}>
                <Monogram name={a.name} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{a.reason}</div>
                </div>
                <StatusBadge status={a.status} />
              </Link>
            ))}
            {!m.attention.length && <div className="muted">Nothing urgent.</div>}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">All companies</h2>
          <span className="eyebrow">Click a row to open the dossier</span>
        </div>
        <PipelineTable startups={startups} />
      </section>
    </main>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="panel kpi">
      <div className="eyebrow">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

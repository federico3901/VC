"use client";

import { useEffect, useRef, useState } from "react";
import { selfMetric } from "@/lib/model";
import { money, num, pct } from "@/lib/format";
import type { CompetitorKpi, Startup } from "@/lib/types";
import { useTooltip } from "./bits";
import { useDossier } from "./dossier";

export function fmtKpi(k: CompetitorKpi, v: number | null | undefined) {
  if (v == null) return "—";
  return k.unit === "$" ? money(v) : k.unit === "%" ? pct(v, Number.isInteger(v) ? 0 : 1) : num(v);
}

/** Dossier fields a KPI can take the company's own value from. */
export const LINKABLE_FIELDS: { path: string; label: string }[] = [
  { path: "", label: "— none (type it in) —" },
  { path: "round.totalRaised", label: "Raised to date" },
  { path: "round.raising", label: "Round size" },
  { path: "round.preMoney", label: "Pre-money" },
  { path: "traction.arr", label: "ARR" },
  { path: "traction.customers", label: "Customers" },
  { path: "traction.growthMoM", label: "MoM growth %" },
  { path: "traction.nrr", label: "NRR %" },
  { path: "traction.grossMargin", label: "Gross margin %" },
  { path: "traction.burn", label: "Monthly burn" },
  { path: "employees", label: "Employees" },
];

interface Entity {
  name: string;
  self: boolean;
  value: (k: CompetitorKpi) => number | null;
}

function entities(s: Startup): Entity[] {
  return [
    { name: s.name, self: true, value: (k) => selfMetric(s, k) },
    ...s.competitors.map((c) => ({ name: c.name || "Unnamed", self: false, value: (k: CompetitorKpi) => c.metrics?.[k.id] ?? null })),
  ];
}

// ---------- view: chart builder ----------

export function CompetitorCharts({ s }: { s: Startup }) {
  const kpis = s.competitorKpis;
  const [mode, setMode] = useState<"bar" | "scatter">("bar");
  const [kpiId, setKpiId] = useState(kpis[0]?.id ?? "");
  const [xId, setXId] = useState(kpis[0]?.id ?? "");
  const [yId, setYId] = useState(kpis[1]?.id ?? kpis[0]?.id ?? "");
  const byId = (id: string) => kpis.find((k) => k.id === id) ?? kpis[0];

  if (!kpis.length || !s.competitors.length)
    return <div className="field-value empty">Add competitors and KPIs (Edit) to build comparison charts.</div>;

  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <select className="select" style={{ width: "auto" }} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {kpis.map((k) => (
        <option key={k.id} value={k.id}>{k.label}</option>
      ))}
    </select>
  );

  return (
    <div>
      <div className="filters" style={{ marginBottom: 14 }}>
        <div className="seg" role="tablist" aria-label="Chart type">
          <button role="tab" aria-selected={mode === "bar"} className={mode === "bar" ? "on" : ""} onClick={() => setMode("bar")}>Bars</button>
          <button role="tab" aria-selected={mode === "scatter"} className={mode === "scatter" ? "on" : ""} onClick={() => setMode("scatter")}>Map (X vs Y)</button>
        </div>
        {mode === "bar" ? (
          <>
            <span className="eyebrow">KPI</span>
            {select(kpiId, setKpiId, "KPI")}
          </>
        ) : (
          <>
            <span className="eyebrow">X</span>
            {select(xId, setXId, "X axis KPI")}
            <span className="eyebrow">Y</span>
            {select(yId, setYId, "Y axis KPI")}
          </>
        )}
      </div>
      {mode === "bar" ? <KpiBars s={s} k={byId(kpiId)} /> : <KpiScatter s={s} x={byId(xId)} y={byId(yId)} />}
    </div>
  );
}

function KpiBars({ s, k }: { s: Startup; k: CompetitorKpi }) {
  const tip = useTooltip();
  const all = entities(s);
  const rows = all.map((e) => ({ e, v: e.value(k) })).filter((r) => r.v != null) as { e: Entity; v: number }[];
  rows.sort((a, b) => b.v - a.v);
  const missing = all.filter((e) => e.value(k) == null).map((e) => e.name);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.v)));
  return (
    <div>
      {rows.map(({ e, v }) => (
        <div
          key={e.name + e.self}
          className="hbar"
          style={{ gridTemplateColumns: "170px 1fr 70px" }}
          {...tip.bind(
            <>
              <div style={{ fontWeight: 600 }}>{e.name}</div>
              <div className="num">{k.label}: {fmtKpi(k, v)}</div>
            </>,
          )}
        >
          <span style={{ fontWeight: e.self ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {e.name}
            {e.self && <span className="muted" style={{ fontWeight: 400 }}> (this deal)</span>}
          </span>
          <div className="track">
            <div className="fill" style={{ width: `${(Math.abs(v) / max) * 100}%`, background: e.self ? "var(--signal)" : "var(--faint)" }} />
          </div>
          <span className="val">{fmtKpi(k, v)}</span>
        </div>
      ))}
      {!rows.length && <div className="field-value empty">No values for {k.label} yet.</div>}
      {missing.length > 0 && (
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          No data for: {missing.join(", ")}
        </div>
      )}
      {tip.node}
    </div>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function KpiScatter({ s, x, y }: { s: Startup; x: CompetitorKpi; y: CompetitorKpi }) {
  const tip = useTooltip();
  const all = entities(s);
  const pts = all
    .map((e) => ({ e, x: e.value(x), y: e.value(y) }))
    .filter((p) => p.x != null && p.y != null) as { e: Entity; x: number; y: number }[];
  const missing = all.filter((e) => e.value(x) == null || e.value(y) == null).map((e) => e.name);
  // Draw in real pixels so labels keep their size at any panel width.
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 320;
  const pad = { l: 64, r: 24, t: 16, b: 40 };
  const mx = niceMax(Math.max(0, ...pts.map((p) => p.x)));
  const my = niceMax(Math.max(0, ...pts.map((p) => p.y)));
  const sx = (v: number) => pad.l + (v / mx) * (W - pad.l - pad.r);
  const sy = (v: number) => H - pad.b - (v / my) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  if (!pts.length)
    return <div ref={wrap} className="field-value empty">Need values for both {x.label} and {y.label} to plot.</div>;

  return (
    <div ref={wrap}>
      <svg className="chart-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${y.label} vs ${x.label}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={pad.l} x2={W - pad.r} y1={sy(t * my)} y2={sy(t * my)} />
            <text className="axis" x={pad.l - 8} y={sy(t * my) + 3} textAnchor="end">{fmtKpi(y, t * my)}</text>
            <text className="axis" x={sx(t * mx)} y={H - pad.b + 16} textAnchor="middle">{fmtKpi(x, t * mx)}</text>
          </g>
        ))}
        <text className="axis" x={(pad.l + W - pad.r) / 2} y={H - 4} textAnchor="middle">{x.label} →</text>
        <text className="axis" transform={`translate(12 ${(pad.t + H - pad.b) / 2}) rotate(-90)`} textAnchor="middle">{y.label} →</text>
        {pts.map((p) => (
          <g key={p.e.name + p.e.self} {...tip.bind(
            <>
              <div style={{ fontWeight: 600 }}>{p.e.name}</div>
              <div className="num">{x.label}: {fmtKpi(x, p.x)}</div>
              <div className="num">{y.label}: {fmtKpi(y, p.y)}</div>
            </>,
          )}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={14} fill="transparent" />
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={p.e.self ? 7 : 5.5}
              fill={p.e.self ? "var(--signal)" : "var(--faint)"}
              stroke="var(--panel-solid)"
              strokeWidth={2}
            />
            <text
              x={sx(p.x) + (sx(p.x) > W - 140 ? -10 : 10)}
              y={sy(p.y) - 8}
              textAnchor={sx(p.x) > W - 140 ? "end" : "start"}
              style={{ fontSize: 12.5, fill: "var(--ink)", fontWeight: p.e.self ? 600 : 400 }}
            >
              {p.e.name}
            </text>
          </g>
        ))}
      </svg>
      {missing.length > 0 && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Not plotted (missing a value): {missing.join(", ")}
        </div>
      )}
      {tip.node}
    </div>
  );
}

// ---------- edit: KPI definitions + values matrix ----------

export function CompetitorKpiEditor() {
  const { s, set } = useDossier();
  const kpis = s.competitorKpis;
  const numIn = (v: number | null | undefined, onChange: (v: number | null) => void, placeholder?: string) => (
    <input
      className="input"
      type="number"
      step="any"
      value={v == null ? "" : String(v)}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
  const updateKpi = (i: number, patch: Partial<CompetitorKpi>) =>
    set("competitorKpis", kpis.map((k, j) => (j === i ? { ...k, ...patch } : k)));

  return (
    <div className="stack-v" style={{ gap: 18, marginTop: 18 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>KPIs to compare</div>
        <div className="table-wrap">
          <table className="edit-table">
            <thead>
              <tr>
                <th className="eyebrow">Name</th>
                <th className="eyebrow" style={{ width: 90 }}>Unit</th>
                <th className="eyebrow" style={{ width: 230 }}>This deal&apos;s value comes from</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {kpis.map((k, i) => (
                <tr key={k.id}>
                  <td><input className="input" value={k.label} onChange={(e) => updateKpi(i, { label: e.target.value })} /></td>
                  <td>
                    <select className="select" value={k.unit} onChange={(e) => updateKpi(i, { unit: e.target.value as CompetitorKpi["unit"] })}>
                      <option value="$">$</option>
                      <option value="#">#</option>
                      <option value="%">%</option>
                    </select>
                  </td>
                  <td>
                    <select className="select" value={k.from ?? ""} onChange={(e) => updateKpi(i, { from: e.target.value || undefined })}>
                      {LINKABLE_FIELDS.map((f) => (
                        <option key={f.path} value={f.path}>{f.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="btn ghost small danger" aria-label={`Remove ${k.label}`} onClick={() => set("competitorKpis", kpis.filter((_, j) => j !== i))}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="btn small"
          style={{ marginTop: 8 }}
          onClick={() => set("competitorKpis", [...kpis, { id: `k${Date.now().toString(36)}`, label: "New KPI", unit: "#" }])}
        >
          + Add KPI
        </button>
      </div>

      {kpis.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Values</div>
          <div className="table-wrap">
            <table className="edit-table">
              <thead>
                <tr>
                  <th className="eyebrow">Company</th>
                  {kpis.map((k) => (
                    <th key={k.id} className="eyebrow">{k.label} ({k.unit})</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, paddingTop: 10 }}>{s.name} <span className="muted" style={{ fontWeight: 400 }}>(this deal)</span></td>
                  {kpis.map((k) => {
                    const linked = selfMetric({ ...s, selfMetrics: {} }, k);
                    return (
                      <td key={k.id}>
                        {numIn(s.selfMetrics[k.id], (v) => set("selfMetrics", { ...s.selfMetrics, [k.id]: v }), linked != null ? `${linked} (from dossier)` : undefined)}
                      </td>
                    );
                  })}
                </tr>
                {s.competitors.map((c, i) => (
                  <tr key={i}>
                    <td style={{ paddingTop: 10 }}>{c.name || `Competitor ${i + 1}`}</td>
                    {kpis.map((k) => (
                      <td key={k.id}>
                        {numIn(c.metrics?.[k.id], (v) =>
                          set("competitors", s.competitors.map((x, j) => (j === i ? { ...x, metrics: { ...x.metrics, [k.id]: v } } : x))),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Leave this deal&apos;s cells empty to use the linked dossier field (shown in grey).
          </div>
        </div>
      )}
    </div>
  );
}

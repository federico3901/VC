"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTooltip } from "./bits";

export const CAT = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"];
/** Fixed categorical order; anything past 6 folds into the last slot. */
export const catColor = (i: number) => CAT[Math.min(i, CAT.length - 1)];

/** Single-series horizontal bars (magnitude). */
export function HBars({
  rows,
  format = (v) => String(v),
  labelWidth = 120,
  onClick,
}: {
  rows: { label: string; value: number; hint?: string }[];
  format?: (v: number) => string;
  labelWidth?: number;
  onClick?: (label: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const tip = useTooltip();
  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="hbar"
          style={{ gridTemplateColumns: `${labelWidth}px 1fr 52px`, cursor: onClick ? "pointer" : undefined }}
          onClick={onClick ? () => onClick(r.label) : undefined}
          {...tip.bind(
            <>
              <div style={{ fontWeight: 600 }}>{r.label}</div>
              <div className="num">{format(r.value)}</div>
              {r.hint && <div className="muted">{r.hint}</div>}
            </>,
          )}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
          <div className="track">
            <div className="fill" style={{ width: `${(r.value / max) * 100}%`, opacity: r.value ? 1 : 0.3 }} />
          </div>
          <span className="val">{format(r.value)}</span>
        </div>
      ))}
      {tip.node}
    </div>
  );
}

/** Part-to-whole stacked bar with a legend that doubles as the table view. */
export function StackBar({
  parts,
  format = (v) => `${v.toFixed(1)}%`,
  colorOf,
  showLegend = true,
}: {
  parts: { label: string; value: number; sub?: string }[];
  format?: (v: number) => string;
  colorOf?: (label: string, i: number) => string;
  showLegend?: boolean;
}) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const tip = useTooltip();
  const color = (l: string, i: number) => (colorOf ? colorOf(l, i) : catColor(i));
  return (
    <div>
      <div className="stack" role="img" aria-label={parts.map((p) => `${p.label} ${format(p.value)}`).join(", ")}>
        {parts.map((p, i) => (
          <div
            key={p.label + i}
            style={{ width: `${(p.value / total) * 100}%`, background: color(p.label, i) }}
            {...tip.bind(
              <>
                <div style={{ fontWeight: 600 }}>{p.label}</div>
                <div className="num">{format(p.value)}</div>
                {p.sub && <div className="muted">{p.sub}</div>}
              </>,
            )}
          />
        ))}
      </div>
      {showLegend && (
        <div className="legend">
          {parts.map((p, i) => (
            <div key={p.label + i} className="legend-row">
              <span className="sw" style={{ background: color(p.label, i) }} />
              <span>
                {p.label}
                {p.sub && <span className="muted"> · {p.sub}</span>}
              </span>
              <span className="num">{format(p.value)}</span>
            </div>
          ))}
        </div>
      )}
      {tip.node}
    </div>
  );
}

/** Single-series line/area with crosshair tooltip. */
export function LineChart({
  points,
  format,
  height = 180,
}: {
  points: { x: string; y: number }[];
  format: (v: number) => string;
  height?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  // Draw in real pixels so axis text keeps its size at any width.
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { l: 44, r: 12, t: 12, b: 22 };
  const max = useMemo(() => niceMax(Math.max(1, ...points.map((p) => p.y))), [points]);
  if (points.length < 2) return <div ref={wrap} className="muted">Not enough data points yet.</div>;
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.y)}`).join("");
  const area = `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const step = Math.ceil(points.length / Math.max(2, Math.floor(W / 110)));

  function move(e: React.MouseEvent) {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <svg ref={ref} className="chart-svg" viewBox={`0 0 ${W} ${H}`} onMouseMove={move} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="lc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--signal)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--signal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={pad.l - 6} y={y(t) + 3} textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          (i % step === 0 && points.length - 1 - i > step / 2) || i === points.length - 1 ? (
            <text key={p.x} className="axis" x={x(i)} y={H - 4} textAnchor="middle">
              {p.x}
            </text>
          ) : null,
        )}
        <path d={area} fill="url(#lc-fill)" />
        <path d={line} fill="none" stroke="var(--signal)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].y)} r="4" fill="var(--signal)" stroke="var(--panel-solid)" strokeWidth="2" />
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--line-strong)" />
            <circle cx={x(hover)} cy={y(points[hover].y)} r="4" fill="var(--signal)" stroke="var(--panel-solid)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover != null && (
        <div
          className="tooltip"
          style={{
            position: "absolute",
            left: `${(x(hover) / W) * 100}%`,
            top: 0,
            transform: `translateX(${hover > points.length / 2 ? "calc(-100% - 10px)" : "10px"})`,
          }}
        >
          <div className="muted">{points[hover].x}</div>
          <div className="num" style={{ fontWeight: 600 }}>
            {format(points[hover].y)}
          </div>
        </div>
      )}
    </div>
  );
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/** TAM / SAM / SOM as nested, area-proportional circles. */
export function MarketCircles({
  rows,
  format,
}: {
  rows: { label: string; value: number | null; caption: string }[];
  format: (v: number) => string;
}) {
  const valid = rows.filter((r) => r.value != null && r.value > 0) as { label: string; value: number; caption: string }[];
  const tip = useTooltip();
  if (!valid.length) return <div className="muted">Add TAM / SAM / SOM to see the market funnel.</div>;
  const R = 90;
  const max = valid[0].value;
  const fills = ["var(--signal)", "var(--signal)", "var(--signal)"];
  const opac = [0.1, 0.22, 0.6];
  return (
    <div className="row" style={{ gap: 24, flexWrap: "wrap", alignItems: "center" }}>
      <svg width={2 * R + 4} height={2 * R + 4} viewBox={`0 0 ${2 * R + 4} ${2 * R + 4}`} style={{ flex: "none" }}>
        {valid.map((r, i) => {
          const rad = Math.max(3, R * Math.sqrt(r.value / max));
          return (
            <circle
              key={r.label}
              cx={R + 2}
              cy={2 * R + 2 - rad}
              r={rad}
              fill={fills[i]}
              fillOpacity={opac[i]}
              stroke="var(--signal)"
              strokeOpacity={0.7}
              {...tip.bind(
                <>
                  <div style={{ fontWeight: 600 }}>{r.label}</div>
                  <div className="num">{format(r.value)}</div>
                </>,
              )}
            />
          );
        })}
      </svg>
      <div className="stack-v" style={{ flex: 1, minWidth: 200 }}>
        {rows.map((r) => (
          <div key={r.label}>
            <div className="eyebrow">{r.label}</div>
            <div className="display" style={{ fontSize: 26 }}>
              {r.value != null ? format(r.value) : "—"}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {r.caption}
            </div>
          </div>
        ))}
      </div>
      {tip.node}
    </div>
  );
}

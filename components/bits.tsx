"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { DealStatus, Provenance } from "@/lib/types";
import { date } from "@/lib/format";

export const STATUS_COLOR: Record<DealStatus, string> = {
  "To be reviewed": "var(--faint)",
  "First Meeting": "var(--mute)",
  "Second Meeting": "var(--c-reported)",
  DD: "var(--signal)",
  "IC Review": "var(--warn)",
  Invested: "var(--ok)",
  Passed: "var(--crit)",
};

export function StatusBadge({ status }: { status: DealStatus }) {
  return (
    <span className="status" style={{ color: STATUS_COLOR[status] }}>
      <span className="dot" />
      <span style={{ color: "var(--ink)" }}>{status}</span>
    </span>
  );
}

const SOURCE_LABEL: Record<Provenance["source"], string> = {
  notion: "Notion",
  call: "Founder call",
  deck: "Deck",
  research: "Research",
  manual: "Manual",
};

export function ProvTag({ p }: { p?: Provenance }) {
  if (!p) return null;
  return (
    <span className={`prov ${p.confidence}`} title={`${SOURCE_LABEL[p.source]} · ${p.confidence} · ${date(p.at)}`}>
      <span className="dot" style={{ width: 5, height: 5 }} />
      {SOURCE_LABEL[p.source]}
    </span>
  );
}

export function Monogram({ name }: { name: string }) {
  return <span className="co-mono">{name.trim().charAt(0).toUpperCase() || "?"}</span>;
}

export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div className="meter">
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="num" style={{ fontSize: 11.5, minWidth: 34, textAlign: "right" }}>
        {label ?? `${Math.round(value)}%`}
      </span>
    </div>
  );
}

/** Small hover tooltip that follows the pointer. */
export function useTooltip() {
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);
  const bind = (content: ReactNode) => ({
    onMouseMove: (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, content }),
    onMouseLeave: () => setTip(null),
  });
  const node = tip ? (
    <div className="tooltip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
      {tip.content}
    </div>
  ) : null;
  return { bind, node, setTip };
}

export function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function Toast({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [children]); // onClose is an inline callback; restart only when the message changes
  return (
    <div className="toast" role="status">
      <div className="row between" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <div>{children}</div>
        <button className="btn ghost small" onClick={onClose} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { CHANNELS, companyPath, PROCESS, type StepState } from "@/lib/process";
import { date } from "@/lib/format";
import type { Startup } from "@/lib/types";

const STEP_ICON: Record<StepState, string> = { done: "✓", current: "●", declined: "✕", todo: "" };

export const OUTCOME_LABEL = {
  active: "In progress",
  "on-hold": "On hold — not a priority",
  declined: "Declined",
  invested: "Invested",
} as const;

export const OUTCOME_COLOR = {
  active: "var(--signal)",
  "on-hold": "var(--warn)",
  declined: "var(--crit)",
  invested: "var(--ok)",
} as const;

/** Compact six-step strip used in the company card. */
export function ProcessStrip({ s }: { s: Startup }) {
  const path = companyPath(s);
  return (
    <div className="pstrip" aria-label="Position in the Topline process">
      {path.steps.map((st, i) => {
        const def = PROCESS[i];
        return (
          <div key={st.id} className={`pstrip-step is-${st.state}${path.outcome === "on-hold" && st.state === "current" ? " is-hold" : ""}`}>
            <div className="pstrip-node">{STEP_ICON[st.state] || def.n}</div>
            <div className="pstrip-label">
              {def.title}
              {st.date && <span className="pstrip-date">{date(st.date)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Process fields of a company: channel, deep-dive priority, notification. */
export function ProcessControls({ s, set }: { s: Startup; set: (path: string, v: unknown) => void }) {
  const path = companyPath(s);
  const needsNotice = path.outcome === "declined" || path.outcome === "on-hold";
  return (
    <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
      <label className="row" style={{ gap: 6 }}>
        <span className="eyebrow">Channel</span>
        <select className="select" style={{ width: "auto" }} value={s.process.channel} onChange={(e) => set("process.channel", e.target.value)}>
          <option value="">—</option>
          {CHANNELS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {(path.current === "deepdive" || s.process.priority) && (
        <label className="row" style={{ gap: 6 }}>
          <span className="eyebrow">Deep-dive priority</span>
          <select className="select" style={{ width: "auto" }} value={s.process.priority} onChange={(e) => set("process.priority", e.target.value)}>
            <option value="">—</option>
            <option>Priority</option>
            <option value="On hold">On hold (not a priority)</option>
          </select>
        </label>
      )}
      {needsNotice &&
        (s.process.notifiedAt ? (
          <span className="status" style={{ color: "var(--ok)", fontSize: 12.5 }}>
            <span className="dot" />
            <span>Company notified {date(s.process.notifiedAt)}</span>
            <button className="btn ghost small" onClick={() => set("process.notifiedAt", "")}>Undo</button>
          </span>
        ) : (
          <button className="btn small" onClick={() => set("process.notifiedAt", new Date().toISOString().slice(0, 10))}>
            ✉ Mark {path.outcome === "declined" ? "decline" : "status"} message as sent
          </button>
        ))}
      <Link className="btn ghost small" href={`/process?c=${encodeURIComponent(s.id)}`}>View in process →</Link>
    </div>
  );
}

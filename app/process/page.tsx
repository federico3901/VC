"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Monogram } from "@/components/bits";
import { OUTCOME_COLOR, OUTCOME_LABEL } from "@/components/process";
import { weightedScore } from "@/lib/model";
import { date } from "@/lib/format";
import { CHANNELS, companyPath, GP_NAME, NOTION_DATABASE_URL, PROCESS, type StageId } from "@/lib/process";
import { useStore } from "@/lib/store";
import type { Startup } from "@/lib/types";

const OUTCOME_ICON = { advance: "→", reject: "✕", hold: "⏸" } as const;

function ProcessView() {
  const { startups, ready } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("c") ?? "";
  const selected = startups.find((s) => s.id === selectedId);
  const path = selected ? companyPath(selected) : null;
  const scroller = useRef<HTMLDivElement>(null);

  // Where every company is right now.
  const byStage = useMemo(() => {
    const m = new Map<StageId, { s: Startup; outcome: ReturnType<typeof companyPath>["outcome"] }[]>();
    PROCESS.forEach((st) => m.set(st.id, []));
    for (const s of startups) {
      const p = companyPath(s);
      m.get(p.current)!.push({ s, outcome: p.outcome });
    }
    return m;
  }, [startups]);

  const channelCount = (c: string) => startups.filter((s) => s.process.channel === c).length;

  // Bring the selected company's current stage into view.
  useEffect(() => {
    if (!path) return;
    const el = scroller.current?.querySelector<HTMLElement>(`[data-stage="${path.current}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedId, ready]); // re-run only when the followed company changes

  const select = (id: string) => router.replace(id ? `/process?c=${encodeURIComponent(id)}` : "/process", { scroll: false });
  const scrollBy = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: "smooth" });

  if (!ready) return <main className="page" />;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Topline Ventures · how a company moves through Topline</div>
          <h1 className="display">Investment process</h1>
        </div>
        <div className="row">
          <label className="row" style={{ gap: 8 }}>
            <span className="eyebrow">Follow a company</span>
            <select className="select" style={{ width: "auto", minWidth: 220 }} value={selectedId} onChange={(e) => select(e.target.value)}>
              <option value="">All companies</option>
              {[...startups].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {selected && path && (
        <section className="panel proc-summary" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 12, flexWrap: "nowrap", minWidth: 0 }}>
            <Monogram name={selected.name} />
            <div style={{ minWidth: 0 }}>
              <Link href={`/companies/${selected.id}`} className="co-name">{selected.name} ↗</Link>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {selected.process.channel ? `Came in via ${selected.process.channel}` : "Channel not set"} · {selected.status}
              </div>
            </div>
          </div>
          <div className="proc-path">
            {path.steps
              .filter((st) => st.state !== "todo")
              .map((st, i) => (
                <span key={st.id} className={`proc-path-step is-${st.state}`}>
                  {i > 0 && <span className="proc-path-sep">→</span>}
                  {PROCESS.find((p) => p.id === st.id)!.title}
                  {st.date && <span className="muted"> {date(st.date)}</span>}
                </span>
              ))}
          </div>
          <span className="status" style={{ color: OUTCOME_COLOR[path.outcome] }}>
            <span className="dot" />
            <span>{OUTCOME_LABEL[path.outcome]}</span>
          </span>
        </section>
      )}

      <div className="proc-nav">
        <button className="icon-btn" aria-label="Scroll left" onClick={() => scrollBy(-340)}>‹</button>
        <span className="eyebrow">Scroll sideways to follow the process</span>
        <button className="icon-btn" aria-label="Scroll right" onClick={() => scrollBy(340)}>›</button>
      </div>

      <div className="proc-scroll" ref={scroller}>
        <div className="proc-track">
          {PROCESS.map((st, i) => {
            const state = path?.steps[i].state;
            const here = byStage.get(st.id)!;
            const active = here.filter((x) => x.outcome !== "declined");
            const declined = here.filter((x) => x.outcome === "declined");
            const linkDone = path ? path.steps[i].state === "done" && i < PROCESS.length - 1 && path.steps[i + 1].state !== "todo" : false;
            return (
              <div key={st.id} className="proc-cell">
                <section
                  data-stage={st.id}
                  className={`panel proc-stage ${state ? `is-${state}` : ""} ${state === "current" && path?.outcome === "on-hold" ? "is-hold" : ""}`}
                >
                  <div className="proc-head">
                    <span className="proc-num">{state === "done" ? "✓" : state === "declined" ? "✕" : st.n}</span>
                    <div>
                      <h2 className="panel-title">{st.title}</h2>
                      {state === "current" && <span className="tag" style={{ color: OUTCOME_COLOR[path!.outcome] }}>{path!.outcome === "on-hold" ? "On hold here" : "Now here"}</span>}
                      {state === "declined" && <span className="tag" style={{ color: "var(--crit)" }}>Declined here</span>}
                      {st.id === "final" && path?.outcome === "invested" && <span className="tag" style={{ color: "var(--ok)" }}>Invested</span>}
                      {st.provisional && <span className="tag" style={{ color: "var(--warn)", marginLeft: 4 }}>Provisional</span>}
                    </div>
                  </div>
                  <p className="proc-summary-text">{st.summary}</p>

                  {st.id === "intake" && (
                    <>
                      <div className="eyebrow" style={{ margin: "4px 0 6px" }}>Channels</div>
                      <div className="proc-channels">
                        {CHANNELS.map((c) => (
                          <div key={c} className={`proc-channel ${selected?.process.channel === c ? "is-on" : ""}`}>
                            <span>{c}</span>
                            <span className="muted num">{channelCount(c)}</span>
                          </div>
                        ))}
                      </div>
                      <a className="callout proc-notion" href={NOTION_DATABASE_URL} target="_blank" rel="noreferrer">
                        From here on, everything we know about the company lives in our <strong>Notion database ↗</strong>
                      </a>
                    </>
                  )}

                  {st.points.length > 0 && st.id !== "intake" && (
                    <ul className="list-plain" style={{ fontSize: 12.5, margin: "4px 0 10px" }}>
                      {st.points.map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                  )}

                  {st.id === "final" && (
                    <div className="card proc-gp">
                      <div className="eyebrow">Decision by</div>
                      <div style={{ fontWeight: 600 }}>{GP_NAME}</div>
                      <div className="muted" style={{ fontSize: 12 }}>General Partner</div>
                    </div>
                  )}

                  <div className="proc-outcomes">
                    {st.outcomes.map((o) => (
                      <div key={o.text} className={`proc-outcome is-${o.kind}`}>
                        <span className="proc-outcome-icon">{OUTCOME_ICON[o.kind]}</span>
                        <span>{o.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="proc-companies">
                    <div className="eyebrow" style={{ marginBottom: 6 }}>
                      {st.id === "final" ? "Decided" : "Here now"} · {active.length}
                    </div>
                    <div className="proc-chips">
                      {active.map(({ s, outcome }) => (
                        <button
                          key={s.id}
                          className={`proc-chip ${s.id === selectedId ? "is-sel" : ""}`}
                          onClick={() => select(s.id === selectedId ? "" : s.id)}
                          title={`${s.status}${outcome === "on-hold" ? " · on hold" : ""}`}
                        >
                          <span className="dot" style={{ color: OUTCOME_COLOR[outcome] }} />
                          {s.name}
                          {st.id === "screening" && <span className="muted num"> {(weightedScore(s) ?? s.notionScore)?.toFixed(0) ?? ""}</span>}
                        </button>
                      ))}
                      {!active.length && <span className="faint" style={{ fontSize: 12 }}>None</span>}
                    </div>
                    {declined.length > 0 && (
                      <details className="proc-declined">
                        <summary>Declined at this stage · {declined.length}</summary>
                        <div className="proc-chips" style={{ marginTop: 6 }}>
                          {declined.map(({ s }) => (
                            <button key={s.id} className={`proc-chip is-out ${s.id === selectedId ? "is-sel" : ""}`} onClick={() => select(s.id)}>
                              {s.name}
                              {s.process.notifiedAt ? <span className="muted"> ✉</span> : <span style={{ color: "var(--serious)" }}> · not notified</span>}
                            </button>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </section>
                {i < PROCESS.length - 1 && (
                  <div className={`proc-arrow ${linkDone ? "is-done" : ""}`} aria-hidden>
                    <svg width="36" height="20" viewBox="0 0 36 20">
                      <path d="M2 10h28" stroke="currentColor" strokeWidth="2" />
                      <path d="M24 4l7 6-7 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="page" />}>
      <ProcessView />
    </Suspense>
  );
}

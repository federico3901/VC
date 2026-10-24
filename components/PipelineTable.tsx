"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { completeness, weightedScore } from "@/lib/model";
import { date, money } from "@/lib/format";
import { DEAL_STATUSES, STAGES, type Startup } from "@/lib/types";
import { Meter, Monogram, SearchIcon, StatusBadge } from "./bits";

type SortKey = "name" | "status" | "raising" | "score" | "complete" | "lastContact";

export function PipelineTable({ startups, initialStatus = "" }: { startups: Startup[]; initialStatus?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "lastContact", dir: -1 });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = startups
      .filter((s) => !status || s.status === status)
      .filter((s) => !stage || s.stage === stage)
      .filter(
        (s) =>
          !term ||
          [s.name, s.tagline, s.hq, ...s.sectors].some((v) => v.toLowerCase().includes(term)),
      )
      .map((s) => ({ s, score: weightedScore(s) ?? s.notionScore ?? null, complete: completeness(s).pct }));
    const val = (r: (typeof list)[number]): string | number => {
      switch (sort.key) {
        case "name": return r.s.name.toLowerCase();
        case "status": return DEAL_STATUSES.indexOf(r.s.status);
        case "raising": return r.s.round.raising ?? -1;
        case "score": return r.score ?? -1;
        case "complete": return r.complete;
        case "lastContact": return r.s.lastContact || "";
      }
    };
    return list.sort((a, b) => (val(a) > val(b) ? sort.dir : val(a) < val(b) ? -sort.dir : 0));
  }, [startups, q, status, stage, sort]);

  const th = (key: SortKey, label: string, right = false) => (
    <th className={right ? "r" : undefined}>
      <button
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === "name" ? 1 : -1 }))}
        style={{ letterSpacing: "inherit", textTransform: "inherit" }}
      >
        {label}
        {sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <>
      <div className="filters" style={{ marginBottom: 12 }}>
        <label className="search">
          <SearchIcon />
          <input placeholder="Search company, sector, city…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {DEAL_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="select" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="eyebrow" style={{ marginLeft: "auto" }}>
          {rows.length} of {startups.length}
        </span>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {th("name", "Company")}
              {th("status", "Status")}
              <th>Stage</th>
              <th>Sector</th>
              {th("raising", "Raising", true)}
              <th className="r">Pre-money</th>
              {th("score", "Score", true)}
              {th("complete", "Dossier")}
              {th("lastContact", "Last contact")}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, score, complete }) => (
              <tr key={s.id} className="click" onClick={() => router.push(`/companies/${s.id}`)}>
                <td>
                  <div className="co-cell">
                    <Monogram name={s.name} />
                    <div style={{ minWidth: 0 }}>
                      <div className="co-name">{s.name}</div>
                      <div className="co-sub">{s.tagline || s.description.oneLiner || "—"}</div>
                    </div>
                  </div>
                </td>
                <td><StatusBadge status={s.status} /></td>
                <td style={{ whiteSpace: "nowrap" }}>{s.stage || "—"}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>{s.sectors.join(", ") || "—"}</td>
                <td className="r num">{money(s.round.raising)}</td>
                <td className="r num">{money(s.round.preMoney)}</td>
                <td className="r num">{score != null ? score.toFixed(0) : "—"}</td>
                <td><Meter value={complete} /></td>
                <td className="num muted" style={{ fontSize: 12 }}>{date(s.lastContact)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="empty-state">No companies match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import type { SchemaIssue, SchemaReport } from "@/lib/notion-schema";
import { date } from "@/lib/format";

function describe(i: SchemaIssue) {
  switch (i.kind) {
    case "missing":
      return (
        <>
          Column <b>“{i.column}”</b> not found — <b>{i.feeds}</b> will no longer update.
          {i.renamedTo && <> Was it renamed to <b>“{i.renamedTo}”</b>?</>}
        </>
      );
    case "type":
      return (
        <>
          Column <b>“{i.column}”</b> changed type (now <span className="mono">{i.actual}</span>, expected{" "}
          <span className="mono">{i.expected.join(" / ")}</span>) — <b>{i.feeds}</b> is skipped until it is fixed.
        </>
      );
    case "options":
      return (
        <>
          <b>“{i.column}”</b> has options the app does not recognise: {i.unknown.map((o) => `“${o}”`).join(", ")}. Deals with these
          values keep their previous {i.feeds.toLowerCase()}.
        </>
      );
    case "new":
      return (
        <>
          New column <b>“{i.column}”</b> (<span className="mono">{i.type}</span>) is not used by the app yet.
        </>
      );
  }
}

/** Banner listing differences between the live Notion Deal Flow schema and the columns the app reads. */
export function SchemaAlert({ report }: { report: SchemaReport | null }) {
  const [open, setOpen] = useState(true);
  if (!report) return null;
  const problems = report.issues.filter((i) => i.kind !== "new");
  const infos = report.issues.filter((i) => i.kind === "new");

  if (!report.issues.length)
    return (
      <div className="row" style={{ marginBottom: 14, gap: 8 }}>
        <span className="status" style={{ color: "var(--ok)" }}>
          <span className="dot" />
          <span className="muted">Notion schema matches · checked {date(report.checkedAt)}</span>
        </span>
      </div>
    );

  return (
    <div className={problems.length ? "callout warn" : "callout"} style={{ marginBottom: 14 }}>
      <div className="row between" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
        <div>
          <strong>
            {problems.length
              ? `The Deal Flow database has changed — ${problems.length} field${problems.length > 1 ? "s" : ""} affected`
              : "The Deal Flow database has new columns"}
          </strong>
          {report.demo && <span className="tag" style={{ marginLeft: 8, color: "var(--brand-dot)" }}>Demo example</span>}
          <div className="muted" style={{ fontSize: 12 }}>
            Nothing is deleted from your dossiers; affected fields just stop updating until the column mapping in{" "}
            <span className="mono">lib/notion-schema.ts</span> is updated.
          </div>
        </div>
        <button className="btn ghost small" onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Details"}</button>
      </div>
      {open && (
        <ul className="list-plain" style={{ marginTop: 10, fontSize: 13 }}>
          {[...problems, ...infos].map((i, k) => (
            <li key={k} style={i.kind === "new" ? { color: "var(--mute)" } : undefined}>
              <span>{describe(i)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

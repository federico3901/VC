// The Deal Flow columns the app reads, and a check that compares them with the live Notion schema.
// Pure functions only: shared by the server (live check) and the demo data.
import { DEAL_STATUSES, STAGES } from "./types";

export interface ExpectedColumn {
  name: string;
  types: string[]; // accepted Notion property types; empty = any type
  feeds: string; // the dossier field it fills, for messages
  options?: readonly string[]; // select/status values the app understands
}

export const EXPECTED_COLUMNS: ExpectedColumn[] = [
  { name: "Firm", types: ["title"], feeds: "Company name" },
  { name: "Stage", types: ["select"], feeds: "Stage", options: STAGES },
  { name: "Industry", types: ["multi_select"], feeds: "Sectors" },
  { name: "Deal Status", types: ["status", "select"], feeds: "Status", options: [...DEAL_STATUSES, "To be reviwed"] },
  { name: "Raising", types: ["number"], feeds: "Round size" },
  { name: "Raised", types: ["number"], feeds: "Raised to date" },
  { name: "Valuation", types: ["number"], feeds: "Pre-money" },
  { name: "Round Info", types: ["rich_text"], feeds: "Instrument + round notes" },
  { name: "Score", types: ["number"], feeds: "Notion score" },
  { name: "Website", types: ["url", "rich_text"], feeds: "Website" },
  // "place" is a newer Notion type; how the API reports it can vary, so only its presence is checked.
  { name: "Headquarter", types: [], feeds: "HQ" },
  { name: "Drive", types: ["url", "rich_text"], feeds: "Documents" },
  { name: "Last Contact", types: ["date"], feeds: "Last contact" },
  { name: "Notes", types: ["rich_text"], feeds: "Timeline entry" },
];

/** Columns the app knows about but deliberately does not import. */
const KNOWN_UNUSED = ["Operators", "Source", "Meeting"];

export interface LiveColumn {
  name: string;
  type: string;
  options?: string[];
}

export type SchemaIssue =
  | { kind: "missing"; column: string; feeds: string; renamedTo?: string }
  | { kind: "type"; column: string; feeds: string; expected: string[]; actual: string }
  | { kind: "options"; column: string; feeds: string; unknown: string[] }
  | { kind: "new"; column: string; type: string };

export interface SchemaReport {
  ok: boolean; // false when any column the app needs is missing or has the wrong type
  issues: SchemaIssue[];
  checkedAt: string;
  demo?: boolean;
}

export const norm = (s: string) => s.trim().toLowerCase();

function similarity(a: string, b: string) {
  const wa = new Set(norm(a).split(/[\s_\-/]+/));
  const wb = norm(b).split(/[\s_\-/]+/);
  const shared = wb.filter((w) => wa.has(w)).length;
  const prefix = norm(a).slice(0, 4) === norm(b).slice(0, 4) ? 1 : 0;
  return shared + prefix;
}

export function analyzeSchema(live: LiveColumn[]): SchemaReport {
  const byName = new Map(live.map((c) => [norm(c.name), c]));
  const issues: SchemaIssue[] = [];
  const expectedNames = new Set(EXPECTED_COLUMNS.map((c) => norm(c.name)));
  // The title column is always read, whatever it is called, so a rename of "Firm" is harmless.
  const unmatched = live.filter(
    (c) => c.type !== "title" && !expectedNames.has(norm(c.name)) && !KNOWN_UNUSED.some((k) => norm(k) === norm(c.name)),
  );

  for (const exp of EXPECTED_COLUMNS) {
    const col = byName.get(norm(exp.name));
    if (!col && exp.types.includes("title") && live.some((c) => c.type === "title")) continue;
    if (!col) {
      // Guess a rename: an unknown column of a compatible type, preferring similar names.
      const candidates = unmatched
        .filter((c) => !exp.types.length || exp.types.includes(c.type))
        .sort((a, b) => similarity(exp.name, b.name) - similarity(exp.name, a.name));
      const best = candidates[0];
      const renamedTo = best && (candidates.length === 1 || similarity(exp.name, best.name) > 0) ? best.name : undefined;
      issues.push({ kind: "missing", column: exp.name, feeds: exp.feeds, renamedTo });
      continue;
    }
    if (exp.types.length && !exp.types.includes(col.type)) {
      issues.push({ kind: "type", column: col.name, feeds: exp.feeds, expected: exp.types, actual: col.type });
      continue;
    }
    if (exp.options && col.options) {
      const known = new Set(exp.options.map(norm));
      const unknown = col.options.filter((o) => !known.has(norm(o)));
      if (unknown.length) issues.push({ kind: "options", column: col.name, feeds: exp.feeds, unknown });
    }
  }

  const suggested = new Set(issues.flatMap((i) => (i.kind === "missing" && i.renamedTo ? [i.renamedTo] : [])));
  for (const c of unmatched) if (!suggested.has(c.name)) issues.push({ kind: "new", column: c.name, type: c.type });

  return {
    ok: !issues.some((i) => i.kind === "missing" || i.kind === "type"),
    issues,
    checkedAt: new Date().toISOString(),
  };
}

// Maps a Notion "Deal Flow" row onto a Startup dossier.
// Shared by the server (API routes) and the client (merge on import).
import { emptyStartup, getPath, isFilled, setPath, slugify } from "./model";
import { DEAL_STATUSES, STAGES, type DealStatus, type Stage, type Startup } from "./types";

/** A Deal Flow row, normalised from the Notion API. */
export interface NotionDeal {
  pageId: string;
  url: string;
  firm: string;
  stage: string | null;
  industries: string[];
  status: string | null;
  raising: number | null;
  raised: number | null;
  valuation: number | null;
  roundInfo: string;
  score: number | null;
  website: string;
  hq: string;
  drive: string;
  lastContact: string | null;
  notes: string;
  lastEdited: string;
  /** Plain-text page content (call notes etc.); only present on single-page fetches. */
  body?: string;
}

function normStatus(s: string | null): DealStatus | null {
  if (!s) return null;
  if (s.trim().toLowerCase() === "to be reviwed") return "To be reviewed"; // typo in the Notion option
  return (DEAL_STATUSES as readonly string[]).includes(s) ? (s as DealStatus) : null;
}

function normStage(s: string | null): Stage | null {
  return s && (STAGES as readonly string[]).includes(s) ? (s as Stage) : null;
}

/** Field path → value taken from Notion. Empty values are skipped so Notion never blanks a field. */
export function notionFieldValues(d: NotionDeal): Record<string, unknown> {
  const v: Record<string, unknown> = {
    name: d.firm || null,
    stage: normStage(d.stage),
    status: normStatus(d.status),
    sectors: d.industries.length ? d.industries : null,
    website: d.website || null,
    hq: d.hq || null,
    lastContact: d.lastContact,
    "round.raising": d.raising,
    "round.totalRaised": d.raised,
    "round.preMoney": d.valuation,
    "round.instrument": d.roundInfo ? d.roundInfo.split(/[—\-–(]/)[0].trim().slice(0, 80) : null,
    "round.notes": d.roundInfo || null,
    "description.oneLiner": d.notes ? d.notes.split(/(?<=\.)\s/)[0].slice(0, 240) : null,
  };
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x != null && x !== ""));
}

export const NOTION_FIELD_LABELS: Record<string, string> = {
  name: "Firm",
  stage: "Stage",
  status: "Deal Status",
  sectors: "Industry",
  website: "Website",
  hq: "Headquarter",
  lastContact: "Last Contact",
  "round.raising": "Raising",
  "round.totalRaised": "Raised",
  "round.preMoney": "Valuation",
  "round.instrument": "Round Info",
  "round.notes": "Round Info",
  "description.oneLiner": "Notes",
};

export interface MergeResult {
  startup: Startup;
  updated: string[];
  kept: string[]; // fields where a value from a founder call / manual edit was kept
}

/**
 * Merge a Notion row into a dossier.
 * Rule: Notion fills empty fields and refreshes fields that came from Notion,
 * but never overwrites what was learned on a call, from the deck, or edited by hand.
 */
export function mergeNotionDeal(existing: Startup | null, d: NotionDeal, taken: Set<string>): MergeResult {
  let s: Startup;
  if (existing) s = structuredClone(existing);
  else {
    let id = slugify(d.firm);
    while (taken.has(id)) id += "-1";
    s = emptyStartup(id, d.firm);
  }
  const now = new Date().toISOString();
  const updated: string[] = [];
  const kept: string[] = [];

  for (const [path, value] of Object.entries(notionFieldValues(d))) {
    const prov = s.provenance[path];
    const current = getPath(s, path);
    const same = JSON.stringify(current) === JSON.stringify(value);
    // A filled field with no recorded source counts as hand-entered.
    // Last contact is the exception: the most recent date wins, wherever it was logged.
    const ownedElsewhere =
      path === "lastContact"
        ? typeof current === "string" && current >= (value as string)
        : isFilled(current) && (!prov || prov.source !== "notion");
    if (ownedElsewhere) {
      if (!same) kept.push(path);
      continue;
    }
    if (!same) {
      s = setPath(s, path, value);
      updated.push(path);
    }
    s.provenance[path] = {
      source: "notion",
      confidence: path === "round.preMoney" ? "reported" : "confirmed",
      at: now,
    };
  }

  s.notionPageId = d.pageId;
  s.notionUrl = d.url;
  s.notionScore = d.score;
  s.lastSyncedAt = now;
  if (d.drive && !s.documents.some((x) => x.url === d.drive)) {
    s.documents = [...s.documents, { name: "Drive folder", kind: "Drive", url: d.drive, addedAt: now.slice(0, 10) }];
    updated.push("documents");
  }

  // Page content (call notes written in Notion) lives in one timeline entry that is refreshed on every sync.
  const notesText = [d.notes, d.body].filter(Boolean).join("\n\n").trim();
  if (notesText) {
    const entry = {
      id: "notion-body",
      date: (d.lastEdited || now).slice(0, 10),
      kind: "Import" as const,
      author: "Notion sync",
      title: "Notion page — Notes & content",
      body: notesText,
    };
    const i = s.notes.findIndex((n) => n.id === "notion-body");
    if (i === -1) s.notes = [entry, ...s.notes];
    else if (s.notes[i].body !== notesText) s.notes = s.notes.map((n, j) => (j === i ? entry : n));
  }
  return { startup: s, updated, kept };
}

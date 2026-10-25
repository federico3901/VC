// Core data model for a startup dossier.
// Every field is plain data; where a value came from lives in `provenance`,
// keyed by the field path (e.g. "round.raising"), so editors stay simple.

// Same order as the Notion Deal Status groups (to do → in progress → complete).
export const DEAL_STATUSES = [
  "New / Captured",
  "To be reviewed",
  "First Meeting",
  "Second Meeting",
  "Deep Dive",
  "Triage",
  "DD",
  "IC Review",
  "Invested",
  "Passed",
] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const STAGES = ["Pre-Seed", "Seed", "Seed+", "Series A", "Series A2", "Series B", "Series C"] as const;
export type Stage = (typeof STAGES)[number];

export type Source = "notion" | "call" | "deck" | "research" | "manual";
export type Confidence = "confirmed" | "reported" | "estimated";

export interface Provenance {
  source: Source;
  confidence: Confidence;
  at: string; // ISO date
}

export interface Person {
  name: string;
  role: string;
  background: string;
  linkedin: string;
  fullTime: boolean;
  email?: string;
  phone?: string;
  notionId?: string; // set when the person came from the Notion Contacts database
}

export interface CapRow {
  holder: string;
  kind: "Founders" | "Investors" | "ESOP" | "Other";
  pct: number; // fully diluted %, pre-round
}

export interface UseOfFunds {
  label: string;
  pct: number;
}

export interface Product {
  name: string;
  summary: string;
  maturity: string;
  pricing: string;
  technology: string;
  moat: string;
  roadmap: string;
}

export interface Competitor {
  name: string;
  description: string;
  funding: string;
  differentiation: string;
  metrics?: Record<string, number | null>; // KPI id → value, for the comparison charts
}

/** A KPI used to compare the company with its competitors. */
export interface CompetitorKpi {
  id: string;
  label: string;
  unit: "$" | "%" | "#";
  /** Dossier field that provides the company's own value when none is typed in, e.g. "traction.arr". */
  from?: string;
}

export interface KpiPoint {
  month: string; // YYYY-MM
  mrr: number;
}

export interface ScoreCriterion {
  criterion: string;
  weight: number; // percentage weight, criteria sum to 100
  score: number | null; // 1–5
  note: string;
}

export type DDStatus = "To do" | "In progress" | "Done" | "Red flag";
export const DD_STATUSES: DDStatus[] = ["To do", "In progress", "Done", "Red flag"];

export interface DDItem {
  area: string;
  item: string;
  status: DDStatus;
  note: string;
}

export interface DocumentLink {
  name: string;
  kind: "Deck" | "Data room" | "Financials" | "Drive" | "Memo" | "Other";
  url: string;
  addedAt: string;
}

export type NoteKind = "Call" | "Meeting" | "Email" | "Note" | "Import";

export interface NoteEntry {
  id: string;
  date: string;
  kind: NoteKind;
  author: string;
  title: string;
  body: string;
}

export interface Startup {
  id: string;
  name: string;
  tagline: string;
  website: string;
  hq: string;
  founded: string;
  employees: number | null;
  sectors: string[];
  businessModel: string;
  stage: Stage | "";
  status: DealStatus;
  owner: string;
  referral: string;
  lastContact: string;
  notionPageId?: string;
  notionScore?: number | null;
  notionUrl?: string;
  lastSyncedAt?: string;
  sample?: boolean;

  description: {
    oneLiner: string;
    problem: string;
    solution: string;
    whyNow: string;
    customer: string;
  };
  products: Product[];
  market: {
    tam: number | null;
    sam: number | null;
    som: number | null;
    methodology: string;
    geography: string;
    trends: string;
  };
  team: Person[];
  traction: {
    arr: number | null;
    growthMoM: number | null;
    customers: number | null;
    nrr: number | null;
    grossMargin: number | null;
    burn: number | null;
    runwayMonths: number | null;
    pipeline: string;
    notes: string;
  };
  kpiHistory: KpiPoint[];
  round: {
    instrument: string;
    raising: number | null;
    preMoney: number | null;
    committed: number | null;
    lead: string;
    targetClose: string;
    totalRaised: number | null;
    ourTicket: number | null;
    notes: string;
  };
  useOfFunds: UseOfFunds[];
  capTable: CapRow[];
  competitors: Competitor[];
  competitorKpis: CompetitorKpi[];
  selfMetrics: Record<string, number | null>; // the company's own KPI values (override `from`)
  thesis: {
    strengths: string[];
    risks: string[];
    openQuestions: string[];
    recommendation: string;
  };
  scoring: ScoreCriterion[];
  dd: DDItem[];
  documents: DocumentLink[];
  notes: NoteEntry[];
  provenance: Record<string, Provenance>;
}

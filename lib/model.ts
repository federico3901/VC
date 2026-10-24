import type { DDItem, ScoreCriterion, Startup } from "./types";

export const DEFAULT_SCORING: ScoreCriterion[] = [
  { criterion: "Team", weight: 30, score: null, note: "" },
  { criterion: "Market", weight: 20, score: null, note: "" },
  { criterion: "Product & moat", weight: 20, score: null, note: "" },
  { criterion: "Traction", weight: 15, score: null, note: "" },
  { criterion: "Deal terms", weight: 10, score: null, note: "" },
  { criterion: "Thesis fit", weight: 5, score: null, note: "" },
];

export const DEFAULT_DD: DDItem[] = [
  { area: "Team", item: "Founder reference calls (2+ per founder)", status: "To do", note: "" },
  { area: "Team", item: "Background checks", status: "To do", note: "" },
  { area: "Market", item: "Bottom-up TAM validated", status: "To do", note: "" },
  { area: "Market", item: "Competitive landscape mapped", status: "To do", note: "" },
  { area: "Product", item: "Product demo", status: "To do", note: "" },
  { area: "Product", item: "Technical deep-dive", status: "To do", note: "" },
  { area: "Customers", item: "Customer reference calls (3+)", status: "To do", note: "" },
  { area: "Financials", item: "Historical P&L and bank statements", status: "To do", note: "" },
  { area: "Financials", item: "Financial model reviewed", status: "To do", note: "" },
  { area: "Legal", item: "Cap table & SAFEs/notes reconciled", status: "To do", note: "" },
  { area: "Legal", item: "IP assignment agreements", status: "To do", note: "" },
  { area: "Legal", item: "Incorporation & good standing", status: "To do", note: "" },
];

export function emptyStartup(id: string, name: string): Startup {
  return {
    id,
    name,
    tagline: "",
    website: "",
    hq: "",
    founded: "",
    employees: null,
    sectors: [],
    businessModel: "",
    stage: "",
    status: "To be reviewed",
    owner: "",
    referral: "",
    lastContact: "",
    description: { oneLiner: "", problem: "", solution: "", whyNow: "", customer: "" },
    product: { summary: "", maturity: "", technology: "", moat: "", roadmap: "" },
    market: { tam: null, sam: null, som: null, methodology: "", geography: "", trends: "" },
    team: [],
    traction: {
      arr: null, growthMoM: null, customers: null, nrr: null, grossMargin: null,
      burn: null, runwayMonths: null, pipeline: "", notes: "",
    },
    kpiHistory: [],
    round: {
      instrument: "", raising: null, preMoney: null, committed: null, lead: "",
      targetClose: "", totalRaised: null, ourTicket: null, notes: "",
    },
    useOfFunds: [],
    capTable: [],
    competitors: [],
    thesis: { strengths: [], risks: [], openQuestions: [], recommendation: "" },
    scoring: DEFAULT_SCORING.map((c) => ({ ...c })),
    dd: DEFAULT_DD.map((d) => ({ ...d })),
    documents: [],
    notes: [],
    provenance: {},
  };
}

/** Weighted score on a 0–100 scale; null until at least one criterion is scored. */
export function weightedScore(s: Startup): number | null {
  const scored = s.scoring.filter((c) => c.score != null);
  if (!scored.length) return null;
  const w = scored.reduce((a, c) => a + c.weight, 0);
  if (!w) return null;
  const v = scored.reduce((a, c) => a + c.weight * ((c.score as number) - 1) / 4, 0);
  return Math.round((v / w) * 1000) / 10;
}

/** The fields the dossier tracks for completeness, with the question to ask when one is missing. */
export const TRACKED_FIELDS: { path: string; label: string; section: string; ask: string }[] = [
  { path: "description.oneLiner", label: "One-liner", section: "overview", ask: "How would you describe the company in one sentence?" },
  { path: "description.problem", label: "Problem", section: "overview", ask: "What problem are you solving, and for whom is it most painful?" },
  { path: "description.solution", label: "Solution", section: "overview", ask: "How does the product solve it today?" },
  { path: "description.whyNow", label: "Why now", section: "overview", ask: "Why is now the right moment for this company?" },
  { path: "description.customer", label: "Target customer", section: "overview", ask: "Who is the buyer and who is the user?" },
  { path: "hq", label: "HQ", section: "overview", ask: "Where is the company headquartered?" },
  { path: "founded", label: "Founded", section: "overview", ask: "When was the company incorporated?" },
  { path: "businessModel", label: "Business model", section: "overview", ask: "How do you charge, and what is the average contract value?" },
  { path: "team", label: "Founding team", section: "team", ask: "Walk us through the founding team and how you met." },
  { path: "product.summary", label: "Product summary", section: "product", ask: "Can you give us a product demo?" },
  { path: "product.moat", label: "Moat", section: "product", ask: "What gets harder to copy as you scale?" },
  { path: "market.tam", label: "TAM", section: "market", ask: "How do you size the market bottom-up?" },
  { path: "market.sam", label: "SAM", section: "market", ask: "Which segment of the market is reachable in the next 3 years?" },
  { path: "competitors", label: "Competitors", section: "competition", ask: "Who do you lose deals to, and why?" },
  { path: "traction.arr", label: "ARR", section: "traction", ask: "What is current ARR (contracted vs. live)?" },
  { path: "traction.growthMoM", label: "MoM growth", section: "traction", ask: "What has month-over-month growth been over the last 6 months?" },
  { path: "traction.customers", label: "Customers", section: "traction", ask: "How many paying customers, and who are the logos?" },
  { path: "traction.burn", label: "Monthly burn", section: "traction", ask: "What is net monthly burn today?" },
  { path: "traction.runwayMonths", label: "Runway", section: "traction", ask: "How many months of runway before this round?" },
  { path: "round.raising", label: "Round size", section: "round", ask: "How much are you raising?" },
  { path: "round.preMoney", label: "Pre-money", section: "round", ask: "What valuation / cap are you targeting?" },
  { path: "round.instrument", label: "Instrument", section: "round", ask: "Priced round or SAFE? What terms?" },
  { path: "round.lead", label: "Lead investor", section: "round", ask: "Is there a lead, and who else is committed?" },
  { path: "capTable", label: "Cap table", section: "round", ask: "Can you share the fully diluted cap table?" },
  { path: "useOfFunds", label: "Use of funds", section: "round", ask: "How will you deploy the round, and what milestones does it buy?" },
];

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), obj);
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] as Record<string, unknown>;
  cur[keys[keys.length - 1]] = value;
  return clone as T;
}

export function isFilled(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function completeness(s: Startup) {
  const missing = TRACKED_FIELDS.filter((f) => !isFilled(getPath(s, f.path)));
  const pct = Math.round(((TRACKED_FIELDS.length - missing.length) / TRACKED_FIELDS.length) * 100);
  return { pct, missing };
}

export function ddProgress(s: Startup) {
  const done = s.dd.filter((d) => d.status === "Done").length;
  const flags = s.dd.filter((d) => d.status === "Red flag").length;
  return { done, total: s.dd.length, flags };
}

export function postMoney(s: Startup): number | null {
  const { preMoney, raising } = s.round;
  return preMoney != null && raising != null ? preMoney + raising : null;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";
}

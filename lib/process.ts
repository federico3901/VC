// Topline's investment process: six stages, how each deal status maps onto them, and the path a
// company has followed (recorded automatically whenever its status changes).
import type { DealStatus, Startup } from "./types";

export const CHANNELS = ["Inbound form", "Warm Intros", "Accelerators", "Outbound", "Events"] as const;
export type Channel = (typeof CHANNELS)[number];

export const NOTION_DATABASE_URL = "https://app.notion.com/p/Database-c33b5f5928e083549e670114bd8d0d82";
export const GP_NAME = "Thomas Miranda";

export type StageId = "intake" | "screening" | "deepdive" | "dd" | "ic" | "final";

export interface StageDef {
  id: StageId;
  n: number;
  title: string;
  summary: string;
  points: string[];
  outcomes: { kind: "advance" | "reject" | "hold"; text: string }[];
  provisional?: boolean;
}

export const PROCESS: StageDef[] = [
  {
    id: "intake",
    n: 1,
    title: "Intake",
    summary: "Where the deals come from.",
    points: ["From here on, everything we know about the company lives in our Notion database."],
    outcomes: [{ kind: "advance", text: "Every deal captured moves to Screening" }],
  },
  {
    id: "screening",
    n: 2,
    title: "Screening",
    summary: "Standard criteria, reflected in the rank. The first gate: does the deal meet our criteria?",
    points: ["Criteria applied the same way to every deal", "Outcome reflected in the score / rank"],
    outcomes: [
      { kind: "advance", text: "Meets our criteria → Deep dive" },
      { kind: "reject", text: "Declined — the company receives a courteous message with our decision" },
    ],
  },
  {
    id: "deepdive",
    n: 3,
    title: "Deep dive",
    summary: "Further work on the deals that passed screening, to set their priority.",
    points: [
      "Internal research",
      "Email to the founder requesting information",
      "Calls with the founder and team",
    ],
    outcomes: [
      { kind: "advance", text: "Priority and a fit → Due diligence" },
      { kind: "hold", text: "Interesting but not a priority — the company is told its status" },
      { kind: "reject", text: "Declined — courteous message with our decision" },
    ],
  },
  {
    id: "dd",
    n: 4,
    title: "Due diligence",
    summary: "In-depth, detailed analysis of the selected companies.",
    points: [
      "Large information request and data-room access",
      "Topline's contact network activated: advisors and sector experts",
      "Everything a thorough DD requires is tracked in Topline Intake",
    ],
    outcomes: [{ kind: "advance", text: "Approved → IC revision" }, { kind: "reject", text: "Declined" }],
    provisional: true,
  },
  {
    id: "ic",
    n: 5,
    title: "IC revision",
    summary: "Documents supporting the thesis: why we should invest and the key risks.",
    points: ["Investment memo: the positives, clearly argued", "Key risks", "The committee gives its final opinion"],
    outcomes: [{ kind: "advance", text: "Opinion given → Final decision" }, { kind: "reject", text: "Declined" }],
  },
  {
    id: "final",
    n: 6,
    title: "Final decision",
    summary: `Final decision by the GP, ${GP_NAME}.`,
    points: [],
    outcomes: [{ kind: "advance", text: "Invest" }, { kind: "reject", text: "Pass" }],
  },
];

export const stageIndex = (id: StageId) => PROCESS.findIndex((s) => s.id === id);

const STATUS_STAGE: Record<DealStatus, StageId | null> = {
  "New / Captured": "intake",
  "To be reviewed": "screening",
  Triage: "screening",
  "First Meeting": "deepdive",
  "Second Meeting": "deepdive",
  "Deep Dive": "deepdive",
  DD: "dd",
  "IC Review": "ic",
  Invested: "final",
  Passed: null, // stays at the stage where it was declined
};

export const stageOfStatus = (s: DealStatus) => STATUS_STAGE[s];

export interface StageEvent {
  stage: StageId;
  date: string; // YYYY-MM-DD
  outcome?: "declined" | "invested";
}

export type StepState = "done" | "current" | "declined" | "todo";

export interface CompanyPath {
  current: StageId; // where the company is now (or where it was declined)
  outcome: "active" | "declined" | "invested" | "on-hold";
  steps: { id: StageId; state: StepState; date?: string }[];
}

/** The stage a declined company was declined at: the last stage it reached. */
function lastReached(s: Startup): StageId {
  const h = s.process.history.filter((e) => !e.outcome);
  return h.length ? h[h.length - 1].stage : "screening";
}

export function companyPath(s: Startup): CompanyPath {
  const declined = s.status === "Passed";
  const current = declined ? lastReached(s) : (stageOfStatus(s.status) ?? "intake");
  const ci = stageIndex(current);
  const firstDate = (id: StageId) => s.process.history.find((e) => e.stage === id && !e.outcome)?.date;
  const outcome: CompanyPath["outcome"] = declined
    ? "declined"
    : s.status === "Invested"
      ? "invested"
      : current === "deepdive" && s.process.priority === "On hold"
        ? "on-hold"
        : "active";
  return {
    current,
    outcome,
    steps: PROCESS.map((st, i) => ({
      id: st.id,
      date: firstDate(st.id),
      state:
        i < ci ? "done" : i > ci ? "todo" : declined ? "declined" : outcome === "invested" ? "done" : "current",
    })),
  };
}

/** Called on every save: appends to the path when the status moves the company to another stage. */
export function withStageHistory(prev: Startup | undefined, next: Startup): Startup {
  if (prev && prev.status === next.status) return next;
  const date = new Date().toISOString().slice(0, 10);
  const history = [...next.process.history];
  const last = history[history.length - 1];
  if (next.status === "Passed") {
    if (last?.outcome !== "declined") history.push({ stage: last?.stage ?? "screening", date, outcome: "declined" });
  } else {
    const stage = stageOfStatus(next.status)!;
    if (!last || last.stage !== stage || last.outcome) history.push({ stage, date });
    if (next.status === "Invested") history.push({ stage: "final", date, outcome: "invested" });
  }
  if (history.length === next.process.history.length) return next;
  return { ...next, process: { ...next.process, history } };
}

// Fictional sample data. None of these companies, people or numbers are real.
import { emptyStartup } from "./model";
import type { DealStatus, Provenance, Stage, Startup } from "./types";

const p = (source: Provenance["source"], confidence: Provenance["confidence"], at: string): Provenance => ({
  source,
  confidence,
  at,
});

function kestrel(): Startup {
  const s = emptyStartup("kestrel-labs", "Kestrel Labs");
  return {
    ...s,
    sample: true,
    tagline: "Runtime security and permissions for autonomous AI agents",
    website: "https://kestrel-labs.example",
    hq: "Austin, TX",
    founded: "2024-03",
    employees: 14,
    sectors: ["Cybersecurity", "AI Infrastructure"],
    businessModel: "B2B SaaS — annual platform fee + usage tier per protected agent. ACV ≈ $45k.",
    stage: "Seed",
    status: "Second Meeting",
    owner: "Federico M.",
    referral: "Intro from Dana Whitfield (angel, ex-CISO)",
    lastContact: "2026-10-16",
    notionPageId: "sample-kestrel",
    lastSyncedAt: "2026-10-16T09:12:00Z",
    description: {
      oneLiner:
        "Kestrel sits between AI agents and the systems they touch, enforcing least-privilege permissions and blocking unsafe actions in real time.",
      problem:
        "Enterprises are deploying agents that can call APIs, move money and edit records, but IAM was built for humans and service accounts. Security teams have no way to scope, audit or stop what an agent does once it is live, so most agent projects stall in security review.",
      solution:
        "An agent-aware policy engine deployed as a sidecar/proxy. It issues short-lived, task-scoped credentials, evaluates every tool call against policy, and keeps a replayable audit trail. Integrates with Okta, Entra ID, AWS IAM and the major agent frameworks.",
      whyNow:
        "Agent frameworks went to production in 2025–26; the first agent-caused incidents and new audit requirements in financial services have turned agent governance into a board-level item with budget.",
      customer:
        "Buyer: CISO / Head of Platform Security at mid-market and enterprise companies (1k+ employees). User: platform engineers shipping internal agents.",
    },
    products: [
      {
        name: "Kestrel Guard",
        summary: "Policy engine + credential broker + audit console. Live in production at 9 of 14 customers; median deployment 11 days.",
        maturity: "GA since Q2 2026",
        pricing: "Platform fee + usage tier per protected agent",
        technology:
          "Rust proxy (<4ms p99 overhead), OPA-compatible policy language extended with agent intent, graph of agent → tool → resource permissions.",
        moat: "Dataset of agent tool-call behaviour across customers powers anomaly detection; deep integrations with identity providers create switching costs.",
        roadmap: "Q1 2027: agent-to-agent trust (A2A).",
      },
      {
        name: "Kestrel Audit",
        summary: "Evidence automation for SOC 2 / ISO audits of agent workflows, built on Guard's replayable logs.",
        maturity: "Beta with 3 design partners",
        pricing: "Add-on, ~20% of Guard ACV",
        technology: "Maps logged agent actions to control frameworks; exports auditor-ready reports.",
        moat: "Only possible with Guard's action-level logs.",
        roadmap: "GA Q2 2027.",
      },
    ],
    market: {
      tam: 18_000_000_000,
      sam: 3_200_000_000,
      som: 160_000_000,
      methodology:
        "Bottom-up: ~38k companies with 1k+ employees in NA/EU × projected 25 production agents each × $19k blended price per 10 agents.",
      geography: "North America first; EU via partners in 2027",
      trends:
        "Identity security budgets shifting to non-human identities; regulators asking for AI action audit trails; consolidation of AI security start-ups by platform vendors.",
    },
    team: [
      {
        name: "Maya Okafor",
        role: "CEO & co-founder",
        background: "Ex-Group PM, identity platform at a large cloud provider; led workload identity launch. Stanford CS.",
        linkedin: "",
        fullTime: true,
      },
      {
        name: "Tomás Reyes",
        role: "CTO & co-founder",
        background: "Ex-staff engineer on a service-mesh project; author of a widely used Rust proxy library.",
        linkedin: "",
        fullTime: true,
      },
      {
        name: "Priya Natarajan",
        role: "Head of GTM",
        background: "Ex-Regional VP Sales at a mid-cap security company; built team from 0 to $12M ARR.",
        linkedin: "",
        fullTime: true,
      },
    ],
    traction: {
      arr: 640_000,
      growthMoM: 12,
      customers: 14,
      nrr: 135,
      grossMargin: 78,
      burn: 140_000,
      runwayMonths: 9,
      pipeline: "$2.3M qualified pipeline; 3 enterprise POCs (two banks, one insurer) closing Q1 2027.",
      notes: "6 of 14 customers expanded within 6 months. One churn (acquired company).",
    },
    kpiHistory: [
      ["2025-11", 14], ["2025-12", 17], ["2026-01", 20], ["2026-02", 22], ["2026-03", 26], ["2026-04", 29],
      ["2026-05", 33], ["2026-06", 37], ["2026-07", 40], ["2026-08", 44], ["2026-09", 49], ["2026-10", 53],
    ].map(([month, k]) => ({ month: month as string, mrr: (k as number) * 1000 })),
    round: {
      instrument: "Priced Seed (Series Seed Preferred)",
      raising: 4_500_000,
      preMoney: 18_000_000,
      committed: 2_100_000,
      lead: "Northgate Capital (term sheet expected)",
      targetClose: "2026-12-15",
      totalRaised: 1_250_000,
      ourTicket: 500_000,
      notes: "Pre-seed SAFEs ($1.25M, $10M post cap) convert in this round. Pro-rata rights requested for $500k+ tickets.",
    },
    useOfFunds: [
      { label: "Engineering", pct: 45 },
      { label: "Go-to-market", pct: 35 },
      { label: "Security & compliance", pct: 10 },
      { label: "G&A", pct: 10 },
    ],
    capTable: [
      { holder: "Maya Okafor", kind: "Founders", pct: 34 },
      { holder: "Tomás Reyes", kind: "Founders", pct: 34 },
      { holder: "Pre-seed SAFE holders", kind: "Investors", pct: 11.1 },
      { holder: "Angels (incl. D. Whitfield)", kind: "Investors", pct: 3.4 },
      { holder: "ESOP (allocated + pool)", kind: "ESOP", pct: 15 },
      { holder: "Advisors", kind: "Other", pct: 2.5 },
    ],
    competitors: [
      {
        name: "Gatekeep AI",
        description: "Prompt-injection firewall for LLM apps",
        funding: "$22M Series A",
        differentiation: "Input filtering only; no identity / permission layer for agent actions.",
        metrics: { funding: 22_000_000, arr: 2_100_000, customers: 40, employees: 45 },
      },
      {
        name: "Sentinel Mesh",
        description: "Non-human identity management",
        funding: "$60M Series B",
        differentiation: "Strong on service accounts; agents treated as static identities, no per-task scoping.",
        metrics: { funding: 60_000_000, arr: 9_000_000, customers: 120, employees: 140 },
      },
      {
        name: "Cloud security platforms",
        description: "Incumbent CNAPP / IAM vendors adding AI modules",
        funding: "Public companies",
        metrics: {},
        differentiation: "Bundled and broad; Kestrel wins on depth and framework integrations. Also likely acquirers.",
      },
    ],
    thesis: {
      strengths: [
        "Founder–market fit: CEO built workload identity at hyperscale",
        "Strong NRR (135%) with land-and-expand motion already visible",
        "Fits Topline thesis: AI × Cybersecurity, Austin-based",
      ],
      risks: [
        "Platform risk: identity providers may build native agent controls",
        "Enterprise sales cycles could stretch runway (9 months today)",
        "Category still forming — buyer and budget line not yet standard",
      ],
      openQuestions: [
        "Gross margin trajectory once the usage tier scales?",
        "Status of the two bank POCs — security review passed?",
      ],
      recommendation: "Proceed to DD. Target $500k with pro-rata; confirm lead before IC.",
    },
    scoring: [
      { criterion: "Team", weight: 30, score: 5, note: "Rare identity + infra combo" },
      { criterion: "Market", weight: 20, score: 4, note: "Large, still forming" },
      { criterion: "Product & moat", weight: 20, score: 4, note: "Live in prod, low latency" },
      { criterion: "Traction", weight: 15, score: 4, note: "$640k ARR, 135% NRR" },
      { criterion: "Deal terms", weight: 10, score: 3, note: "$18M pre is full for ARR" },
      { criterion: "Thesis fit", weight: 5, score: 5, note: "Core thesis" },
    ],
    dd: [
      { area: "Team", item: "Founder reference calls (2+ per founder)", status: "Done", note: "4 calls, all strong" },
      { area: "Team", item: "Background checks", status: "In progress", note: "" },
      { area: "Market", item: "Bottom-up TAM validated", status: "Done", note: "Model in data room" },
      { area: "Market", item: "Competitive landscape mapped", status: "Done", note: "" },
      { area: "Product", item: "Product demo", status: "Done", note: "2026-10-02" },
      { area: "Product", item: "Technical deep-dive", status: "In progress", note: "Scheduled with CTO" },
      { area: "Customers", item: "Customer reference calls (3+)", status: "In progress", note: "1 of 3 done" },
      { area: "Financials", item: "Historical P&L and bank statements", status: "To do", note: "" },
      { area: "Financials", item: "Financial model reviewed", status: "To do", note: "" },
      { area: "Legal", item: "Cap table & SAFEs/notes reconciled", status: "Red flag", note: "Advisor grants lack board approval" },
      { area: "Legal", item: "IP assignment agreements", status: "To do", note: "" },
      { area: "Legal", item: "Incorporation & good standing", status: "Done", note: "Delaware C-corp" },
    ],
    documents: [
      { name: "Kestrel — Seed deck (Oct 2026)", kind: "Deck", url: "https://example.com/deck", addedAt: "2026-09-18" },
      { name: "Data room", kind: "Data room", url: "https://example.com/dataroom", addedAt: "2026-10-03" },
      { name: "Financial model v3", kind: "Financials", url: "https://example.com/model", addedAt: "2026-10-03" },
      { name: "Drive folder", kind: "Drive", url: "https://drive.google.com", addedAt: "2026-09-18" },
    ],
    notes: [
      {
        id: "n4",
        date: "2026-10-16",
        kind: "Call",
        author: "Federico M.",
        title: "Customer reference — VP Security, regional bank",
        body:
          "Bank POC passed security review last week. Chose Kestrel over building in-house because of the audit trail and Entra integration. Expects to expand to 3 more business units in 2027.",
      },
      {
        id: "n3",
        date: "2026-10-02",
        kind: "Meeting",
        author: "Federico M.",
        title: "Second meeting + product demo",
        body:
          "Demo of policy editor and replay. p99 overhead 3.6ms in live dashboard. Discussed round: $4.5M at $18M pre, Northgate likely to lead, $2.1M soft-committed. Asked for cap table and financial model — received next day.",
      },
      {
        id: "n2",
        date: "2026-09-18",
        kind: "Call",
        author: "Federico M.",
        title: "First call with Maya (CEO)",
        body:
          "Background: built workload identity at a hyperscaler. 14 customers, $640k ARR, NRR 135%. Main competitor in deals: in-house builds. Raising Seed in Q4. Follow-ups: deck, customer references.",
      },
      {
        id: "n1",
        date: "2026-09-15",
        kind: "Import",
        author: "Notion sync",
        title: "Imported from Notion — Deal Flow",
        body: "Row created in Topline Ventures › Deal Flow. Fields mapped: Firm, Stage, Industry, Deal Status, Raising, Valuation, Website, Headquarter.",
      },
    ],
    provenance: {
      name: p("notion", "confirmed", "2026-09-15"),
      stage: p("notion", "confirmed", "2026-09-15"),
      sectors: p("notion", "confirmed", "2026-09-15"),
      status: p("notion", "confirmed", "2026-10-16"),
      website: p("notion", "confirmed", "2026-09-15"),
      hq: p("notion", "confirmed", "2026-09-15"),
      "round.raising": p("notion", "reported", "2026-09-15"),
      "round.preMoney": p("call", "reported", "2026-10-02"),
      "round.committed": p("call", "reported", "2026-10-02"),
      "round.lead": p("call", "estimated", "2026-10-02"),
      "traction.arr": p("call", "reported", "2026-09-18"),
      "traction.nrr": p("call", "reported", "2026-09-18"),
      "traction.customers": p("call", "confirmed", "2026-10-16"),
      "traction.growthMoM": p("deck", "reported", "2026-09-18"),
      "traction.burn": p("deck", "reported", "2026-10-03"),
      "traction.runwayMonths": p("deck", "estimated", "2026-10-03"),
      "traction.grossMargin": p("deck", "reported", "2026-10-03"),
      "market.tam": p("deck", "estimated", "2026-09-18"),
      "market.sam": p("deck", "estimated", "2026-09-18"),
      "market.som": p("research", "estimated", "2026-10-05"),
      capTable: p("deck", "reported", "2026-10-03"),
      "description.problem": p("call", "confirmed", "2026-09-18"),
    },
  };
}

function lite(
  id: string,
  name: string,
  o: {
    tagline: string;
    sectors: string[];
    stage: Stage;
    status: DealStatus;
    hq: string;
    raising?: number;
    preMoney?: number;
    arr?: number;
    score?: number[];
    lastContact: string;
    oneLiner?: string;
  },
): Startup {
  const s = emptyStartup(id, name);
  s.sample = true;
  s.tagline = o.tagline;
  s.sectors = o.sectors;
  s.stage = o.stage;
  s.status = o.status;
  s.hq = o.hq;
  s.lastContact = o.lastContact;
  s.owner = "Federico M.";
  s.round.raising = o.raising ?? null;
  s.round.preMoney = o.preMoney ?? null;
  s.traction.arr = o.arr ?? null;
  s.description.oneLiner = o.oneLiner ?? "";
  if (o.score) s.scoring = s.scoring.map((c, i) => ({ ...c, score: o.score![i] ?? null }));
  s.provenance = {
    name: p("notion", "confirmed", o.lastContact),
    stage: p("notion", "confirmed", o.lastContact),
    status: p("notion", "confirmed", o.lastContact),
  };
  s.notes = [
    {
      id: "n1",
      date: o.lastContact,
      kind: "Import",
      author: "Notion sync",
      title: "Imported from Notion — Deal Flow",
      body: "Row created in Deal Flow.",
    },
  ];
  return s;
}

export function sampleStartups(): Startup[] {
  return [
    kestrel(),
    lite("ampere-grid", "Ampere Grid", {
      tagline: "Software-defined battery dispatch for C&I sites",
      sectors: ["Climate Tech", "SaaS"],
      stage: "Seed+",
      status: "IC Review",
      hq: "Denver, CO",
      raising: 6_000_000,
      preMoney: 24_000_000,
      arr: 1_100_000,
      score: [4, 4, 3, 4, 3, 3],
      lastContact: "2026-10-20",
      oneLiner: "Optimises behind-the-meter batteries to cut demand charges.",
    }),
    lite("tessellate-robotics", "Tessellate Robotics", {
      tagline: "Autonomous palletising cells as a service",
      sectors: ["Robotics", "AI/ML"],
      stage: "Series A",
      status: "DD",
      hq: "Pittsburgh, PA",
      raising: 14_000_000,
      preMoney: 56_000_000,
      arr: 3_400_000,
      score: [4, 3, 4, 4, 2, 3],
      lastContact: "2026-10-11",
    }),
    lite("fieldnote", "Fieldnote", {
      tagline: "Voice-first CRM for field sales reps",
      sectors: ["SaaS", "AI/ML"],
      stage: "Pre-Seed",
      status: "First Meeting",
      hq: "Austin, TX",
      raising: 1_500_000,
      lastContact: "2026-10-21",
    }),
    lite("lumen-ledger", "Lumen Ledger", {
      tagline: "AI close-management for mid-market finance teams",
      sectors: ["FinTech AI"],
      stage: "Pre-Seed",
      status: "To be reviewed",
      hq: "New York, NY",
      lastContact: "2026-10-22",
    }),
    lite("patchwork-dev", "Patchwork", {
      tagline: "Automated dependency upgrades with test-verified PRs",
      sectors: ["DevTools"],
      stage: "Seed",
      status: "Second Meeting",
      hq: "San Francisco, CA",
      raising: 3_000_000,
      preMoney: 15_000_000,
      arr: 220_000,
      score: [3, 3, 4, 3, 3, 4],
      lastContact: "2026-10-09",
    }),
    lite("quillmark", "Quillmark", {
      tagline: "Contract redlining copilot for in-house legal",
      sectors: ["LegalTech", "AI/ML"],
      stage: "Seed",
      status: "Passed",
      hq: "Boston, MA",
      raising: 4_000_000,
      preMoney: 20_000_000,
      arr: 300_000,
      score: [3, 2, 2, 3, 2, 3],
      lastContact: "2026-09-02",
    }),
    lite("orbitwell", "Orbitwell", {
      tagline: "Remote monitoring for post-surgical patients",
      sectors: ["HealthTech"],
      stage: "Seed",
      status: "Invested",
      hq: "Austin, TX",
      raising: 3_500_000,
      preMoney: 14_000_000,
      arr: 480_000,
      score: [4, 4, 4, 3, 4, 3],
      lastContact: "2026-08-14",
    }),
  ];
}

// Fictional Deal Flow rows served when NOTION_TOKEN is not set, so the import flow can be tried end to end.
import type { NotionContact, NotionDeal } from "./notion-map";
import { analyzeSchema, EXPECTED_COLUMNS, type LiveColumn, type SchemaReport } from "./notion-schema";

// Sample contacts as they come back from the Contacts database (fictional).
const contact = (id: string, name: string, roles: string[], email: string, extra: Partial<NotionContact> = {}): NotionContact => ({
  id, name, roles, email, phone: "", linkedin: "", founder: roles.some((r) => /^C.O$/.test(r)), notes: "", ...extra,
});

export const DEMO_DEALS: NotionDeal[] = [
  {
    pageId: "sample-kestrel",
    url: "https://www.notion.so/",
    firm: "Kestrel Labs",
    stage: "Seed",
    industries: ["Cybersecurity", "AI Infrastructure"],
    status: "DD",
    raising: 4_500_000,
    raised: 1_250_000,
    valuation: 18_000_000,
    roundInfo: "Priced Seed — Northgate expected to lead",
    score: 78,
    website: "https://kestrel-labs.example",
    hq: "Austin, TX",
    drive: "https://drive.google.com/drive/folders/kestrel-demo",
    lastContact: "2026-10-23",
    notes: "Runtime security for AI agents. Moved to DD after second meeting.",
    lastEdited: "2026-10-23T15:40:00Z",
    operators: [
      contact("demo-c1", "Maya Okafor", ["CEO"], "maya@kestrel-labs.example", { phone: "+1 512 555 0142" }),
      contact("demo-c2", "Tomás Reyes", ["CTO"], "tomas@kestrel-labs.example"),
    ],
    sources: [contact("demo-s1", "Dana Whitfield", ["Advisor"], "dana@example.com")],
    body:
      "## Call notes — 2026-10-23\n• Tech deep-dive with CTO: architecture solid, Rust proxy benchmarks reproduced\n• Northgate term sheet signed for $2.5M of the $4.5M\n☐ Ask for updated cap table after advisor grants are ratified",
  },
  {
    pageId: "demo-harbor-ai",
    url: "https://www.notion.so/",
    firm: "Harbor AI",
    stage: "Pre-Seed",
    industries: ["AI/ML", "Transportation"],
    status: "First Meeting",
    raising: 2_000_000,
    raised: 250_000,
    valuation: 10_000_000,
    roundInfo: "SAFE — $10M post-money cap",
    score: 41,
    website: "https://harbor-ai.example",
    hq: "Houston, TX",
    drive: "",
    lastContact: "2026-10-22",
    notes: "Predictive berth scheduling for container ports. Two pilot terminals in the Gulf.",
    lastEdited: "2026-10-22T10:05:00Z",
    operators: [
      contact("demo-c3", "Luis Navarro", ["CEO"], "luis@harbor-ai.example", { linkedin: "https://www.linkedin.com/", notes: "Ex-port operations lead" }),
      contact("demo-c4", "Ada Chen", ["CTO"], "ada@harbor-ai.example", { notes: "Ex-logistics ML lead" }),
    ],
    sources: [contact("demo-s2", "Gulf Coast Accelerator", ["Accelerator"], "")],
    body: "## First call\n• Founders: ex-port operations + ex-logistics ML lead\n• 2 paid pilots, $8k MRR\n• Raising $2M SAFE",
  },
  {
    pageId: "demo-vellum-bio",
    url: "https://www.notion.so/",
    firm: "Vellum Bio",
    stage: "Seed",
    industries: ["HealthTech", "Deep Tech"],
    status: "To be reviwed",
    raising: 5_000_000,
    raised: null,
    valuation: null,
    roundInfo: "",
    score: null,
    website: "https://vellum-bio.example",
    hq: "Boston, MA",
    drive: "",
    lastContact: null,
    notes: "Inbound via form. Cell-free protein synthesis platform.",
    lastEdited: "2026-10-20T08:00:00Z",
  },
];

// Demo schema with two example changes, so the schema warning can be seen without a token:
// "Raising" renamed to "Round Size", and a new "Lead Investor" column.
export function demoSchemaReport(): SchemaReport {
  const live: LiveColumn[] = [
    ...EXPECTED_COLUMNS.filter((c) => c.name !== "Raising").map((c) => ({
      name: c.name,
      type: c.types[0] ?? "place",
      options: c.options ? [...c.options] : undefined,
    })),
    { name: "Round Size", type: "number" },
    { name: "Lead Investor", type: "rich_text" },
    { name: "Meeting", type: "relation" },
  ];
  return { ...analyzeSchema(live), demo: true };
}

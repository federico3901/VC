// Server-only Notion client. Reads the Deal Flow database through the public Notion API.
// Plain REST + fetch: no SDK, no LLM — properties map 1:1 onto dossier fields.
import "server-only";
import type { NotionDeal } from "./notion-map";

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

export function notionConfig() {
  const token = process.env.NOTION_TOKEN?.trim();
  const db = process.env.NOTION_DEALFLOW_DB?.trim();
  return token && db ? { token, db } : null;
}

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

type RichText = { plain_text: string }[];
type Prop = { type: string; [k: string]: unknown };
type Page = { id: string; url: string; last_edited_time: string; properties: Record<string, Prop> };

const text = (rt: unknown) => ((rt as RichText | undefined) ?? []).map((t) => t.plain_text).join("");

/** Reads a property by name, tolerating trailing spaces in names (e.g. "Source "). */
function prop(page: Page, name: string): Prop | undefined {
  if (page.properties[name]) return page.properties[name];
  const key = Object.keys(page.properties).find((k) => k.trim().toLowerCase() === name.toLowerCase());
  return key ? page.properties[key] : undefined;
}

function value(p: Prop | undefined): unknown {
  if (!p) return null;
  const v = p[p.type] as Record<string, unknown> | unknown;
  switch (p.type) {
    case "title":
    case "rich_text":
      return text(v);
    case "number":
      return v;
    case "url":
    case "email":
    case "phone_number":
      return v ?? "";
    case "select":
    case "status":
      return (v as { name?: string } | null)?.name ?? null;
    case "multi_select":
      return ((v as { name: string }[]) ?? []).map((o) => o.name);
    case "date":
      return (v as { start?: string } | null)?.start ?? null;
    case "place": {
      const pl = v as { name?: string; address?: string } | null;
      return pl?.name || pl?.address || "";
    }
    default:
      return null;
  }
}

function toDeal(page: Page): NotionDeal {
  const s = (n: string) => (value(prop(page, n)) as string | null) ?? "";
  const n = (k: string) => (value(prop(page, k)) as number | null) ?? null;
  return {
    pageId: page.id.replace(/-/g, ""),
    url: page.url,
    firm: s("Firm"),
    stage: (value(prop(page, "Stage")) as string | null) ?? null,
    industries: (value(prop(page, "Industry")) as string[] | null) ?? [],
    status: (value(prop(page, "Deal Status")) as string | null) ?? null,
    raising: n("Raising"),
    raised: n("Raised"),
    valuation: n("Valuation"),
    roundInfo: s("Round Info"),
    score: n("Score"),
    website: s("Website"),
    hq: s("Headquarter"),
    drive: s("Drive"),
    lastContact: (value(prop(page, "Last Contact")) as string | null) ?? null,
    notes: s("Notes"),
    lastEdited: page.last_edited_time,
  };
}

export async function listDeals(): Promise<NotionDeal[]> {
  const cfg = notionConfig();
  if (!cfg) throw new Error("Notion not configured");
  const out: NotionDeal[] = [];
  let cursor: string | undefined;
  do {
    const res = await call<{ results: Page[]; has_more: boolean; next_cursor: string | null }>(
      `/databases/${cfg.db}/query`,
      cfg.token,
      {
        method: "POST",
        body: JSON.stringify({
          page_size: 100,
          start_cursor: cursor,
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
        }),
      },
    );
    out.push(...res.results.map(toDeal));
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return out;
}

type Block = { id: string; type: string; has_children: boolean; [k: string]: unknown };

const PREFIX: Record<string, string> = {
  heading_1: "# ",
  heading_2: "## ",
  heading_3: "### ",
  bulleted_list_item: "• ",
  numbered_list_item: "– ",
  to_do: "☐ ",
  quote: "> ",
};

/** Page body as plain text (two levels deep, enough for call-note pages). */
async function pageText(id: string, token: string, depth = 0): Promise<string> {
  const lines: string[] = [];
  let cursor: string | undefined;
  do {
    const q = cursor ? `?page_size=100&start_cursor=${cursor}` : "?page_size=100";
    const res = await call<{ results: Block[]; has_more: boolean; next_cursor: string | null }>(
      `/blocks/${id}/children${q}`,
      token,
    );
    for (const b of res.results) {
      const rt = (b[b.type] as { rich_text?: RichText } | undefined)?.rich_text;
      if (rt) {
        const t = text(rt);
        if (t) lines.push("  ".repeat(depth) + (PREFIX[b.type] ?? "") + t);
      }
      if (b.has_children && depth < 1 && b.type !== "child_page" && b.type !== "child_database") {
        const inner = await pageText(b.id, token, depth + 1);
        if (inner) lines.push(inner);
      }
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return lines.join("\n");
}

export async function getDeal(pageId: string): Promise<NotionDeal> {
  const cfg = notionConfig();
  if (!cfg) throw new Error("Notion not configured");
  const page = await call<Page>(`/pages/${pageId}`, cfg.token);
  const deal = toDeal(page);
  deal.body = await pageText(pageId, cfg.token);
  return deal;
}

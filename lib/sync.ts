"use client";

import { mergeNotionDeal, NOTION_FIELD_LABELS, type MergeResult, type NotionDeal } from "./notion-map";
import type { SchemaReport } from "./notion-schema";
import type { Startup } from "./types";

export async function fetchDeal(
  pageId: string,
): Promise<{ deal: NotionDeal; configured: boolean; schema: SchemaReport | null }> {
  const res = await fetch(`/api/notion/deals/${encodeURIComponent(pageId)}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

/** Fetch one Notion row (with page content) and merge it into the existing dossier, if any. */
export async function syncDeal(
  pageId: string,
  all: Startup[],
): Promise<MergeResult & { schema: SchemaReport | null }> {
  const { deal, schema } = await fetchDeal(pageId);
  const existing = all.find((s) => s.notionPageId === pageId) ?? all.find((s) => s.name.toLowerCase() === deal.firm.toLowerCase()) ?? null;
  return { ...mergeNotionDeal(existing, deal, new Set(all.map((s) => s.id))), schema: schema ?? null };
}

export function describeMerge(r: MergeResult & { schema?: SchemaReport | null }): string {
  const label = (p: string) => NOTION_FIELD_LABELS[p] ?? p;
  const parts: string[] = [];
  parts.push(r.updated.length ? `Updated: ${[...new Set(r.updated.map(label))].join(", ")}.` : "Already up to date.");
  if (r.kept.length) parts.push(`Kept founder-call/manual values for: ${[...new Set(r.kept.map(label))].join(", ")}.`);
  const problems = r.schema?.issues.filter((i) => i.kind !== "new").length ?? 0;
  if (problems) parts.push(`⚠ ${problems} Deal Flow column${problems > 1 ? "s" : ""} changed in Notion — see Notion sync.`);
  return parts.join(" ");
}

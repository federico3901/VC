import { NextResponse } from "next/server";
import { checkSchema, listDeals, notionConfig } from "@/lib/notion";
import { DEMO_DEALS, demoSchemaReport } from "@/lib/notion-demo";

export const dynamic = "force-dynamic";

export async function GET() {
  let cfg;
  try {
    cfg = notionConfig();
  } catch (e) {
    return NextResponse.json({ configured: true, error: (e as Error).message, deals: [] }, { status: 500 });
  }
  if (!cfg) {
    return NextResponse.json({
      configured: false,
      schema: demoSchemaReport(),
      deals: DEMO_DEALS.map(({ body, ...d }) => d),
    });
  }
  try {
    // The schema check never blocks the import: if it fails, rows still load.
    const [deals, schema] = await Promise.all([listDeals(), checkSchema().catch(() => null)]);
    return NextResponse.json({ configured: true, deals, schema });
  } catch (e) {
    return NextResponse.json(
      { configured: true, error: `${(e as Error).message} (database ID used: ${cfg.db})`, deals: [] },
      { status: 502 },
    );
  }
}

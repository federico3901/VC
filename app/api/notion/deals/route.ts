import { NextResponse } from "next/server";
import { listDeals, notionConfig } from "@/lib/notion";
import { DEMO_DEALS } from "@/lib/notion-demo";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!notionConfig()) {
    return NextResponse.json({ configured: false, deals: DEMO_DEALS.map(({ body, ...d }) => d) });
  }
  try {
    return NextResponse.json({ configured: true, deals: await listDeals() });
  } catch (e) {
    return NextResponse.json({ configured: true, error: (e as Error).message, deals: [] }, { status: 502 });
  }
}

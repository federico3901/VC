import { NextResponse } from "next/server";
import { checkSchema, getDeal, notionConfig } from "@/lib/notion";
import { DEMO_DEALS, demoSchemaReport } from "@/lib/notion-demo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!notionConfig()) {
    const deal = DEMO_DEALS.find((d) => d.pageId === id);
    return deal
      ? NextResponse.json({ configured: false, deal, schema: demoSchemaReport() })
      : NextResponse.json({ configured: false, error: "Not found" }, { status: 404 });
  }
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) {
    return NextResponse.json({ configured: true, error: "Invalid page id" }, { status: 400 });
  }
  try {
    const [deal, schema] = await Promise.all([getDeal(id), checkSchema().catch(() => null)]);
    return NextResponse.json({ configured: true, deal, schema });
  } catch (e) {
    return NextResponse.json({ configured: true, error: (e as Error).message }, { status: 502 });
  }
}

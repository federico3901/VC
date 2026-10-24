import { NextResponse } from "next/server";
import { getDeal, notionConfig } from "@/lib/notion";
import { DEMO_DEALS } from "@/lib/notion-demo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!notionConfig()) {
    const deal = DEMO_DEALS.find((d) => d.pageId === id);
    return deal
      ? NextResponse.json({ configured: false, deal })
      : NextResponse.json({ configured: false, error: "Not found" }, { status: 404 });
  }
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) {
    return NextResponse.json({ configured: true, error: "Invalid page id" }, { status: 400 });
  }
  try {
    return NextResponse.json({ configured: true, deal: await getDeal(id) });
  } catch (e) {
    return NextResponse.json({ configured: true, error: (e as Error).message }, { status: 502 });
  }
}

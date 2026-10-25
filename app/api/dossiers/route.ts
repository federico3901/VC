import { NextResponse } from "next/server";
import { listDossiers, supabaseConfig, upsertDossiers, validId } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: all dossiers from Supabase. `configured: false` means the app keeps using browser storage.
export async function GET() {
  if (!supabaseConfig()) return NextResponse.json({ configured: false, dossiers: [] });
  try {
    const rows = await listDossiers();
    return NextResponse.json({ configured: true, dossiers: rows.map((r) => r.data) });
  } catch (e) {
    return NextResponse.json({ configured: true, error: (e as Error).message, dossiers: [] }, { status: 502 });
  }
}

// POST: bulk upsert, used once to upload what was saved in the browser before Supabase.
export async function POST(req: Request) {
  if (!supabaseConfig()) return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { dossiers?: { id?: unknown }[] } | null;
  const list = Array.isArray(body?.dossiers) ? body!.dossiers : null;
  if (!list || !list.every((d) => validId(d?.id))) return NextResponse.json({ error: "Invalid dossiers" }, { status: 400 });
  try {
    await upsertDossiers(list.map((d) => ({ id: d.id as string, data: d })));
    return NextResponse.json({ ok: true, count: list.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

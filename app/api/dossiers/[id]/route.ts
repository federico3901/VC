import { NextResponse } from "next/server";
import { deleteDossier, supabaseConfig, upsertDossiers, validId } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!supabaseConfig()) return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });
  const data = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (!validId(id) || !data || data.id !== id) return NextResponse.json({ error: "Invalid dossier" }, { status: 400 });
  try {
    await upsertDossiers([{ id, data }]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!supabaseConfig()) return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });
  if (!validId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    await deleteDossier(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

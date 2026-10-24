import { NextResponse } from "next/server";
import { appPassword, safeEqual, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const pw = appPassword();
  if (!pw) return NextResponse.json({ error: "APP_PASSWORD is not set" }, { status: 503 });

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  // Compare HMACs rather than raw strings so timing does not leak the password.
  const ok = typeof password === "string" && safeEqual(await sessionToken(password), await sessionToken(pw));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(pw), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

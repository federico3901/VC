"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandMark } from "@/components/TopBar";

function Login() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const next = params.get("next") ?? "/";
      // Only follow same-site paths.
      window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return;
    }
    const json = await res.json().catch(() => ({}));
    setError(json.error ?? "Login failed");
    setBusy(false);
  }

  return (
    <main className="page" style={{ display: "grid", placeItems: "center", minHeight: "calc(100vh - var(--top-h))" }}>
      <form className="panel stack-v" style={{ width: "min(380px, 100%)", padding: 28, gap: 14 }} onSubmit={submit}>
        <div className="row" style={{ gap: 10 }}>
          <BrandMark />
          <span className="brand-name">Topline Intake</span>
        </div>
        <div>
          <h1 className="display" style={{ fontSize: 26 }}>Sign in</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>Enter the team password to continue.</p>
        </div>
        <input
          className="input"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div style={{ color: "var(--crit)", fontSize: 13 }}>{error}</div>}
        <button className="btn primary" type="submit" disabled={busy || !password} style={{ justifyContent: "center" }}>
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="page" />}>
      <Login />
    </Suspense>
  );
}

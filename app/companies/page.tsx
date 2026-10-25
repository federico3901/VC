"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PipelineTable } from "@/components/PipelineTable";
import { emptyStartup, slugify } from "@/lib/model";
import { today } from "@/lib/format";
import { useStore } from "@/lib/store";

function Companies() {
  const { startups, ready, save, reset, removeMany, backend } = useStore();
  const samples = startups.filter((s) => s.sample);
  const params = useSearchParams();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (params.get("new")) setCreating(true);
  }, [params]);

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    let id = slugify(name);
    while (startups.some((s) => s.id === id)) id += "-1";
    const s = emptyStartup(id, name.trim());
    s.lastContact = today();
    s.notes = [{ id: crypto.randomUUID(), date: today(), kind: "Note", author: "", title: "Dossier created", body: "" }];
    save(s);
    router.push(`/companies/${id}`);
  }

  if (!ready) return <main className="page" />;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Topline Ventures · {startups.length} dossiers</div>
          <h1 className="display">Companies</h1>
        </div>
        <div className="row">
          {backend === "local" && (
            <button
              className="btn ghost"
              onClick={() => confirm("Replace all companies with the sample set? Your current data in this browser will be lost.") && reset()}
            >
              Reset sample data
            </button>
          )}
          {samples.length > 0 && (
            <button
              className="btn ghost danger"
              onClick={() =>
                confirm(`Delete the ${samples.length} sample companies (${samples.map((s) => s.name).join(", ")})?`) &&
                removeMany(samples.map((s) => s.id))
              }
            >
              Remove sample companies ({samples.length})
            </button>
          )}
          <button className="btn primary" onClick={() => setCreating(true)}>+ New company</button>
        </div>
      </div>

      {creating && (
        <form className="panel row" style={{ marginBottom: 14 }} onSubmit={create}>
          <span className="eyebrow">New dossier</span>
          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            autoFocus
            placeholder="Company name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={!name.trim()}>Create</button>
          <button className="btn ghost" type="button" onClick={() => setCreating(false)}>Cancel</button>
        </form>
      )}

      <section className="panel">
        <PipelineTable startups={startups} initialStatus={params.get("status") ?? ""} />
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="page" />}>
      <Companies />
    </Suspense>
  );
}

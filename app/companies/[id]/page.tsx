"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Meter, StatusBadge, Toast } from "@/components/bits";
import { catColor, LineChart, MarketCircles, StackBar } from "@/components/charts";
import { CompetitorCharts, CompetitorKpiEditor } from "@/components/competition";
import { ProcessControls, ProcessStrip } from "@/components/process";
import { DossierProvider, Field, ListEditor, Section, StringList, useDossier, useEditing } from "@/components/dossier";
import { completeness, ddProgress, emptyProduct, postMoney, setPath, TRACKED_FIELDS, weightedScore } from "@/lib/model";
import { date, money, pct, today } from "@/lib/format";
import { useStore } from "@/lib/store";
import { describeMerge, syncDeal } from "@/lib/sync";
import {
  DD_STATUSES,
  DEAL_STATUSES,
  STAGES,
  type CapRow,
  type Competitor,
  type DDItem,
  type DocumentLink,
  type KpiPoint,
  type NoteEntry,
  type Person,
  type Provenance,
  type ScoreCriterion,
  type Startup,
  type UseOfFunds,
} from "@/lib/types";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team" },
  { id: "product", label: "Products" },
  { id: "market", label: "Market" },
  { id: "traction", label: "Traction" },
  { id: "round", label: "Cap table & round" },
  { id: "competition", label: "Competition" },
  { id: "thesis", label: "Thesis & risks" },
  { id: "scoring", label: "Scoring & DD" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes & calls" },
];

export default function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const { get, update, ready, startups, save, remove } = useStore();
  const router = useRouter();
  const s = get(id);
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [active, setActive] = useState("overview");

  // Scroll-spy: the active section is the last one whose top has passed the top bar.
  // At the very bottom the last section wins (short final sections can never reach the top).
  // After a click in the sidebar the clicked section stays highlighted until the user scrolls.
  const lockRef = useRef<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const els = SECTIONS.map((x) => document.getElementById(x.id)).filter(Boolean) as HTMLElement[];
      if (!els.length) return;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= 140) current = el.id;
      if (atBottom) current = lockRef.current ?? els[els.length - 1].id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const unlock = () => (lockRef.current = null);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", unlock, { passive: true });
    window.addEventListener("touchmove", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", unlock);
      window.removeEventListener("touchmove", unlock);
      window.removeEventListener("keydown", unlock);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ready, s?.id]);

  if (!ready) return <main className="page" />;
  if (!s)
    return (
      <main className="page empty-state">
        <h1 className="display">Not found</h1>
        <p>This company is not in your workspace.</p>
        <Link className="btn" href="/companies">Back to companies</Link>
      </main>
    );

  const set = (path: string, value: unknown, prov?: Partial<Provenance>) =>
    update(s.id, (cur) => {
      const next = setPath(cur, path, value);
      next.provenance = {
        ...cur.provenance,
        [path]: { source: "manual", confidence: "confirmed", at: new Date().toISOString(), ...prov },
      };
      return next;
    });

  async function sync() {
    if (!s?.notionPageId) return;
    setSyncing(true);
    try {
      const r = await syncDeal(s.notionPageId, startups);
      save({ ...r.startup, id: s.id });
      setToast(describeMerge(r));
    } catch (e) {
      setToast(`Sync failed: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  const comp = completeness(s);
  // Founder-facing fields per section: how many are filled out of how many are tracked.
  const sectionProgress = (sec: string) => {
    const total = TRACKED_FIELDS.filter((f) => f.section === sec).length;
    return total ? { total, filled: total - comp.missing.filter((m) => m.section === sec).length } : null;
  };

  return (
    <DossierProvider value={{ s, set, replace: (fn) => update(s.id, fn) }}>
      <main className="page">
        <div className="row" style={{ marginBottom: 14 }}>
          <Link className="btn ghost small" href="/companies">← Companies</Link>
          {s.sample && <span className="tag" style={{ color: "var(--brand-dot)" }}>Sample data · fictional</span>}
        </div>

        <Hero s={s} set={set} onSync={sync} syncing={syncing} onDelete={() => {
          if (confirm(`Delete ${s.name}? This cannot be undone.`)) {
            remove(s.id);
            router.push("/companies");
          }
        }} />

        <div className="dossier" style={{ marginTop: 14 }}>
          <nav className="toc" aria-label="Sections">
            <div className="toc-legend">Fields filled</div>
            {SECTIONS.map((x) => {
              const pr = sectionProgress(x.id);
              const done = pr && pr.filled === pr.total;
              return (
                <a
                  key={x.id}
                  href={`#${x.id}`}
                  className={active === x.id ? "active" : ""}
                  onClick={() => {
                    lockRef.current = x.id;
                    setActive(x.id);
                  }}
                >
                  {x.label}
                  {pr && (
                    <span className={`cnt ${done ? "done" : ""}`} title={`${pr.filled} of ${pr.total} key fields filled`}>
                      {done ? "✓" : `${pr.filled}/${pr.total}`}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          <div>
            <Overview />
            <Team />
            <Product />
            <Market />
            <Traction />
            <Round />
            <Competition />
            <Thesis />
            <Scoring />
            <Documents />
            <Notes onToast={setToast} />
          </div>
        </div>
        {toast && <Toast onClose={() => setToast(null)}>{toast}</Toast>}
      </main>
    </DossierProvider>
  );
}

// ---------- hero ----------

function Hero({
  s,
  set,
  onSync,
  syncing,
  onDelete,
}: {
  s: Startup;
  set: (p: string, v: unknown) => void;
  onSync: () => void;
  syncing: boolean;
  onDelete: () => void;
}) {
  const score = weightedScore(s);
  const comp = completeness(s);
  return (
    <section className="panel hero">
      <div className="hero-top">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="eyebrow">
            {[s.stage, s.hq, s.founded && `Founded ${date(s.founded)}`].filter(Boolean).join(" · ") || "New dossier"}
          </div>
          <h1 className="display" style={{ marginTop: 6 }}>{s.name}</h1>
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 15, maxWidth: 720 }}>
            {s.tagline || s.description.oneLiner || "Add a tagline in Overview."}
          </p>
        </div>
        <div className="stack-v" style={{ justifyItems: "end" }}>
          <div className="row">
            <StatusBadge status={s.status} />
            <select className="select" style={{ width: "auto" }} value={s.status} onChange={(e) => set("status", e.target.value)} aria-label="Deal status">
              {DEAL_STATUSES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="row">
            {s.notionPageId ? (
              <>
                <button className="btn" onClick={onSync} disabled={syncing}>{syncing ? "Syncing…" : "↻ Sync Notion"}</button>
                {s.notionUrl && <a className="btn ghost" href={s.notionUrl} target="_blank" rel="noreferrer">Open in Notion ↗</a>}
              </>
            ) : (
              <Link className="btn" href="/import">Link to Notion</Link>
            )}
            <button className="btn ghost danger small" onClick={onDelete}>Delete</button>
          </div>
          {s.lastSyncedAt && <span className="eyebrow">Last sync {date(s.lastSyncedAt)}</span>}
        </div>
      </div>
      <div className="hero-meta">
        {s.sectors.map((x) => (
          <span key={x} className="chip signal">{x}</span>
        ))}
        {s.website && <a className="chip" href={s.website} target="_blank" rel="noreferrer">{s.website.replace(/^https?:\/\//, "")} ↗</a>}
        {s.owner && <span className="chip">Owner · {s.owner}</span>}
      </div>
      <div className="hero-process">
        <ProcessStrip s={s} />
        <ProcessControls s={s} set={set} />
      </div>
      <div className="hero-stats">
        <Stat label="Raising" v={money(s.round.raising)} />
        <Stat label="Pre-money" v={money(s.round.preMoney)} />
        <Stat label="Post-money" v={money(postMoney(s))} />
        <Stat label="ARR" v={money(s.traction.arr)} />
        <Stat label="Score" v={score != null ? score.toFixed(0) : "—"} sub={s.notionScore != null ? `Notion ${s.notionScore}` : "Weighted /100"} />
        <div>
          <div className="eyebrow">Dossier</div>
          <div className="v">{comp.pct}%</div>
          <Meter value={comp.pct} label={`${comp.missing.length} gaps`} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, v, sub }: { label: string; v: string; sub?: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="v">{v}</div>
      {sub && <div className="muted" style={{ fontSize: 11.5 }}>{sub}</div>}
    </div>
  );
}

// ---------- sections ----------

function Overview() {
  return (
    <Section id="overview" n={1} title="Overview">
      <div className="fields">
        <Field path="name" label="Company" />
        <Field path="tagline" label="Tagline" />
        <Field path="description.oneLiner" label="One-liner" wide />
        <Field path="description.problem" label="Problem" type="long" />
        <Field path="description.solution" label="Solution" type="long" />
        <Field path="description.whyNow" label="Why now" type="long" />
        <Field path="description.customer" label="Target customer" type="long" />
        <Field path="businessModel" label="Business model" type="long" wide />
      </div>
      <hr className="sep" />
      <div className="fields three">
        <Field path="stage" label="Stage" type="select" options={STAGES} />
        <Field path="sectors" label="Sectors" type="tags" />
        <Field path="hq" label="HQ" />
        <Field path="founded" label="Founded" type="month" />
        <Field path="employees" label="Employees" type="number" />
        <Field path="website" label="Website" type="url" />
        <Field path="owner" label="Deal owner" />
        <Field path="referral" label="Source / referral" />
        <Field path="lastContact" label="Last contact" type="date" />
      </div>
    </Section>
  );
}

function Team() {
  return (
    <Section id="team" n={2} title="Team">
      <TeamBody />
    </Section>
  );
}

function TeamBody() {
  const { s } = useDossier();
  const editing = useEditing();
  if (editing)
    return (
      <ListEditor<Person>
        path="team"
        addLabel="Add person"
        blank={{ name: "", role: "", background: "", linkedin: "", fullTime: true, email: "", phone: "" }}
        cols={[
          { key: "name", label: "Name", width: "15%" },
          { key: "role", label: "Role", width: "12%" },
          { key: "background", label: "Background", type: "long" },
          { key: "email", label: "Email", width: "15%" },
          { key: "phone", label: "Phone", width: "11%" },
          { key: "linkedin", label: "LinkedIn", width: "13%" },
          { key: "fullTime", label: "Full-time", type: "bool", width: "70px" },
        ]}
      />
    );
  if (!s.team.length) return <div className="field-value empty">No team members captured yet.</div>;
  return (
    <div className="cards">
      {s.team.map((p, i) => (
        <div key={i} className="card">
          <h4>{p.name}</h4>
          <div className="eyebrow" style={{ color: "var(--signal)" }}>{p.role}{!p.fullTime && " · part-time"}</div>
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 12.5 }}>{p.background || "—"}</p>
          <div className="stack-v" style={{ gap: 2, marginTop: 8, fontSize: 12.5 }}>
            {p.email && <a href={`mailto:${p.email}`} style={{ color: "var(--signal)" }}>{p.email}</a>}
            {p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a>}
            {p.linkedin && <a href={p.linkedin} target="_blank" rel="noreferrer" style={{ color: "var(--signal)" }}>LinkedIn ↗</a>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Product() {
  return (
    <Section id="product" n={3} title="Products">
      <ProductsBody />
    </Section>
  );
}

function ProductsBody() {
  const { s, set, replace } = useDossier();
  const editing = useEditing();

  // Removing product i shifts the source tags of the products after it.
  const remove = (i: number) =>
    replace((cur) => {
      const provenance: Startup["provenance"] = {};
      for (const [path, p] of Object.entries(cur.provenance)) {
        const m = path.match(/^products\.(\d+)\.(.+)$/);
        if (!m) provenance[path] = p;
        else if (+m[1] < i) provenance[path] = p;
        else if (+m[1] > i) provenance[`products.${+m[1] - 1}.${m[2]}`] = p;
      }
      return { ...cur, products: cur.products.filter((_, j) => j !== i), provenance };
    });

  if (!s.products.length && !editing)
    return <div className="field-value empty">No products captured yet — click Edit to add one.</div>;

  return (
    <div className="stack-v" style={{ gap: 14 }}>
      {s.products.map((p, i) => (
        <div key={i} className="product-block">
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 8 }}>
              <h3 className="product-name">{p.name || `Product ${i + 1}`}</h3>
              {p.maturity && !editing && <span className="chip signal">{p.maturity}</span>}
            </div>
            {editing && (
              <button className="btn ghost small danger" onClick={() => remove(i)}>Remove product</button>
            )}
          </div>
          <div className="fields">
            {editing && <Field path={`products.${i}.name`} label="Product name" />}
            {editing && <Field path={`products.${i}.maturity`} label="Maturity" placeholder="e.g. Beta, GA" />}
            <Field path={`products.${i}.summary`} label="Summary" type="long" wide />
            <Field path={`products.${i}.pricing`} label="Pricing" />
            <Field path={`products.${i}.technology`} label="Technology" type="long" />
            <Field path={`products.${i}.moat`} label="Moat / defensibility" type="long" />
            <Field path={`products.${i}.roadmap`} label="Roadmap" type="long" />
          </div>
        </div>
      ))}
      {editing && (
        <button className="btn small" style={{ justifySelf: "start" }} onClick={() => set("products", [...s.products, emptyProduct()])}>
          + Add product
        </button>
      )}
    </div>
  );
}

function Market() {
  return (
    <Section id="market" n={4} title="Market">
      <MarketBody />
    </Section>
  );
}

function MarketBody() {
  const { s } = useDossier();
  const editing = useEditing();
  return (
    <>
      {editing ? (
        <div className="fields three">
          <Field path="market.tam" label="TAM" type="money" />
          <Field path="market.sam" label="SAM" type="money" />
          <Field path="market.som" label="SOM" type="money" />
        </div>
      ) : (
        <MarketCircles
          format={(v) => money(v)}
          rows={[
            { label: "TAM", value: s.market.tam, caption: "Total addressable market" },
            { label: "SAM", value: s.market.sam, caption: "Serviceable available market" },
            { label: "SOM", value: s.market.som, caption: "Obtainable in 3–5 years" },
          ]}
        />
      )}
      <hr className="sep" />
      <div className="fields">
        <Field path="market.methodology" label="Sizing methodology" type="long" wide />
        <Field path="market.geography" label="Geography" />
        <Field path="market.trends" label="Trends & tailwinds" type="long" />
      </div>
    </>
  );
}

function Traction() {
  return (
    <Section id="traction" n={5} title="Traction & KPIs">
      <TractionBody />
    </Section>
  );
}

function TractionBody() {
  const { s } = useDossier();
  const editing = useEditing();
  return (
    <>
      <div className="fields three">
        <Field path="traction.arr" label="ARR" type="money" big />
        <Field path="traction.growthMoM" label="MoM growth" type="pct" big />
        <Field path="traction.customers" label="Paying customers" type="number" big />
        <Field path="traction.nrr" label="Net revenue retention" type="pct" />
        <Field path="traction.grossMargin" label="Gross margin" type="pct" />
        <Field path="traction.burn" label="Monthly net burn" type="money" />
        <Field path="traction.runwayMonths" label="Runway (months)" type="number" />
        <Field path="traction.pipeline" label="Pipeline" type="long" wide />
        <Field path="traction.notes" label="Notes" type="long" wide />
      </div>
      <hr className="sep" />
      <div className="eyebrow" style={{ marginBottom: 8 }}>MRR history</div>
      {editing ? (
        <ListEditor<KpiPoint>
          path="kpiHistory"
          addLabel="Add month"
          blank={{ month: "", mrr: 0 }}
          cols={[
            { key: "month", label: "Month (YYYY-MM)" },
            { key: "mrr", label: "MRR (USD)", type: "number" },
          ]}
        />
      ) : (
        <LineChart points={s.kpiHistory.map((k) => ({ x: k.month, y: k.mrr }))} format={(v) => money(v)} />
      )}
    </>
  );
}

function Round() {
  return (
    <Section id="round" n={6} title="Cap table & round">
      <RoundBody />
    </Section>
  );
}

function RoundBody() {
  const { s } = useDossier();
  const editing = useEditing();
  const post = postMoney(s);
  const capTotal = s.capTable.reduce((a, r) => a + r.pct, 0);

  const postRound = useMemo(() => {
    if (!post || !s.round.raising || !s.capTable.length || !capTotal) return null;
    const factor = (s.round.preMoney as number) / post;
    const rows = s.capTable.map((r) => ({ label: r.holder, value: (r.pct / capTotal) * 100 * factor }));
    const ours = s.round.ourTicket ? (s.round.ourTicket / post) * 100 : 0;
    const newMoney = (s.round.raising / post) * 100;
    if (ours) rows.push({ label: "Topline (this round)", value: ours });
    rows.push({ label: ours ? "Other new investors" : "New investors", value: newMoney - ours });
    return rows;
  }, [s, post, capTotal]);

  // Colour follows the holder, not its position, so pre/post bars match.
  // New money gets its own reserved colours so it never collides with an existing holder.
  const holders = s.capTable.map((r) => r.holder);
  const colorOf = (label: string) =>
    label === "Topline (this round)" ? "var(--brand-dot)" : label.endsWith("new investors") || label === "New investors" ? "var(--faint)" : catColor(holders.indexOf(label));

  return (
    <>
      <div className="fields three">
        <Field path="round.instrument" label="Instrument" />
        <Field path="round.raising" label="Raising" type="money" big />
        <Field path="round.preMoney" label="Pre-money / cap" type="money" big />
        <Field path="round.committed" label="Committed so far" type="money" />
        <Field path="round.lead" label="Lead investor" />
        <Field path="round.targetClose" label="Target close" type="date" />
        <Field path="round.totalRaised" label="Raised to date" type="money" />
        <Field path="round.ourTicket" label="Our ticket (proposed)" type="money" />
        <div className="field">
          <div className="eyebrow">Round filled</div>
          {s.round.raising && s.round.committed != null ? (
            <Meter value={(s.round.committed / s.round.raising) * 100} />
          ) : (
            <div className="field-value empty">—</div>
          )}
        </div>
        <Field path="round.notes" label="Round notes" type="long" wide />
      </div>

      <hr className="sep" />
      <div className="grid g-2">
        <div>
          <div className="row between" style={{ marginBottom: 10 }}>
            <span className="eyebrow">Cap table · fully diluted, pre-round</span>
            {capTotal > 0 && Math.abs(capTotal - 100) > 0.5 && (
              <span className="tag" style={{ color: "var(--serious)" }}>Sums to {capTotal.toFixed(1)}%</span>
            )}
          </div>
          {editing ? (
            <ListEditor<CapRow>
              path="capTable"
              addLabel="Add holder"
              blank={{ holder: "", kind: "Investors", pct: 0 }}
              cols={[
                { key: "holder", label: "Holder" },
                { key: "kind", label: "Type", type: "select", options: ["Founders", "Investors", "ESOP", "Other"], width: "120px" },
                { key: "pct", label: "%", type: "number", width: "80px" },
              ]}
            />
          ) : s.capTable.length ? (
            <StackBar parts={s.capTable.map((r) => ({ label: r.holder, value: r.pct, sub: r.kind }))} colorOf={colorOf} />
          ) : (
            <div className="field-value empty">No cap table yet — ask the founder for the fully diluted table.</div>
          )}
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Post-round (estimate) · {post ? `${money(post)} post` : "needs raise + pre-money"}
          </div>
          {postRound ? (
            <StackBar parts={postRound} colorOf={colorOf} />
          ) : (
            <div className="field-value empty">Add round size, pre-money and the cap table to model dilution.</div>
          )}
        </div>
      </div>

      <hr className="sep" />
      <div className="eyebrow" style={{ marginBottom: 10 }}>Use of funds</div>
      {editing ? (
        <ListEditor<UseOfFunds>
          path="useOfFunds"
          blank={{ label: "", pct: 0 }}
          cols={[
            { key: "label", label: "Bucket" },
            { key: "pct", label: "%", type: "number", width: "80px" },
          ]}
        />
      ) : s.useOfFunds.length ? (
        <StackBar
          parts={s.useOfFunds.map((u) => ({
            label: u.label,
            value: u.pct,
            sub: s.round.raising ? money((s.round.raising * u.pct) / 100) : undefined,
          }))}
          format={(v) => pct(v)}
        />
      ) : (
        <div className="field-value empty">Not captured yet</div>
      )}
    </>
  );
}

function Competition() {
  return (
    <Section id="competition" n={7} title="Competition">
      <CompetitionBody />
    </Section>
  );
}

function CompetitionBody() {
  const { s } = useDossier();
  const editing = useEditing();
  if (editing)
    return (
      <>
        <ListEditor<Competitor>
          path="competitors"
          addLabel="Add competitor"
          blank={{ name: "", description: "", funding: "", differentiation: "", metrics: {} }}
          cols={[
            { key: "name", label: "Name", width: "18%" },
            { key: "description", label: "What they do", type: "long" },
            { key: "funding", label: "Funding", width: "14%" },
            { key: "differentiation", label: "How this company wins", type: "long" },
          ]}
        />
        <CompetitorKpiEditor />
      </>
    );
  if (!s.competitors.length) return <div className="field-value empty">No competitors mapped yet.</div>;
  return (
    <>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr><th>Competitor</th><th>What they do</th><th>Funding</th><th>How {s.name} wins</th></tr>
          </thead>
          <tbody>
            {s.competitors.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td className="muted">{c.description}</td>
                <td className="num" style={{ whiteSpace: "nowrap" }}>{c.funding}</td>
                <td>{c.differentiation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <hr className="sep" />
      <div className="eyebrow" style={{ marginBottom: 10 }}>Compare on a KPI</div>
      <CompetitorCharts s={s} />
    </>
  );
}

function Thesis() {
  return (
    <Section id="thesis" n={8} title="Thesis & risks">
      <div className="grid g-3">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8, color: "var(--ok)" }}>Why it could be big</div>
          <StringList path="thesis.strengths" kind="good" empty="No strengths noted." />
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8, color: "var(--serious)" }}>Key risks</div>
          <StringList path="thesis.risks" kind="bad" empty="No risks noted." />
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8, color: "var(--signal)" }}>Open questions</div>
          <StringList path="thesis.openQuestions" kind="ask" empty="No open questions." />
        </div>
      </div>
      <hr className="sep" />
      <div className="fields">
        <Field path="thesis.recommendation" label="Recommendation" type="long" wide />
      </div>
    </Section>
  );
}

function Scoring() {
  const { s } = useDossier();
  const dd = ddProgress(s);
  return (
    <Section
      id="scoring"
      n={9}
      title="Scoring & due diligence"
      aside={<span className="eyebrow">DD {dd.done}/{dd.total}{dd.flags ? ` · ${dd.flags} red flag` : ""}</span>}
    >
      <ScoringBody />
    </Section>
  );
}

const DD_COLOR: Record<string, string> = {
  "To do": "var(--faint)",
  "In progress": "var(--warn)",
  Done: "var(--ok)",
  "Red flag": "var(--crit)",
};

function ScoringBody() {
  const { s, set } = useDossier();
  const editing = useEditing();
  const score = weightedScore(s);
  const weights = s.scoring.reduce((a, c) => a + c.weight, 0);
  const dd = ddProgress(s);
  const areas = [...new Set(s.dd.map((d) => d.area))];

  return (
    <div className="grid g-2">
      <div>
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="eyebrow">Scorecard · 1–5 per criterion</span>
          <span className="display" style={{ fontSize: 28 }}>{score != null ? score.toFixed(0) : "—"}<span className="muted" style={{ fontSize: 14 }}> /100</span></span>
        </div>
        {weights !== 100 && <div className="callout warn" style={{ marginBottom: 10 }}>Weights sum to {weights}%, not 100%.</div>}
        {editing ? (
          <ListEditor<ScoreCriterion>
            path="scoring"
            addLabel="Add criterion"
            blank={{ criterion: "", weight: 0, score: null, note: "" }}
            cols={[
              { key: "criterion", label: "Criterion" },
              { key: "weight", label: "Weight %", type: "number", width: "80px" },
              { key: "score", label: "Score", type: "number", width: "70px" },
              { key: "note", label: "Note" },
            ]}
          />
        ) : (
          <div className="stack-v" style={{ gap: 8 }}>
            {s.scoring.map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr 34px", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13 }}>{c.criterion}</div>
                  <div className="eyebrow" style={{ fontSize: 9.5 }}>{c.weight}% weight</div>
                </div>
                <div>
                  <div className="row" style={{ gap: 3, flexWrap: "nowrap" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        aria-label={`Score ${n}`}
                        onClick={() => set("scoring", s.scoring.map((x, j) => (j === i ? { ...x, score: x.score === n ? null : n } : x)))}
                        style={{
                          flex: 1, height: 10, borderRadius: 2,
                          background: c.score != null && n <= c.score ? "var(--signal)" : "var(--line)",
                        }}
                      />
                    ))}
                  </div>
                  {c.note && <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{c.note}</div>}
                </div>
                <div className="num" style={{ textAlign: "right" }}>{c.score ?? "—"}</div>
              </div>
            ))}
            {s.notionScore != null && (
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Notion algorithm score: <span className="num">{s.notionScore}</span></div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="eyebrow">DD checklist</span>
          <Meter value={dd.total ? (dd.done / dd.total) * 100 : 0} label={`${dd.done}/${dd.total}`} />
        </div>
        {editing ? (
          <ListEditor<DDItem>
            path="dd"
            addLabel="Add item"
            blank={{ area: "Other", item: "", status: "To do", note: "" }}
            cols={[
              { key: "area", label: "Area", width: "90px" },
              { key: "item", label: "Item" },
              { key: "status", label: "Status", type: "select", options: DD_STATUSES, width: "120px" },
              { key: "note", label: "Note" },
            ]}
          />
        ) : (
          <div className="stack-v" style={{ gap: 12 }}>
            {areas.map((a) => (
              <div key={a}>
                <div className="eyebrow" style={{ marginBottom: 4 }}>{a}</div>
                {s.dd.map((d, i) =>
                  d.area !== a ? null : (
                    <div key={i} className="row" style={{ flexWrap: "nowrap", padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                      <select
                        className="select"
                        value={d.status}
                        aria-label={`Status of ${d.item}`}
                        onChange={(e) => set("dd", s.dd.map((x, j) => (j === i ? { ...x, status: e.target.value } : x)))}
                        style={{ width: 118, padding: "3px 22px 3px 7px", fontSize: 12, color: DD_COLOR[d.status] }}
                      >
                        {DD_STATUSES.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13 }}>{d.item}</div>
                        {d.note && <div className="muted" style={{ fontSize: 11.5 }}>{d.note}</div>}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Documents() {
  return (
    <Section id="documents" n={10} title="Documents">
      <DocumentsBody />
    </Section>
  );
}

function DocumentsBody() {
  const { s } = useDossier();
  const editing = useEditing();
  if (editing)
    return (
      <ListEditor<DocumentLink>
        path="documents"
        addLabel="Add document"
        blank={{ name: "", kind: "Other", url: "", addedAt: today() }}
        cols={[
          { key: "name", label: "Name" },
          { key: "kind", label: "Type", type: "select", options: ["Deck", "Data room", "Financials", "Drive", "Memo", "Other"], width: "120px" },
          { key: "url", label: "URL" },
          { key: "addedAt", label: "Added", type: "date", width: "140px" },
        ]}
      />
    );
  if (!s.documents.length) return <div className="field-value empty">No documents linked yet — add the deck, data room and Drive folder.</div>;
  return (
    <div className="cards">
      {s.documents.map((d, i) => (
        <a key={i} className="card" href={d.url} target="_blank" rel="noreferrer">
          <div className="eyebrow" style={{ color: "var(--signal)" }}>{d.kind}</div>
          <h4 style={{ marginTop: 4 }}>{d.name} ↗</h4>
          <div className="muted" style={{ fontSize: 12 }}>Added {date(d.addedAt)}</div>
        </a>
      ))}
    </div>
  );
}

// ---------- notes & call capture ----------

const QUICK: { path: string; label: string; money?: boolean }[] = [
  { path: "traction.arr", label: "ARR", money: true },
  { path: "traction.customers", label: "Customers" },
  { path: "traction.growthMoM", label: "MoM growth %" },
  { path: "traction.burn", label: "Monthly burn", money: true },
  { path: "traction.runwayMonths", label: "Runway (mo)" },
  { path: "round.raising", label: "Raising", money: true },
  { path: "round.preMoney", label: "Pre-money", money: true },
  { path: "round.committed", label: "Committed", money: true },
];

function Notes({ onToast }: { onToast: (m: string) => void }) {
  const { s } = useDossier();
  const { update } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: today(), kind: "Call" as NoteEntry["kind"], title: "", author: s.owner, body: "", lead: "" });
  const [facts, setFacts] = useState<Record<string, string>>({});
  const comp = completeness(s);

  const askNext = [...s.thesis.openQuestions, ...comp.missing.map((m) => m.ask)].slice(0, 10);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const at = new Date().toISOString();
    const changed: string[] = [];
    update(s.id, (cur) => {
      let next = cur;
      const prov = { ...cur.provenance };
      for (const q of QUICK) {
        const raw = facts[q.path];
        if (raw == null || raw.trim() === "") continue;
        next = setPath(next, q.path, Number(raw));
        prov[q.path] = { source: "call", confidence: "reported", at };
        changed.push(q.label);
      }
      if (form.lead.trim()) {
        next = setPath(next, "round.lead", form.lead.trim());
        prov["round.lead"] = { source: "call", confidence: "reported", at };
        changed.push("Lead");
      }
      const factLine = changed.length ? `\n\nUpdated from this ${form.kind.toLowerCase()}: ${changed.join(", ")}.` : "";
      const note: NoteEntry = {
        id: crypto.randomUUID(),
        date: form.date,
        kind: form.kind,
        author: form.author,
        title: form.title || `${form.kind} — ${date(form.date)}`,
        body: form.body + factLine,
      };
      return {
        ...next,
        provenance: prov,
        notes: [note, ...cur.notes],
        lastContact: form.date > (cur.lastContact || "") ? form.date : cur.lastContact,
      };
    });
    onToast(changed.length ? `Logged. Dossier updated: ${changed.join(", ")}.` : "Logged to timeline.");
    setForm({ ...form, title: "", body: "", lead: "" });
    setFacts({});
    setOpen(false);
  }

  const sorted = [...s.notes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <Section
      id="notes"
      n={11}
      title="Notes & calls"
      editable={false}
      aside={<button className="btn small primary" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "+ Log call / note"}</button>}
    >
      {open && (
        <form onSubmit={submit} className="card" style={{ marginBottom: 16 }}>
          <div className="fields three">
            <label className="field"><span className="eyebrow">Date</span>
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label className="field"><span className="eyebrow">Type</span>
              <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as NoteEntry["kind"] })}>
                {["Call", "Meeting", "Email", "Note"].map((k) => <option key={k}>{k}</option>)}
              </select></label>
            <label className="field"><span className="eyebrow">Author</span>
              <input className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></label>
            <label className="field wide"><span className="eyebrow">Title</span>
              <input className="input" placeholder="e.g. Second call with CEO" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className="field wide"><span className="eyebrow">Notes</span>
              <textarea className="textarea" style={{ minHeight: 120 }} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
          </div>
          <div className="eyebrow" style={{ margin: "14px 0 8px" }}>Facts heard on the call · fill only what changed — they update the dossier, tagged “Founder call”</div>
          <div className="fields" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {QUICK.map((q) => (
              <label key={q.path} className="field"><span className="eyebrow" style={{ fontSize: 9.5 }}>{q.label}</span>
                <input className="input" type="number" step="any" placeholder={q.money ? "USD" : ""} value={facts[q.path] ?? ""}
                  onChange={(e) => setFacts({ ...facts, [q.path]: e.target.value })} /></label>
            ))}
            <label className="field"><span className="eyebrow" style={{ fontSize: 9.5 }}>Lead investor</span>
              <input className="input" value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} /></label>
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary">Save to timeline</button>
          </div>
        </form>
      )}

      <div className="grid g-main">
        <div className="timeline">
          {sorted.map((n) => (
            <div key={n.id} className="tl-item">
              <div className="num muted" style={{ fontSize: 11.5, paddingTop: 2 }}>{date(n.date)}</div>
              <div className="tl-rail"><span className="dot" style={{ color: n.kind === "Import" ? "var(--c-reported)" : "var(--signal)" }} /></div>
              <div className="tl-body">
                <details className="tl-note">
                  <summary>
                    <span className="tl-chevron" aria-hidden>›</span>
                    <span className="tag" style={{ color: n.kind === "Import" ? "var(--c-reported)" : "var(--signal)" }}>{n.kind}</span>
                    <h4 style={{ margin: 0 }}>{n.title}</h4>
                  </summary>
                  {n.author && <div className="eyebrow" style={{ marginTop: 3, marginBottom: 4 }}>{n.author}</div>}
                  {n.body && <p>{n.body}</p>}
                </details>
                {n.body && (
                  <p
                    className="tl-preview"
                    onClick={(e) => ((e.currentTarget.previousElementSibling as HTMLDetailsElement).open = true)}
                  >
                    {n.body}
                  </p>
                )}
              </div>
            </div>
          ))}
          {!sorted.length && <div className="field-value empty">No notes yet.</div>}
        </div>
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="eyebrow" style={{ color: "var(--signal)", marginBottom: 4 }}>Prep for next call</div>
          <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
            Built from open questions and the {comp.missing.length} empty fields in this dossier ({TRACKED_FIELDS.length} tracked).
          </p>
          {askNext.length ? (
            <ul className="list-plain ask">
              {askNext.map((q, i) => <li key={i} style={{ fontSize: 12.5 }}>{q}</li>)}
            </ul>
          ) : (
            <div className="muted">Dossier complete.</div>
          )}
        </div>
      </div>
    </Section>
  );
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { getPath, isFilled } from "@/lib/model";
import { date, money, num, pct } from "@/lib/format";
import type { Provenance, Startup } from "@/lib/types";
import { ProvTag } from "./bits";

// ---------- context ----------

interface DossierApi {
  s: Startup;
  set: (path: string, value: unknown, prov?: Partial<Provenance>) => void;
  /** Whole-dossier update, for edits that touch several paths at once (e.g. removing a product). */
  replace: (fn: (s: Startup) => Startup) => void;
}
const DossierCtx = createContext<DossierApi | null>(null);
export const DossierProvider = DossierCtx.Provider;
export function useDossier() {
  const c = useContext(DossierCtx);
  if (!c) throw new Error("useDossier outside provider");
  return c;
}

const EditCtx = createContext(false);
export const useEditing = () => useContext(EditCtx);

// ---------- section ----------

export function Section({
  id,
  n,
  title,
  aside,
  children,
  editable = true,
}: {
  id: string;
  n: number;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <section id={id} className="panel section">
      <div className="panel-head">
        <h2 className="panel-title">
          <span className="section-num">{String(n).padStart(2, "0")}</span>
          {title}
        </h2>
        <div className="row">
          {aside}
          {editable && (
            <button className={`btn small ${editing ? "primary" : ""}`} onClick={() => setEditing((e) => !e)}>
              {editing ? "Done" : "Edit"}
            </button>
          )}
        </div>
      </div>
      <EditCtx.Provider value={editing}>{children}</EditCtx.Provider>
    </section>
  );
}

// ---------- scalar field ----------

export type FieldType = "text" | "long" | "money" | "number" | "pct" | "date" | "month" | "url" | "tags" | "select";

export function Field({
  path,
  label,
  type = "text",
  options,
  wide,
  big,
  placeholder,
}: {
  path: string;
  label: string;
  type?: FieldType;
  options?: readonly string[];
  wide?: boolean;
  big?: boolean;
  placeholder?: string;
}) {
  const { s, set } = useDossier();
  const editing = useEditing();
  const v = getPath(s, path);
  const prov = s.provenance[path];

  let control: ReactNode;
  if (editing) {
    const numeric = type === "money" || type === "number" || type === "pct";
    if (type === "long") {
      control = (
        <textarea className="textarea" value={(v as string) ?? ""} placeholder={placeholder} onChange={(e) => set(path, e.target.value)} />
      );
    } else if (type === "select") {
      control = (
        <select className="select" value={(v as string) ?? ""} onChange={(e) => set(path, e.target.value)}>
          <option value="">—</option>
          {options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    } else if (type === "tags") {
      control = (
        <input
          className="input"
          defaultValue={((v as string[]) ?? []).join(", ")}
          placeholder="Comma separated"
          onBlur={(e) => set(path, e.target.value.split(",").map((x) => x.trim()).filter(Boolean))}
        />
      );
    } else {
      control = (
        <input
          className="input"
          type={numeric ? "number" : type === "date" ? "date" : type === "month" ? "month" : type === "url" ? "url" : "text"}
          step="any"
          value={v == null ? "" : String(v)}
          placeholder={placeholder ?? (type === "money" ? "USD" : undefined)}
          onChange={(e) => {
            const raw = e.target.value;
            set(path, numeric ? (raw === "" ? null : Number(raw)) : raw);
          }}
        />
      );
    }
  } else {
    control = <div className={`field-value ${big ? "big" : ""} ${isFilled(v) ? "" : "empty"}`}>{display(v, type)}</div>;
  }

  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <div className="field-label">
        <span className="eyebrow">{label}</span>
        <ProvTag p={prov} />
      </div>
      {control}
    </div>
  );
}

function display(v: unknown, type: FieldType): ReactNode {
  if (!isFilled(v)) return "Not captured yet";
  switch (type) {
    case "money": return money(v as number);
    case "number": return num(v as number);
    case "pct": return pct(v as number, Number.isInteger(v) ? 0 : 1);
    case "date":
    case "month": return date(v as string);
    case "url":
      return (
        <a href={v as string} target="_blank" rel="noreferrer">
          {(v as string).replace(/^https?:\/\//, "")}
        </a>
      );
    case "tags": return (v as string[]).join(", ");
    default: return String(v);
  }
}

// ---------- list editor ----------

export interface Col<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "long" | "number" | "select" | "bool" | "date" | "url";
  options?: readonly string[];
  width?: string;
}

export function ListEditor<T extends object>({
  path,
  cols,
  blank,
  addLabel = "Add row",
}: {
  path: string;
  cols: Col<T>[];
  blank: T;
  addLabel?: string;
}) {
  const { s, set } = useDossier();
  const rows = (getPath(s, path) as T[]) ?? [];
  const update = (i: number, k: keyof T, val: unknown) =>
    set(path, rows.map((r, j) => (j === i ? { ...r, [k]: val } : r)));

  return (
    <div className="table-wrap">
      <table className="edit-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} className="eyebrow" style={{ width: c.width }}>
                {c.label}
              </th>
            ))}
            <th style={{ width: 70 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => {
                const val = r[c.key] as unknown;
                if (c.type === "select")
                  return (
                    <td key={c.key}>
                      <select className="select" value={String(val ?? "")} onChange={(e) => update(i, c.key, e.target.value)}>
                        {c.options?.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </td>
                  );
                if (c.type === "bool")
                  return (
                    <td key={c.key} style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={Boolean(val)} onChange={(e) => update(i, c.key, e.target.checked)} />
                    </td>
                  );
                if (c.type === "long")
                  return (
                    <td key={c.key}>
                      <textarea className="input" rows={2} value={String(val ?? "")} onChange={(e) => update(i, c.key, e.target.value)} />
                    </td>
                  );
                return (
                  <td key={c.key}>
                    <input
                      className="input"
                      type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"}
                      step="any"
                      value={val == null ? "" : String(val)}
                      onChange={(e) =>
                        update(i, c.key, c.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)
                      }
                    />
                  </td>
                );
              })}
              <td>
                <div className="row" style={{ flexWrap: "nowrap", gap: 2 }}>
                  <button className="btn ghost small" disabled={i === 0} aria-label="Move up"
                    onClick={() => set(path, swap(rows, i, i - 1))}>↑</button>
                  <button className="btn ghost small danger" aria-label="Remove"
                    onClick={() => set(path, rows.filter((_, j) => j !== i))}>✕</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn small" style={{ marginTop: 8 }} onClick={() => set(path, [...rows, { ...blank }])}>
        + {addLabel}
      </button>
    </div>
  );
}

function swap<T>(a: T[], i: number, j: number) {
  const c = [...a];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

/** Editable list of strings (strengths, risks, questions). */
export function StringList({ path, kind, empty }: { path: string; kind: "good" | "bad" | "ask" | "plain"; empty: string }) {
  const { s, set } = useDossier();
  const editing = useEditing();
  const items = (getPath(s, path) as string[]) ?? [];
  if (editing)
    return (
      <textarea
        className="textarea"
        defaultValue={items.join("\n")}
        placeholder="One item per line"
        onBlur={(e) => set(path, e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))}
      />
    );
  if (!items.length) return <div className="field-value empty">{empty}</div>;
  return (
    <ul className={`list-plain ${kind}`}>
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

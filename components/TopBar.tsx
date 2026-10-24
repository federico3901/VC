"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <path d="M17.5 19H8a5.5 5.5 0 1 1 1.6-10.76A6 6 0 0 1 21 11.5a4 4 0 0 1-3.5 7.5Z" />
    </svg>
  );
}

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/companies", label: "Companies" },
  { href: "/import", label: "Notion sync" },
];

export function TopBar() {
  const path = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("topline.theme", next);
    } catch {}
  }

  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const onLogin = path === "/login";

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <BrandMark />
        <span className="brand-name">Topline Intake</span>
        <span className="brand-tag">Sample</span>
      </Link>
      {!onLogin && (
        <nav className="nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="spacer" />
      {!onLogin && (
        <button className="btn ghost small" onClick={logout}>
          Log out
        </button>
      )}
      <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
        {theme === "dark" ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        )}
      </button>
    </header>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { THEME_KEY, THEME_META as META, type ThemeName } from "../lib/theme";

const THEMES: { id: ThemeName; label: string; short: string }[] = [
  { id: "dark", label: "Dark theme", short: "Dark" },
  { id: "light", label: "Light theme", short: "Light" },
  { id: "high-contrast", label: "High-contrast theme", short: "Contrast" },
];
const EVENT = "sa-theme-change";

function current(): ThemeName {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" || t === "high-contrast" ? t : "dark";
}

function apply(t: ThemeName, persist: boolean) {
  document.documentElement.setAttribute("data-theme", t);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", META[t]));
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* private mode */
    }
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: t }));
}

function Glyph({ id }: { id: ThemeName }) {
  const p = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (id === "dark")
    return (
      <svg {...p}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  if (id === "light")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
      </svg>
    );
  return (
    <svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" />
    </svg>
  );
}

export function ThemeSwitcher({ className = "", showLabels = false }: { className?: string; showLabels?: boolean }) {
  const [theme, setTheme] = useState<ThemeName | null>(null);
  const labelId = useId();

  useEffect(() => {
    setTheme(current());
    const onChange = (e: Event) => setTheme((e as CustomEvent<ThemeName>).detail);
    window.addEventListener(EVENT, onChange);
    const mqs = [window.matchMedia("(prefers-color-scheme: light)"), window.matchMedia("(prefers-contrast: more)")];
    const onSystem = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(THEME_KEY);
      } catch {
        /* ignore */
      }
      if (saved) return;
      apply(mqs[1].matches ? "high-contrast" : mqs[0].matches ? "light" : "dark", false);
    };
    mqs.forEach((m) => m.addEventListener("change", onSystem));
    return () => {
      window.removeEventListener(EVENT, onChange);
      mqs.forEach((m) => m.removeEventListener("change", onSystem));
    };
  }, []);

  const choose = (t: ThemeName) => {
    setTheme(t);
    apply(t, true);
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = THEMES.findIndex((t) => t.id === (theme ?? "dark"));
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % THEMES.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + THEMES.length) % THEMES.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = THEMES.length - 1;
    if (n < 0) return;
    e.preventDefault();
    choose(THEMES[n].id);
    const btn = e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[n];
    btn?.focus();
  };

  return (
    <div
      className={`theme-switch${showLabels ? " has-labels" : ""} ${className}`.trim()}
      role="radiogroup"
      aria-labelledby={labelId}
      onKeyDown={onKey}
    >
      <span id={labelId} className="sr-only">
        Color theme
      </span>
      {THEMES.map((t) => {
        const on = (theme ?? "dark") === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={theme === null ? undefined : on}
            aria-label={t.label}
            title={t.label}
            tabIndex={on ? 0 : -1}
            className={on && theme !== null ? "is-on" : undefined}
            data-theme-option={t.id}
            onClick={() => choose(t.id)}
          >
            <Glyph id={t.id} />
            {showLabels ? <span>{t.short}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

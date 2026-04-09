"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const nextTheme = getPreferredTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      aria-label={mounted ? `Switch to ${theme === "light" ? "dark" : "light"} mode` : "Toggle theme"}
      className="theme-toggle"
      onClick={toggleTheme}
      title={mounted ? `Switch to ${theme === "light" ? "dark" : "light"} mode` : "Toggle theme"}
      type="button"
    >
      <span aria-hidden="true" className="theme-toggle-icon">
        {mounted && theme === "dark" ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" fill="currentColor" r="4.2" />
      <path
        d="M12 2.8v2.1M12 19.1v2.1M21.2 12h-2.1M4.9 12H2.8M18.5 5.5 17 7M7 17l-1.5 1.5M18.5 18.5 17 17M7 7 5.5 5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M19.5 12.6A7.5 7.5 0 1 1 11.4 4.5 6 6 0 1 0 19.5 12.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

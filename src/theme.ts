import { useEffect, useLayoutEffect, useState } from "react";
import type { Accent, Theme } from "./store";

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function resolve(theme: Theme): "light" | "dark" {
  return theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
}

// Toggles the .dark class + color-scheme on <html> and tracks the resolved light/dark value, following
// the OS preference live while the user is on "system".
export function useApplyTheme(theme: Theme): "light" | "dark" {
  const [effective, setEffective] = useState(() => resolve(theme));

  useEffect(() => {
    setEffective(resolve(theme));
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setEffective(resolve("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", effective === "dark");
    root.style.colorScheme = effective;
  }, [effective]);

  return effective;
}

// Accent = hue + chroma per theme; rgb triple mirrors it for the canvas constellation (oklch unsafe there).
export const accents: Record<Accent, { label: string; light: string; dark: string; rgb: string }> = {
  coral: { label: "Coral", light: "oklch(0.62 0.14 42)", dark: "oklch(0.72 0.13 45)", rgb: "232 135 97" },
  sage: { label: "Sage", light: "oklch(0.56 0.09 150)", dark: "oklch(0.72 0.09 150)", rgb: "123 181 135" },
  sky: { label: "Sky", light: "oklch(0.56 0.11 240)", dark: "oklch(0.72 0.1 240)", rgb: "103 173 221" },
  plum: { label: "Plum", light: "oklch(0.56 0.12 330)", dark: "oklch(0.72 0.11 330)", rgb: "204 139 197" },
  amber: { label: "Amber", light: "oklch(0.6 0.12 70)", dark: "oklch(0.74 0.12 70)", rgb: "212 150 72" },
};

const accentVars = ["--primary", "--ring", "--chart-1", "--sidebar-primary", "--sidebar-ring"];

// Coral is the stylesheet default, so it clears the overrides instead of duplicating them.
// Layout effect so the vars exist before child canvases read them in their (passive) mount effects.
export function useApplyAccent(accent: Accent, effective: "light" | "dark") {
  useLayoutEffect(() => {
    const style = document.documentElement.style;
    const a = accents[accent] ?? accents.coral;
    for (const v of accentVars) {
      if (accent === "coral") style.removeProperty(v);
      else style.setProperty(v, a[effective]);
    }
    if (accent === "coral") style.removeProperty("--star-rgb");
    else style.setProperty("--star-rgb", a.rgb);
  }, [accent, effective]);
}

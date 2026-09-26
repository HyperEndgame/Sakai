import { useEffect, useLayoutEffect, useState } from "react";
import type { Accent, Theme } from "./store";
import { flushSync } from "react-dom";
import { syncSystemBars } from "./notify";

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

// Toggles the .dark class + color-scheme on <html> and returns the resolved light/dark value, following
// the OS preference live while the user is on "system". Derived (not effect-set) so the class flips
// in the same commit as the state change — no frame of mixed themes.
export function useApplyTheme(theme: Theme): "light" | "dark" {
  const [sysDark, setSysDark] = useState(systemPrefersDark);
  const effective = theme === "system" ? (sysDark ? "dark" : "light") : theme;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSysDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", effective === "dark");
    root.style.colorScheme = effective;
  }, [effective]);

  // bars tween natively over the same 320 ms as the page crossfade (fadeTheme)
  useEffect(() => {
    syncSystemBars(effective, document.documentElement.classList.contains("theme-swap") ? 320 : 0);
  }, [effective]);

  return effective;
}

// Runs a theme/accent change as one GPU crossfade instead of every element easing its own colors.
export function fadeTheme(change: () => void) {
  const doc = document as any;
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return change();
  const root = document.documentElement;
  root.classList.add("theme-swap");
  const t = doc.startViewTransition(() => flushSync(change));
  t.finished.finally(() => root.classList.remove("theme-swap"));
}

// Accent = hue + chroma per theme; rgb triple mirrors it for the canvas constellation (oklch unsafe there).
export const accents: Record<Accent, { label: string; light: string; dark: string; rgb: string }> = {
  coral: { label: "Coral", light: "oklch(0.62 0.14 42)", dark: "oklch(0.72 0.13 45)", rgb: "232 135 97" },
  // ponytail: ids kept from v0.8 so saved choices still resolve; hues retuned to sit with cream/charcoal
  sage: { label: "Moss", light: "oklch(0.55 0.07 140)", dark: "oklch(0.74 0.07 140)", rgb: "148 182 140" },
  sky: { label: "Slate", light: "oklch(0.53 0.06 245)", dark: "oklch(0.74 0.06 245)", rgb: "139 175 207" },
  plum: { label: "Rose", light: "oklch(0.58 0.1 10)", dark: "oklch(0.74 0.09 10)", rgb: "221 147 158" },
  amber: { label: "Ochre", light: "oklch(0.6 0.1 75)", dark: "oklch(0.76 0.1 75)", rgb: "214 168 102" },
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

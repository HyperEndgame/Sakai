import { useEffect, useLayoutEffect, useState } from "react";
import type { Accent, Theme } from "./store";
import { syncSystemBars } from "./notify";

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
    syncSystemBars(effective);
  }, [effective]);

  return effective;
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

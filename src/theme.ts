import { useEffect, useState } from "react";
import type { Theme } from "./store";

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function resolve(theme: Theme): "light" | "dark" {
  return theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
}

// Applies data-theme to <html> and tracks the resolved light/dark value, following
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
    document.documentElement.dataset.theme = effective;
  }, [effective]);

  return effective;
}

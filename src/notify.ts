import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { State } from "./store";

// Kotlin foreground service (android/.../DashboardBridge.kt + DashboardService.kt) — survives
// the app being killed, unlike a plain LocalNotifications entry.
interface DashboardBridgePlugin {
  save(opts: { title: string; body: string }): Promise<void>;
  setBars(opts: { light: boolean }): Promise<void>;
  lastCrash(): Promise<{ crash: string }>;
}
const DashboardBridge = registerPlugin<DashboardBridgePlugin>("DashboardBridge");

// Pulls a native crash saved by MainActivity into the web error log (Settings → Data).
export async function nativeCrash(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return "";
  return (await DashboardBridge.lastCrash().catch(() => ({ crash: "" }))).crash;
}

// Status/nav bar icons follow the theme (the bars themselves are transparent; the page shows through).
export function syncSystemBars(effective: "light" | "dark") {
  if (!Capacitor.isNativePlatform()) return;
  DashboardBridge.setBars({ light: effective === "light" }).catch(() => {});
}

export async function updateDashboardNotification(state: State) {
  if (!Capacitor.isNativePlatform()) return;
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return;
  const top = state.briefing?.topAction ?? state.tasks.find((t) => !t.done)?.title ?? "All clear";
  const upcoming = state.tasks
    .filter((t) => !t.done && t.due)
    .sort((a, b) => a.due!.localeCompare(b.due!))
    .slice(0, 3)
    .map((t) => `${t.title} — ${t.due}`)
    .join("\n");
  const body = upcoming || "No upcoming deadlines";
  try {
    await DashboardBridge.save({ title: `Sakai · ${top}`, body });
  } catch {
    // custom plugin unavailable (e.g. old build without cap sync) — fall back to a dismissible one
    await LocalNotifications.schedule({
      notifications: [{ id: 1, title: `Sakai · ${top}`, body, ongoing: true, autoCancel: false }],
    });
  }
}

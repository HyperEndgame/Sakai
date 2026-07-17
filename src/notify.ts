import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { State } from "./store";

// Kotlin foreground service (android/.../DashboardBridge.kt + DashboardService.kt) — survives
// the app being killed, unlike a plain LocalNotifications entry.
interface DashboardBridgePlugin {
  save(opts: { title: string; body: string }): Promise<void>;
}
const DashboardBridge = registerPlugin<DashboardBridgePlugin>("DashboardBridge");

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

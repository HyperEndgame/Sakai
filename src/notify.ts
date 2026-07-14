import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { State } from "./store";

// ponytail: ongoing local notification; upgrade to a Kotlin foreground service if Android kills it
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
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 1,
        title: `Sakai · ${top}`,
        body: upcoming || "No upcoming deadlines",
        ongoing: true,
        autoCancel: false,
      },
    ],
  });
}

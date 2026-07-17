import { Capacitor, CapacitorHttp } from "@capacitor/core";
import type { Action, State, Task } from "./store";
import { autoQuadrant, uid } from "./store";

// CapacitorHttp dodges CORS on-device; plain fetch on web (Canvas/GCal ICS may
// need the APK build — browsers block cross-origin calendar feeds)
async function get(url: string, headers: Record<string, string> = {}): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.get({ url, headers });
    if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
    return typeof r.data === "string" ? r.data : JSON.stringify(r.data);
  }
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

interface IcsEvent {
  title: string;
  date?: string; // YYYY-MM-DD
}

// ponytail: regex ICS parse covers SUMMARY/DTSTART/DUE; swap for ical.js if feeds get exotic
export function parseIcs(text: string): IcsEvent[] {
  // strip only the CRLF of a fold, keep the leading space/tab so wrapped words don't glue together
  const unfolded = text.replace(/\r?\n(?=[ \t])/g, "");
  const events: IcsEvent[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const title = /SUMMARY[^:]*:(.+)/.exec(body)?.[1]?.trim();
    const dt = /(?:DTSTART|DUE)[^:]*:(\d{8})/.exec(body)?.[1];
    if (!title) continue;
    const date = dt ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : undefined;
    events.push({ title, date });
  }
  return events;
}

function importEvents(
  events: IcsEvent[],
  source: string,
  area: Task["area"],
  state: State,
  dispatch: (a: Action) => void,
): number {
  const existing = new Set(state.tasks.map((t) => `${t.source}|${t.title}`));
  const today = new Date().toISOString().slice(0, 10);
  let added = 0;
  for (const e of events) {
    if (e.date && e.date < today) continue; // skip past events
    if (existing.has(`${source}|${e.title}`)) continue;
    dispatch({
      type: "add-task",
      task: {
        id: uid(),
        title: e.title,
        area,
        due: e.date,
        quadrant: autoQuadrant(e.date, area),
        done: false,
        createdAt: new Date().toISOString(),
        source,
      },
    });
    added++;
  }
  return added;
}

export async function syncCanvas(state: State, dispatch: (a: Action) => void): Promise<string> {
  const events = parseIcs(await get(state.integrations.canvasIcs));
  const n = importEvents(events, "canvas", "school", state, dispatch);
  return `Imported ${n} new assignment${n === 1 ? "" : "s"} (${events.length} in feed).`;
}

export async function syncGcal(state: State, dispatch: (a: Action) => void): Promise<string> {
  const events = parseIcs(await get(state.integrations.gcalIcs));
  const n = importEvents(events, "gcal", "personal", state, dispatch);
  return `Imported ${n} new event${n === 1 ? "" : "s"} (${events.length} in feed).`;
}

export async function syncGithub(state: State): Promise<string> {
  const { githubUser, githubToken } = state.integrations;
  const headers: Record<string, string> = { accept: "application/vnd.github+json" };
  if (githubToken) headers.authorization = `Bearer ${githubToken}`;
  // /user/repos (with token) includes private repos; the public listing can't see them
  const reposUrl = githubToken
    ? "https://api.github.com/user/repos?sort=pushed&per_page=50"
    : `https://api.github.com/users/${githubUser}/repos?sort=pushed&per_page=50`;
  const repos: any[] = JSON.parse(await get(reposUrl, headers));
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const recent = repos.filter((r) => r.pushed_at > since).slice(0, 10);
  let commits = 0;
  for (const r of recent) {
    const list: any[] = JSON.parse(
      await get(`https://api.github.com/repos/${r.full_name}/commits?since=${since}&per_page=100`, headers),
    );
    commits += list.length;
  }
  const note = !githubToken && commits === 0 ? " Private repos need a token." : "";
  return `Last 7 days: ${commits} commits across ${recent.length} repo${recent.length === 1 ? "" : "s"}.${note}`;
}

if (import.meta.env.DEV) {
  // ponytail: inline self-check for the ICS parser
  const sample =
    "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Essay\r\n due Aug 10\r\nDTSTART;VALUE=DATE:20260810\r\nEND:VEVENT\r\nEND:VCALENDAR";
  const parsed = parseIcs(sample);
  console.assert(parsed.length === 1 && parsed[0].title === "Essay due Aug 10" && parsed[0].date === "2026-08-10", "parseIcs broken", parsed);
}

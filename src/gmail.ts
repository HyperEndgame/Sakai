import type { Action, State } from "./store";
import { autoQuadrant, uid } from "./store";

declare global {
  interface Window {
    google?: any;
  }
}

// ponytail: loads Google Identity Services on demand instead of a static <script> tag
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(s);
  });
}

function getToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      callback: (resp: any) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}

async function gmailFetch(url: string, token: string): Promise<any> {
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Gmail API ${r.status}`);
  return r.json();
}

interface Extracted {
  title: string;
  due?: string;
}

async function extractActions(state: State, digest: string): Promise<Extracted[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": state.apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: state.model,
      max_tokens: 1024,
      system:
        "Extract real action items and deadlines from these email subjects/snippets. Skip newsletters, receipts, and noise. Respond with ONLY a JSON array (no prose): " +
        '[{"title": "short action", "due": "YYYY-MM-DD or omit"}]. Empty array if nothing actionable.',
      messages: [{ role: "user", content: digest }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const data = await res.json();
  const text = data.content.find((c: any) => c.type === "text")?.text ?? "[]";
  const raw = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function syncGmail(state: State, dispatch: (a: Action) => void): Promise<string> {
  await loadGis();
  const token = state.integrations.gmailToken || (await getToken(state.integrations.gmailClientId));
  dispatch({ type: "integrations", patch: { gmailToken: token } });

  const list = await gmailFetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=newer_than:3d&maxResults=15",
    token,
  );
  const ids: string[] = (list.messages ?? []).map((m: any) => m.id);
  if (ids.length === 0) return "No recent emails found.";

  const msgs = await Promise.all(
    ids.map((id) =>
      gmailFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        token,
      ),
    ),
  );
  const digest = msgs
    .map((m) => {
      const h = (m.payload?.headers ?? []) as { name: string; value: string }[];
      const subj = h.find((x) => x.name === "Subject")?.value ?? "(no subject)";
      const from = h.find((x) => x.name === "From")?.value ?? "";
      return `- ${subj} — from ${from} — "${m.snippet ?? ""}"`;
    })
    .join("\n");

  const actions = await extractActions(state, digest);
  const existing = new Set(state.tasks.filter((t) => t.source === "gmail").map((t) => t.title));
  let added = 0;
  for (const a of actions) {
    if (existing.has(a.title)) continue;
    dispatch({
      type: "add-task",
      task: {
        id: uid(),
        title: a.title,
        area: "personal",
        due: a.due,
        quadrant: autoQuadrant(a.due, "personal"),
        done: false,
        createdAt: new Date().toISOString(),
        source: "gmail",
      },
    });
    added++;
  }
  return `Scanned ${ids.length} emails, found ${actions.length} action item${actions.length === 1 ? "" : "s"}, added ${added} new task${added === 1 ? "" : "s"}.`;
}

import { Capacitor, CapacitorHttp } from "@capacitor/core";
import type { Action, State, Story, Task } from "./store";
import { autoQuadrant, uid } from "./store";

const API = "https://api.anthropic.com/v1/messages";

// Settings key wins; falls back to the key baked in at build time (.env)
export function apiKey(state: State): string {
  return state.apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY || "";
}

const free = (state: State) => state.provider === "freellmapi";

// True when the chosen provider has what it needs to make a call.
export function aiReady(state: State): boolean {
  return free(state) ? !!(state.llmBase.trim() && state.llmKey.trim()) : !!apiKey(state);
}

export const aiMissing = "Add your AI key in Settings → AI & keys first.";

const routerBase = (state: State) => state.llmBase.trim().replace(/\/+$/, "").replace(/\/v1$/, "");

// Anthropic Messages body → OpenAI chat-completions body (FreeLLMAPI's universal surface).
function toOpenAI(body: any): any {
  const messages: any[] = body.system ? [{ role: "system", content: body.system }] : [];
  for (const m of body.messages) {
    if (typeof m.content === "string") {
      messages.push({ role: m.role, content: m.content });
    } else if (m.role === "assistant") {
      const text = m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
      const calls = m.content
        .filter((c: any) => c.type === "tool_use")
        .map((c: any) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.input) } }));
      messages.push({ role: "assistant", content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
    } else {
      for (const c of m.content) {
        if (c.type === "tool_result") messages.push({ role: "tool", tool_call_id: c.tool_use_id, content: String(c.content) });
        else if (c.type === "text") messages.push({ role: "user", content: c.text });
      }
    }
  }
  const tools = body.tools?.map((t: any) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  return { model: body.model, max_tokens: body.max_tokens, messages, ...(tools?.length ? { tools } : {}) };
}

// OpenAI chat-completions response → Anthropic shape, so chat/tool loops stay provider-agnostic.
function fromOpenAI(data: any): any {
  const msg = data.choices?.[0]?.message ?? {};
  const content: any[] = msg.content ? [{ type: "text", text: msg.content }] : [];
  for (const c of msg.tool_calls ?? []) {
    let input = {};
    try {
      input = JSON.parse(c.function.arguments || "{}");
    } catch {}
    content.push({ type: "tool_use", id: c.id, name: c.function.name, input });
  }
  return { content, stop_reason: msg.tool_calls?.length ? "tool_use" : "end_turn" };
}

function errMessage(data: any): string {
  if (typeof data === "string") {
    try {
      return JSON.parse(data).error.message;
    } catch {
      return data.slice(0, 200);
    }
  }
  return data?.error?.message ?? JSON.stringify(data);
}

async function callRouter(state: State, body: object): Promise<any> {
  const url = `${routerBase(state)}/v1/chat/completions`;
  const headers = { "content-type": "application/json", authorization: `Bearer ${state.llmKey.trim()}` };
  const data = toOpenAI(body);
  // Android: native HTTP, since the router is usually plain http on the LAN (WebView blocks mixed content / CORS)
  const res = Capacitor.isNativePlatform()
    ? await CapacitorHttp.post({ url, headers, data, connectTimeout: 15000, readTimeout: 90000 })
    : await fetch(url, { method: "POST", headers, body: JSON.stringify(data) }).then(async (r) => ({ status: r.status, data: await r.text() }));
  if (res.status >= 400) throw new Error(`FreeLLMAPI ${res.status}: ${errMessage(res.data)}`);
  return fromOpenAI(typeof res.data === "string" ? JSON.parse(res.data) : res.data);
}

// One call shape for both providers (Anthropic Messages); FreeLLMAPI is translated in callRouter.
// ponytail: BYOK direct-from-device calls; move behind a Supabase Edge Function when multi-user
export async function callClaude(state: State, body: object): Promise<any> {
  if (free(state)) return callRouter(state, { model: state.llmModel || "auto:smart", max_tokens: 1024, ...body });
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey(state),
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: state.model, max_tokens: 1024, ...body }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${errMessage(await res.text())}`);
  return res.json();
}

// Lists the router's models (OpenAI shape) so Settings can offer real ids.
export async function listFreeModels(state: State): Promise<string[]> {
  const url = `${routerBase(state)}/v1/models`;
  const headers = { authorization: `Bearer ${state.llmKey.trim()}` };
  const res = Capacitor.isNativePlatform()
    ? await CapacitorHttp.get({ url, headers, connectTimeout: 10000 })
    : await fetch(url, { headers }).then(async (r) => ({ status: r.status, data: await r.json() }));
  if (res.status >= 400) throw new Error(`FreeLLMAPI ${res.status}: ${errMessage(res.data)}`);
  const body = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  return (body.data ?? []).map((m: any) => m.id as string);
}

// Best fit for Sakai (tool calling + JSON) with the most free budget; router auto-pick as fallback.
export function pickFreeModel(ids: string[]): string {
  const prefs = [/gpt-oss-120b/i, /llama-3\.3-70b/i, /nemotron.*super/i, /glm-4\.7/i];
  for (const re of prefs) {
    const hit = ids.find((id) => re.test(id));
    if (hit) return hit;
  }
  return "auto:smart";
}

function summarize(state: State): string {
  const tasks = state.tasks
    .filter((t) => !t.done)
    .map((t) => `- [${t.id}] ${t.title} (area:${t.area}, quadrant:${t.quadrant}${t.due ? `, due:${t.due}` : ""})`)
    .join("\n");
  const goals = state.goals.map((g) => `- ${g.title} (${g.area}, ${g.progress}%)`).join("\n");
  const revenue = state.finances.reduce((s, f) => s + f.amount, 0);
  const p = state.profile;
  const about = [
    `Name: ${state.name}`,
    p.org && `School/work: ${p.org}${p.role ? ` (${p.role})` : ""}`,
    `Timezone: ${p.timezone}. Usually awake ${p.wake}-${p.sleep}`,
    `Tracks: ${p.areas.join(", ") || "everything"}`,
    p.about && `About: ${p.about}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `${about}\nToday: ${new Date().toDateString()}\nOpen tasks:\n${tasks || "none"}\nGoals:\n${goals || "none"}\nTotal logged revenue: $${revenue}\nUser interests: ${state.interests || "unknown"}`;
}

// Assistant identity + style from Settings, shared by briefing and chat.
function persona(state: State): string {
  const a = state.assistant;
  const tone = { warm: "Be warm and encouraging.", direct: "Be direct and no-nonsense.", playful: "Be light and playful." }[a.tone];
  const extra = a.instructions.trim() ? ` User's standing instructions: ${a.instructions.trim()}` : "";
  return `You are ${a.name.trim() || "Sakai"}, ${state.name.trim() ? `${state.name.trim()}'s` : "the user's"} personal chief of staff. ${tone}${extra}`;
}

export interface BriefingResult {
  text: string;
  topAction: string;
  news: string;
  stories: Story[];
  pattern: string;
  priorities: { id: string; quadrant: Task["quadrant"]; why: string }[];
}

export async function generateBriefing(state: State): Promise<BriefingResult> {
  const data = await callClaude(state, {
    max_tokens: 2048,
    system:
      persona(state) +
      (free(state) ? " Pick" : " Use web search once to find") + " 3 genuinely useful, distinct news items for the user's interests — skip filler headlines. Then respond with ONLY JSON (no prose before or after): " +
      '{"briefing": "3-5 sentence daily briefing", "topAction": "the single highest-ROI action right now", "news": "1-2 sentence personalized news brief", ' +
      '"stories": [{"category": "short tag like AI/Tech/World/Local", "title": "headline", "source": "publication name", "time": "e.g. 2h ago", "summary": "1-2 sentences on why it matters to this user"}], ' +
      '"pattern": "one sentence observation about the user\'s week (e.g. focus times, recurring blockers)", ' +
      '"priorities": [{"id": "taskId", "quadrant": "urgent-important|important|urgent|low", "why": "one sentence"}]}. ' +
      "stories must have exactly 3 items.",
    // web search is an Anthropic server tool; FreeLLMAPI can't run it, so news comes from the model's own knowledge
    ...(free(state) ? {} : { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }] }),
    messages: [{ role: "user", content: summarize(state) }],
  });
  const texts = data.content.filter((c: any) => c.type === "text");
  // strip web_search citation markup before parsing
  const raw = texts
    .map((t: any) => t.text)
    .join("")
    .replace(/<\/?cite[^>]*>/g, "")
    .replace(/```json|```/g, "")
    .trim();
  const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  return {
    text: j.briefing,
    topAction: j.topAction,
    news: j.news ?? "",
    stories: j.stories ?? [],
    pattern: j.pattern ?? "",
    priorities: j.priorities ?? [],
  };
}

const tools = [
  {
    name: "add_task",
    description: "Create a task with deadline and area",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        area: { type: "string", enum: ["school", "projects", "coding", "business", "fitness", "scouts", "personal"] },
        due: { type: "string", description: "ISO date, optional" },
      },
      required: ["title", "area"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task done by its id",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "log_finance",
    description: "Log income (positive) or expense (negative)",
    input_schema: {
      type: "object",
      properties: { amount: { type: "number" }, note: { type: "string" } },
      required: ["amount", "note"],
    },
  },
  {
    name: "update_goal",
    description: "Create or update progress on a goal (e.g. Eagle Scout). Matches by title if it exists.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        area: { type: "string", enum: ["school", "projects", "coding", "business", "fitness", "scouts", "personal"] },
        progress: { type: "number", description: "0-100" },
      },
      required: ["title", "progress"],
    },
  },
];

function runTool(name: string, input: any, state: State, dispatch: (a: Action) => void): string {
  if (name === "add_task") {
    const task: Task = {
      id: uid(),
      title: input.title,
      area: input.area,
      due: input.due,
      quadrant: autoQuadrant(input.due, input.area),
      done: false,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "add-task", task });
    return `Task created: ${task.title}`;
  }
  if (name === "complete_task") {
    dispatch({ type: "update-task", id: input.id, patch: { done: true } });
    return "Task completed.";
  }
  if (name === "log_finance") {
    dispatch({ type: "add-finance", entry: { id: uid(), amount: input.amount, note: input.note, date: new Date().toISOString() } });
    return `Logged $${input.amount}: ${input.note}`;
  }
  if (name === "update_goal") {
    const existing = state.goals.find((g) => g.title.toLowerCase() === input.title.toLowerCase());
    if (existing) dispatch({ type: "update-goal", id: existing.id, patch: { progress: input.progress } });
    else dispatch({ type: "add-goal", goal: { id: uid(), title: input.title, area: input.area ?? "personal", progress: input.progress } });
    return `Goal "${input.title}" at ${input.progress}%.`;
  }
  return "Unknown tool";
}

export async function chatWithSakai(
  state: State,
  dispatch: (a: Action) => void,
  userText: string,
): Promise<string> {
  const messages: any[] = [{ role: "user", content: `${summarize(state)}\n\nUser says: ${userText}` }];
  const length = state.assistant.length === "brief" ? "Reply concisely (1-3 sentences)." : "Reply in a few short paragraphs when useful.";
  const system = `${persona(state)} When the user reports progress, income, deadlines, or new work, use tools to update the dashboard. ${length}`;
  for (let i = 0; i < 4; i++) {
    const data = await callClaude(state, { system, messages, tools });
    if (data.stop_reason !== "tool_use") {
      const t = data.content.find((c: any) => c.type === "text");
      return t?.text ?? "Done.";
    }
    messages.push({ role: "assistant", content: data.content });
    const results = data.content
      .filter((c: any) => c.type === "tool_use")
      .map((c: any) => ({
        type: "tool_result",
        tool_use_id: c.id,
        content: runTool(c.name, c.input, state, dispatch),
      }));
    messages.push({ role: "user", content: results });
  }
  return "Updated your dashboard.";
}

if (import.meta.env.DEV) {
  const o = toOpenAI({
    model: "m",
    max_tokens: 5,
    system: "s",
    tools: [{ name: "t", description: "d", input_schema: { type: "object" } }],
    messages: [
      { role: "user", content: "hi" },
      { role: "assistant", content: [{ type: "tool_use", id: "c1", name: "t", input: { a: 1 } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "c1", content: "ok" }] },
    ],
  });
  console.assert(o.messages.length === 4 && o.messages[2].tool_calls[0].function.arguments === '{"a":1}' && o.messages[3].role === "tool", "toOpenAI broken", o);
  const a = fromOpenAI({ choices: [{ message: { content: null, tool_calls: [{ id: "c2", function: { name: "t", arguments: '{"b":2}' } }] } }] });
  console.assert(a.stop_reason === "tool_use" && a.content[0].input.b === 2, "fromOpenAI broken", a);
}

import type { Action, State, Task } from "./store";
import { autoQuadrant, uid } from "./store";

const API = "https://api.anthropic.com/v1/messages";

// ponytail: BYOK direct-from-device calls; move behind a Supabase Edge Function when multi-user
async function callClaude(state: State, body: object): Promise<any> {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": state.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: state.model, max_tokens: 1024, ...body }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  return res.json();
}

function summarize(state: State): string {
  const tasks = state.tasks
    .filter((t) => !t.done)
    .map((t) => `- [${t.id}] ${t.title} (area:${t.area}, quadrant:${t.quadrant}${t.due ? `, due:${t.due}` : ""})`)
    .join("\n");
  const goals = state.goals.map((g) => `- ${g.title} (${g.area}, ${g.progress}%)`).join("\n");
  const revenue = state.finances.reduce((s, f) => s + f.amount, 0);
  return `Today: ${new Date().toDateString()}\nOpen tasks:\n${tasks || "none"}\nGoals:\n${goals || "none"}\nTotal logged revenue: $${revenue}\nUser interests: ${state.interests || "unknown"}`;
}

export interface BriefingResult {
  text: string;
  topAction: string;
  priorities: { id: string; quadrant: Task["quadrant"]; why: string }[];
}

export async function generateBriefing(state: State): Promise<BriefingResult> {
  const data = await callClaude(state, {
    system:
      "You are Sakai, a personal chief of staff. Given the user's dashboard state, respond with ONLY JSON: " +
      '{"briefing": "3-5 sentence daily briefing incl. a one-line personalized news-style insight", "topAction": "the single highest-ROI action right now", "priorities": [{"id": "taskId", "quadrant": "urgent-important|important|urgent|low", "why": "one sentence"}]}',
    messages: [{ role: "user", content: summarize(state) }],
  });
  const raw = data.content[0].text.replace(/```json|```/g, "").trim();
  const j = JSON.parse(raw);
  return { text: j.briefing, topAction: j.topAction, priorities: j.priorities ?? [] };
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
  const system =
    "You are Sakai, the user's personal chief of staff. When the user reports progress, income, deadlines, or new work, use tools to update the dashboard. Reply concisely (1-3 sentences).";
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

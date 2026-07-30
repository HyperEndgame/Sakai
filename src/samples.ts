import type { Story, Task } from "./store";

// Preview-only content for empty sections (Home/Tasks/Insights) so a fresh install matches
// the design mockups instead of looking broken. Never write these into the store,
// localStorage, or `initial` — each consumer picks real data first and only reaches for
// these when the real thing is empty/absent. See UI_PLAN_V2.md section 3.

export const previewChipClass =
  "rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground";

export const sampleBriefingText =
  "You have 3 things due this week and $699 waiting to be invoiced. If you only do one thing today, do the essay draft — it unlocks the rest of your week.";

export const samplePattern =
  "You do your best focused work in the morning — most completed tasks land before noon.";

export const sampleStories: Story[] = [
  {
    category: "AI",
    title: "Anthropic ships a new agent SDK for tool use",
    source: "The Verge",
    time: "2h ago",
    summary:
      "Streaming tool calls and structured output are now first-class. Relevant to your side project — it would replace most of your custom parsing code.",
  },
  {
    category: "Tech",
    title: "Next-gen chips push on-device inference mainstream",
    source: "Ars Technica",
    time: "5h ago",
    summary: "New laptop silicon runs mid-size models locally at usable speed. Expect more assistants to work offline and cost less to run.",
  },
  {
    category: "World",
    title: "Global markets steady as central banks hold rates",
    source: "Reuters",
    time: "8h ago",
    summary: "No policy change this cycle. Savings yields stay near 4.3%, so your emergency fund keeps its current return.",
  },
];

// Not real tasks — never actionable in the UI (no checkbox, no delete). Ids are prefixed so
// nothing accidentally matches a real task id.
export const sampleTasks: Task[] = [
  {
    id: "sample-1",
    title: "Finish English essay draft",
    area: "school",
    quadrant: "urgent-important",
    due: "Aug 10",
    why: "Hard deadline in 3 days and 20% of the semester grade.",
    source: "Canvas",
    done: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-2",
    title: "Send invoice to website client",
    area: "business",
    quadrant: "urgent-important",
    due: "Today",
    why: "Unlocks $699 in revenue you already earned.",
    source: "Gmail",
    done: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-3",
    title: "Ship the auth flow",
    area: "coding",
    quadrant: "important",
    due: "This week",
    why: "Compounds — unblocks every future feature.",
    source: "GitHub",
    done: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-4",
    title: "Eagle Scout board of review prep",
    area: "scouts",
    quadrant: "important",
    due: "Aug 22",
    why: "Milestone goal; low effort now, high regret later.",
    done: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-5",
    title: "Reply to club scheduling thread",
    area: "personal",
    quadrant: "urgent",
    due: "Today",
    why: "Blocking others but doesn't move your goals.",
    done: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "sample-6",
    title: "Reorganize Notion workspace",
    area: "projects",
    quadrant: "low",
    due: "Someday",
    why: "Feels productive but no measurable payoff.",
    done: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

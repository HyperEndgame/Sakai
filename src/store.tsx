import { createContext, useContext, useEffect, useReducer } from "react";
import type { Dispatch, ReactNode } from "react";

export type Quadrant = "urgent-important" | "important" | "urgent" | "low";
export type Area = "school" | "projects" | "coding" | "business" | "fitness" | "scouts" | "personal";

export interface Task {
  id: string;
  title: string;
  area: Area;
  quadrant: Quadrant;
  due?: string; // ISO date
  why?: string; // AI explanation of priority
  done: boolean;
  createdAt: string;
  source?: string; // "canvas" | "gcal" — set on imported tasks
}

export interface Integrations {
  githubUser: string;
  githubToken: string;
  githubStatus: string;
  canvasIcs: string;
  canvasStatus: string;
  gcalIcs: string;
  gcalStatus: string;
  gmailClientId: string;
  gmailToken: string; // access token, session-lived
  gmailStatus: string;
}

export interface FinanceEntry {
  id: string;
  amount: number;
  note: string;
  date: string;
}

export interface Goal {
  id: string;
  title: string;
  area: Area;
  progress: number; // 0-100
}

export interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

export interface Briefing {
  date: string; // ISO date it was generated for
  text: string;
  topAction: string;
  news?: string;
}

export type Theme = "light" | "dark" | "system";

export interface State {
  tasks: Task[];
  finances: FinanceEntry[];
  goals: Goal[];
  chat: ChatMsg[];
  briefing: Briefing | null;
  interests: string;
  apiKey: string;
  model: string;
  integrations: Integrations;
  name: string;
  theme: Theme;
  decorations: boolean;
}

export type Action =
  | { type: "add-task"; task: Task }
  | { type: "update-task"; id: string; patch: Partial<Task> }
  | { type: "delete-task"; id: string }
  | { type: "add-finance"; entry: FinanceEntry }
  | { type: "add-goal"; goal: Goal }
  | { type: "update-goal"; id: string; patch: Partial<Goal> }
  | { type: "chat"; msg: ChatMsg }
  | { type: "set-briefing"; briefing: Briefing }
  | { type: "settings"; patch: Partial<Pick<State, "interests" | "apiKey" | "model" | "name" | "theme" | "decorations">> }
  | { type: "integrations"; patch: Partial<Integrations> };

const KEY = "sakai-state-v1";

const initial: State = {
  tasks: [],
  finances: [],
  goals: [],
  chat: [],
  briefing: null,
  interests: "",
  apiKey: "",
  model: "claude-haiku-4-5-20251001",
  name: "Hyper",
  theme: "system",
  decorations: true,
  integrations: {
    githubUser: "",
    githubToken: "",
    githubStatus: "",
    canvasIcs: "",
    canvasStatus: "",
    gcalIcs: "",
    gcalStatus: "",
    gmailClientId: "",
    gmailToken: "",
    gmailStatus: "",
  },
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...initial, ...JSON.parse(raw) } : initial;
  } catch {
    return initial;
  }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "add-task":
      return { ...s, tasks: [...s.tasks, a.task] };
    case "update-task":
      return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) };
    case "delete-task":
      return { ...s, tasks: s.tasks.filter((t) => t.id !== a.id) };
    case "add-finance":
      return { ...s, finances: [...s.finances, a.entry] };
    case "add-goal":
      return { ...s, goals: [...s.goals, a.goal] };
    case "update-goal":
      return { ...s, goals: s.goals.map((g) => (g.id === a.id ? { ...g, ...a.patch } : g)) };
    case "chat":
      return { ...s, chat: [...s.chat.slice(-40), a.msg] };
    case "set-briefing":
      return { ...s, briefing: a.briefing };
    case "settings":
      return { ...s, ...a.patch };
    case "integrations":
      return { ...s, integrations: { ...s.integrations, ...a.patch } };
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ponytail: rule-based fallback when no API key; Claude re-prioritizes when available
export function autoQuadrant(due: string | undefined, area: Area): Quadrant {
  const important = area === "school" || area === "business" || area === "scouts";
  if (!due) return important ? "important" : "low";
  const days = (new Date(due).getTime() - Date.now()) / 86400000;
  if (days <= 3) return important ? "urgent-important" : "urgent";
  return important ? "important" : "low";
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}

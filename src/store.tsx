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

export interface Story {
  category: string;
  title: string;
  source: string;
  time: string;
  summary: string;
}

export interface Briefing {
  date: string; // ISO date it was generated for
  text: string;
  topAction: string;
  news?: string;
  stories?: Story[]; // exactly 3, optional so old persisted briefings still render
  pattern?: string;
}

export type Theme = "light" | "dark" | "system";
export type Accent = "coral" | "sage" | "sky" | "plum" | "amber";

export interface Assistant {
  name: string;
  accent: Accent;
  tone: "warm" | "direct" | "playful";
  length: "brief" | "detailed";
  instructions: string;
}

export interface Profile {
  org: string; // school or workplace
  role: string; // grade, major, or job title
  timezone: string;
  wake: string; // HH:MM
  sleep: string; // HH:MM
  about: string;
  areas: Area[];
}
export type Decoration = "none" | "cherry-blossom" | "constellation";

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
  decoration: Decoration;
  notifications: boolean;
  onboarded: boolean;
  assistant: Assistant;
  profile: Profile;
}

export type Action =
  | { type: "add-task"; task: Task }
  | { type: "update-task"; id: string; patch: Partial<Task> }
  | { type: "delete-task"; id: string }
  | { type: "add-finance"; entry: FinanceEntry }
  | { type: "add-goal"; goal: Goal }
  | { type: "update-goal"; id: string; patch: Partial<Goal> }
  | { type: "delete-goal"; id: string }
  | { type: "reset" }
  | { type: "chat"; msg: ChatMsg }
  | { type: "set-briefing"; briefing: Briefing }
  | { type: "settings"; patch: SettingsPatch }
  | { type: "assistant"; patch: Partial<Assistant> }
  | { type: "profile"; patch: Partial<Profile> }
  | { type: "integrations"; patch: Partial<Integrations> };

export type SettingsPatch = Partial<
  Pick<State, "interests" | "apiKey" | "model" | "name" | "theme" | "decoration" | "notifications" | "onboarded">
>;

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
  decoration: "none",
  notifications: true,
  onboarded: false,
  assistant: { name: "Sakai", accent: "coral", tone: "warm", length: "brief", instructions: "" },
  profile: {
    org: "",
    role: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    wake: "07:00",
    sleep: "23:00",
    about: "",
    areas: ["school", "projects", "coding", "business", "fitness", "scouts"],
  },
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
    if (!raw) return initial;
    const saved = JSON.parse(raw);
    // nested objects merge separately so saves from older versions pick up new fields
    return {
      ...initial,
      ...saved,
      assistant: { ...initial.assistant, ...saved.assistant },
      profile: { ...initial.profile, ...saved.profile },
      integrations: { ...initial.integrations, ...saved.integrations },
    };
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
    case "delete-goal":
      return { ...s, goals: s.goals.filter((g) => g.id !== a.id) };
    case "reset":
      return initial;
    case "chat":
      return { ...s, chat: [...s.chat.slice(-40), a.msg] };
    case "set-briefing":
      return { ...s, briefing: a.briefing };
    case "settings":
      return { ...s, ...a.patch };
    case "assistant":
      return { ...s, assistant: { ...s.assistant, ...a.patch } };
    case "profile":
      return { ...s, profile: { ...s.profile, ...a.patch } };
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

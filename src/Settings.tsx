import { useState } from "react";
import type { ReactNode } from "react";
import {
  Palette, ChevronRight, ChevronLeft, Bell, User, Check, Flower2, Stars, Ban, Bot, Target, Clock, KeyRound, Plug, Database,
} from "lucide-react";
import { Integrations } from "./Integrations";
import { useStore } from "./store";
import type { Decoration, SettingsPatch, Theme } from "./store";
import {
  AccentPicker, AreaChips, Field, GoalsEditor, Group, Segmented, Toggle, inputClass, lengthOptions, toneOptions,
} from "./fields";
import { accents } from "./theme";
import { cn } from "./cn";

type Page = "index" | "assistant" | "profile" | "life" | "rhythm" | "appearance" | "notifications" | "ai" | "connections" | "data";

const fmtTime = (hhmm: string) =>
  new Date(`2000-01-01T${hhmm || "00:00"}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export function Settings({ effectiveTheme }: { effectiveTheme: "light" | "dark" }) {
  const [page, setPage] = useState<Page>("index");
  const { state } = useStore();
  const back = () => setPage("index");
  const a = state.assistant;
  const p = state.profile;
  const connected = [state.integrations.githubUser, state.integrations.canvasIcs, state.integrations.gcalIcs, state.integrations.gmailClientId].filter(Boolean).length;

  if (page === "assistant") return <AssistantPage onBack={back} />;
  if (page === "profile") return <ProfilePage onBack={back} />;
  if (page === "life") return <LifePage onBack={back} />;
  if (page === "rhythm") return <RhythmPage onBack={back} />;
  if (page === "appearance") return <AppearancePage theme={effectiveTheme} onBack={back} />;
  if (page === "notifications") return <NotificationsPage onBack={back} />;
  if (page === "ai") return <AiPage onBack={back} />;
  if (page === "connections") return <SubPage title="Connections" lede="Sources Sakai pulls tasks and activity from." onBack={back}><Integrations /></SubPage>;
  if (page === "data") return <DataPage onBack={back} />;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Preferences</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight">Settings</h1>
      </header>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">You & {a.name || "Sakai"}</h2>
        <SettingRow onClick={() => setPage("assistant")} icon={<Bot className="h-4 w-4" />} label="Assistant" hint={`${a.name || "Sakai"} · ${cap(a.tone)} · ${cap(a.length)}`} />
        <SettingRow onClick={() => setPage("profile")} icon={<User className="h-4 w-4" />} label="Profile" hint={[state.name, p.org].filter(Boolean).join(" · ") || "Name, school or work"} />
        <SettingRow onClick={() => setPage("life")} icon={<Target className="h-4 w-4" />} label="Life & goals" hint={`${p.areas.length} areas · ${state.goals.length} goal${state.goals.length === 1 ? "" : "s"}`} />
        <SettingRow onClick={() => setPage("rhythm")} icon={<Clock className="h-4 w-4" />} label="Daily rhythm" hint={`${fmtTime(p.wake)} – ${fmtTime(p.sleep)}`} />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">App</h2>
        <SettingRow onClick={() => setPage("appearance")} icon={<Palette className="h-4 w-4" />} label="Appearance" hint={`${cap(state.theme)} · ${accents[a.accent]?.label ?? "Coral"}`} />
        <SettingRow onClick={() => setPage("notifications")} icon={<Bell className="h-4 w-4" />} label="Notifications" hint={state.notifications ? "Dashboard notification on" : "Off"} />
        <SettingRow onClick={() => setPage("ai")} icon={<KeyRound className="h-4 w-4" />} label="AI & keys" hint={state.apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY ? "Key set" : "No API key yet"} />
        <SettingRow onClick={() => setPage("connections")} icon={<Plug className="h-4 w-4" />} label="Connections" hint={connected ? `${connected} connected` : "GitHub, Canvas, Calendar, Gmail"} />
        <SettingRow onClick={() => setPage("data")} icon={<Database className="h-4 w-4" />} label="Data" hint="Export, replay welcome, erase" />
      </section>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function SettingRow({ onClick, icon, label, hint }: { onClick: () => void; icon: ReactNode; label: string; hint: string }) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function SubPage({ title, lede, onBack, children }: { title: string; lede?: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="-ml-1 inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Settings
      </button>
      <header className="space-y-2">
        <h1 className="font-serif text-4xl leading-tight tracking-tight">{title}</h1>
        {lede && <p className="text-sm text-muted-foreground text-pretty">{lede}</p>}
      </header>
      {children}
    </div>
  );
}

function useSetters() {
  const { state, dispatch } = useStore();
  return {
    state,
    dispatch,
    set: (patch: SettingsPatch) => dispatch({ type: "settings", patch }),
    setA: (patch: Partial<typeof state.assistant>) => dispatch({ type: "assistant", patch }),
    setP: (patch: Partial<typeof state.profile>) => dispatch({ type: "profile", patch }),
  };
}

function AssistantPage({ onBack }: { onBack: () => void }) {
  const { state, setA } = useSetters();
  const a = state.assistant;
  return (
    <SubPage title="Assistant" lede="Who you talk to, and how they talk back." onBack={onBack}>
      <Group>
        <Field label="Name">
          <input className={inputClass} value={a.name} maxLength={24} placeholder="Sakai" onChange={(e) => setA({ name: e.target.value })} />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium">Accent color</p>
          <AccentPicker value={a.accent} onChange={(accent) => setA({ accent })} />
        </div>
      </Group>
      <Group>
        <div className="space-y-2">
          <p className="text-sm font-medium">Tone</p>
          <Segmented label="Tone" value={a.tone} options={toneOptions} onChange={(tone) => setA({ tone })} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Reply length</p>
          <Segmented label="Reply length" value={a.length} options={lengthOptions} onChange={(length) => setA({ length })} />
        </div>
      </Group>
      <Group>
        <Field label="Custom instructions" hint="Added to every conversation, e.g. “Use bullet points” or “Remind me to stretch.”">
          <textarea
            className={cn(inputClass, "min-h-28 resize-y")}
            value={a.instructions}
            maxLength={1000}
            onChange={(e) => setA({ instructions: e.target.value })}
          />
        </Field>
      </Group>
    </SubPage>
  );
}

function ProfilePage({ onBack }: { onBack: () => void }) {
  const { state, set, setP } = useSetters();
  const p = state.profile;
  return (
    <SubPage title="Profile" lede={`What ${state.assistant.name || "Sakai"} knows about you. Stored only on this device.`} onBack={onBack}>
      <Group>
        <Field label="Your name">
          <input className={inputClass} value={state.name} autoComplete="given-name" onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="School or work">
            <input className={inputClass} value={p.org} onChange={(e) => setP({ org: e.target.value })} />
          </Field>
          <Field label="Grade or role">
            <input className={inputClass} value={p.role} onChange={(e) => setP({ role: e.target.value })} />
          </Field>
        </div>
        <Field label="Timezone">
          <input className={inputClass} value={p.timezone} onChange={(e) => setP({ timezone: e.target.value })} />
        </Field>
      </Group>
      <Group>
        <Field label="About me" hint="Anything that helps: commitments, how you like to work, what's hard right now.">
          <textarea className={cn(inputClass, "min-h-28 resize-y")} value={p.about} maxLength={1000} onChange={(e) => setP({ about: e.target.value })} />
        </Field>
      </Group>
    </SubPage>
  );
}

function LifePage({ onBack }: { onBack: () => void }) {
  const { state, dispatch, set, setP } = useSetters();
  return (
    <SubPage title="Life & goals" lede="The areas you track and what you're working toward." onBack={onBack}>
      <Group title="Areas">
        <AreaChips value={state.profile.areas} onChange={(areas) => setP({ areas })} />
      </Group>
      <Group title="Goals">
        <GoalsEditor
          goals={state.goals}
          areas={state.profile.areas}
          onAdd={(goal) => dispatch({ type: "add-goal", goal })}
          onDelete={(id) => dispatch({ type: "delete-goal", id })}
        />
      </Group>
      <Group>
        <Field label="Interests" hint="Shapes your news feed.">
          <input className={inputClass} value={state.interests} placeholder="e.g. AI, web dev, scouting" onChange={(e) => set({ interests: e.target.value })} />
        </Field>
      </Group>
    </SubPage>
  );
}

function RhythmPage({ onBack }: { onBack: () => void }) {
  const { state, setP } = useSetters();
  const p = state.profile;
  return (
    <SubPage title="Daily rhythm" lede="Helps your assistant plan around when you're actually awake." onBack={onBack}>
      <Group>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Usually up at">
            <input type="time" className={inputClass} value={p.wake} onChange={(e) => setP({ wake: e.target.value })} />
          </Field>
          <Field label="Usually asleep by">
            <input type="time" className={inputClass} value={p.sleep} onChange={(e) => setP({ sleep: e.target.value })} />
          </Field>
        </div>
      </Group>
    </SubPage>
  );
}

const themeOptions: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

const decorationOptions: { id: Decoration; label: string; hint: string; mode: "light" | "dark" | "any"; icon: ReactNode }[] = [
  { id: "none", label: "None", hint: "Clean and quiet", mode: "any", icon: <Ban className="h-3.5 w-3.5" /> },
  { id: "cherry-blossom", label: "Cherry blossom", hint: "Falling petals, light mode", mode: "light", icon: <Flower2 className="h-3.5 w-3.5" /> },
  { id: "constellation", label: "Constellation", hint: "Linked stars, dark mode", mode: "dark", icon: <Stars className="h-3.5 w-3.5" /> },
];

function DecorationPreview({ id }: { id: Decoration }) {
  if (id === "none") return <div className="h-full w-full bg-gradient-to-br from-muted to-card" />;
  if (id === "cherry-blossom") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[oklch(0.97_0.02_20)] to-[oklch(0.9_0.06_15)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-[100%_0_100%_0]"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: `${6 + (i % 3) * 2}px`,
              height: `${6 + (i % 3) * 2}px`,
              background: "oklch(0.82 0.11 15 / 0.9)",
              transform: `rotate(${i * 40}deg)`,
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[oklch(0.19_0.006_60)] to-[oklch(0.28_0.008_60)]">
      <svg viewBox="0 0 100 100" className="h-full w-full text-primary" preserveAspectRatio="xMidYMid slice">
        <polyline points="20,30 45,55 70,40 80,75" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.6" />
        {[[20, 30], [45, 55], [70, 40], [80, 75], [15, 80], [60, 20], [30, 70]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.4" fill="oklch(0.94 0.01 80)" />
        ))}
      </svg>
    </div>
  );
}

function AppearancePage({ theme, onBack }: { theme: "light" | "dark"; onBack: () => void }) {
  const { state, set, setA } = useSetters();
  return (
    <SubPage title="Appearance" lede="Theme, color, and a little atmosphere." onBack={onBack}>
      <Group>
        <div className="space-y-2">
          <p className="text-sm font-medium">Theme</p>
          <Segmented label="Theme" value={state.theme} options={themeOptions} onChange={(t) => set({ theme: t })} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Accent color</p>
          <AccentPicker value={state.assistant.accent} onChange={(accent) => setA({ accent })} />
        </div>
      </Group>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Decoration</h2>
        <div role="radiogroup" aria-label="Decoration" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {decorationOptions.map((opt) => {
            const active = state.decoration === opt.id;
            const visibleNow = opt.mode === "any" || opt.mode === theme;
            return (
              <button
                key={opt.id}
                role="radio"
                aria-checked={active}
                onClick={() => set({ decoration: opt.id })}
                className={cn(
                  "flex overflow-hidden rounded-2xl border bg-card text-left transition-colors sm:flex-col",
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
                )}
              >
                <div className="relative w-24 shrink-0 sm:h-24 sm:w-full">
                  <DecorationPreview id={opt.id} />
                  {active && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="text-primary">{opt.icon}</span>
                    {opt.label}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.hint}</p>
                  {!visibleNow && <p className="mt-1 text-xs text-muted-foreground">Switch to {opt.mode} mode to see it.</p>}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </SubPage>
  );
}

function NotificationsPage({ onBack }: { onBack: () => void }) {
  const { state, set } = useSetters();
  return (
    <SubPage title="Notifications" onBack={onBack}>
      <Group>
        <Toggle
          label="Dashboard notification"
          hint="A persistent notification with your next action, updated as things change."
          on={state.notifications}
          onChange={(v) => set({ notifications: v })}
        />
      </Group>
    </SubPage>
  );
}

function AiPage({ onBack }: { onBack: () => void }) {
  const { state, set } = useSetters();
  const builtIn = !state.apiKey && !!import.meta.env.VITE_ANTHROPIC_API_KEY;
  return (
    <SubPage title="AI & keys" lede="Chat and your daily briefing run on Claude with your own key." onBack={onBack}>
      <Group>
        <Field label="Anthropic API key" hint={builtIn ? "Built-in key active. Paste your own to override." : "Stored only on this device."}>
          <input className={inputClass} type="password" autoComplete="off" placeholder="sk-ant-…" value={state.apiKey} onChange={(e) => set({ apiKey: e.target.value })} />
        </Field>
        <Field label="Model">
          <select className={inputClass} value={state.model} onChange={(e) => set({ model: e.target.value })}>
            <option value="claude-haiku-4-5-20251001">Haiku 4.5 · fast, cheap</option>
            <option value="claude-sonnet-5">Sonnet 5 · smarter</option>
          </select>
        </Field>
      </Group>
    </SubPage>
  );
}

function DataPage({ onBack }: { onBack: () => void }) {
  const { state, dispatch, set } = useSetters();
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function copy() {
    // API keys and tokens stay out of the export
    const { apiKey: _k, integrations, ...rest } = state;
    const { githubToken: _g, gmailToken: _m, ...safeIntegrations } = integrations;
    await navigator.clipboard.writeText(JSON.stringify({ ...rest, integrations: safeIntegrations }, null, 2));
    setCopied(true);
  }

  return (
    <SubPage title="Data" lede="Everything lives on this device. Nothing is uploaded except what you send to Claude." onBack={onBack}>
      <Group>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Copy my data</p>
            <p className="text-xs text-muted-foreground">Tasks, goals, and settings as JSON. Keys are left out.</p>
          </div>
          <button onClick={copy} className="min-h-10 shrink-0 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Replay welcome</p>
            <p className="text-xs text-muted-foreground">Walk through setup again. Your data stays.</p>
          </div>
          <button onClick={() => set({ onboarded: false })} className="min-h-10 shrink-0 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
            Replay
          </button>
        </div>
      </Group>
      <section className="space-y-3 rounded-2xl border border-destructive/40 p-4">
        <div>
          <p className="text-sm font-medium">Erase everything</p>
          <p className="text-xs text-muted-foreground">Deletes all tasks, goals, chat, keys, and settings on this device. This can't be undone.</p>
        </div>
        <button
          onClick={() => (confirm ? dispatch({ type: "reset" }) : setConfirm(true))}
          className={cn(
            "min-h-11 w-full rounded-xl text-sm font-medium transition-colors",
            confirm ? "bg-destructive text-destructive-foreground" : "border border-destructive/50 text-destructive hover:bg-destructive/10",
          )}
        >
          {confirm ? "Tap again to erase everything" : "Erase all data"}
        </button>
      </section>
    </SubPage>
  );
}

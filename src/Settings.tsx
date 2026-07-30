import { useState } from "react";
import {
  Palette, Sun, Moon, ChevronRight, ChevronLeft, Bell, User, Shield, Check, Flower2, Stars, Ban, Sparkles,
} from "lucide-react";
import { Integrations } from "./Integrations";
import { useStore } from "./store";
import type { Decoration, State, Theme } from "./store";
import { cn } from "./cn";

type SettingsPatch = Partial<Pick<State, "interests" | "apiKey" | "model" | "name" | "theme" | "decoration" | "notifications">>;
type Page = "index" | "customization" | "notifications" | "profile" | "privacy";

export function Settings({ effectiveTheme, onToggleTheme }: { effectiveTheme: "light" | "dark"; onToggleTheme: () => void }) {
  const [page, setPage] = useState<Page>("index");
  const { state, dispatch } = useStore();
  const set = (patch: SettingsPatch) => dispatch({ type: "settings", patch });

  if (page === "customization") return <CustomizationPage theme={effectiveTheme} decoration={state.decoration} onSet={set} onBack={() => setPage("index")} />;
  if (page === "notifications") return <NotificationsPage on={state.notifications} onSet={set} onBack={() => setPage("index")} />;
  if (page === "profile") return <ProfilePage name={state.name} onSet={set} onBack={() => setPage("index")} />;
  if (page === "privacy") return <PrivacyPage state={state} onSet={set} onBack={() => setPage("index")} />;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Preferences</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight">Settings</h1>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {effectiveTheme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            <div>
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs capitalize text-muted-foreground">{effectiveTheme} mode</p>
            </div>
          </div>
          <button
            onClick={onToggleTheme}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Switch to {effectiveTheme === "dark" ? "light" : "dark"}
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">General</h2>
        <SettingRow onClick={() => setPage("customization")} icon={<Palette className="h-4 w-4" />} label="Customization" hint="Decorations & vibe" />
        <SettingRow onClick={() => setPage("notifications")} icon={<Bell className="h-4 w-4" />} label="Notifications" hint="Daily briefing & reminders" />
        <SettingRow onClick={() => setPage("profile")} icon={<User className="h-4 w-4" />} label="Profile" hint="Name, timezone" />
        <SettingRow onClick={() => setPage("privacy")} icon={<Shield className="h-4 w-4" />} label="Privacy & data" hint="Connected sources" />
      </section>
    </div>
  );
}

function SettingRow({ onClick, icon, label, hint }: { onClick: () => void; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-primary">{icon}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
      <ChevronLeft className="h-3.5 w-3.5" />
      Settings
    </button>
  );
}

const decorationOptions: { id: Decoration; label: string; hint: string; mode: "light" | "dark" | "any"; icon: React.ReactNode }[] = [
  { id: "none", label: "None", hint: "Clean and quiet", mode: "any", icon: <Ban className="h-3.5 w-3.5" /> },
  { id: "cherry-blossom", label: "Cherry blossom", hint: "Falling petals — best in light mode", mode: "light", icon: <Flower2 className="h-3.5 w-3.5" /> },
  { id: "constellation", label: "Constellation", hint: "Twinkling stars — best in dark mode", mode: "dark", icon: <Stars className="h-3.5 w-3.5" /> },
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
              width: 6 + (i % 3) * 2,
              height: 6 + (i % 3) * 2,
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
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <line x1="20" y1="30" x2="45" y2="55" stroke="oklch(0.72 0.13 45 / 0.5)" strokeWidth="0.4" />
        <line x1="45" y1="55" x2="70" y2="40" stroke="oklch(0.72 0.13 45 / 0.5)" strokeWidth="0.4" />
        <line x1="70" y1="40" x2="80" y2="75" stroke="oklch(0.72 0.13 45 / 0.5)" strokeWidth="0.4" />
        {[[20, 30], [45, 55], [70, 40], [80, 75], [15, 80], [60, 20], [30, 70]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.2" fill="oklch(0.94 0.01 80)" />
        ))}
      </svg>
    </div>
  );
}

function CustomizationPage({ theme, decoration, onSet, onBack }: { theme: "light" | "dark"; decoration: Decoration; onSet: (p: SettingsPatch) => void; onBack: () => void }) {
  return (
    <div className="space-y-8">
      <BackLink onBack={onBack} />
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Personalize</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight">Customization</h1>
        <p className="text-sm text-muted-foreground">Add a subtle atmosphere to Sakai. Decorations only appear in the mode they're designed for.</p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Decoration</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {decorationOptions.map((opt) => {
            const active = decoration === opt.id;
            const visibleNow = opt.mode === "any" || opt.mode === theme;
            return (
              <button
                key={opt.id}
                onClick={() => onSet({ decoration: opt.id })}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-card text-left transition-all",
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
                )}
              >
                <div className="relative h-24">
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
                  <p className="mt-1 text-[11px] text-muted-foreground">{opt.hint}</p>
                  {!visibleNow && opt.id !== "none" && (
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">Switch to {opt.mode} mode to see it</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function NotificationsPage({ on, onSet, onBack }: { on: boolean; onSet: (p: SettingsPatch) => void; onBack: () => void }) {
  return (
    <div className="space-y-8">
      <BackLink onBack={onBack} />
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">General</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight">Notifications</h1>
      </header>
      <section className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Daily briefing & reminders</p>
          <p className="text-xs text-muted-foreground">Persistent dashboard notification with your next action.</p>
        </div>
        <input type="checkbox" checked={on} onChange={(e) => onSet({ notifications: e.target.checked })} className="h-5 w-5 accent-primary" />
      </section>
    </div>
  );
}

function ProfilePage({ name, onSet, onBack }: { name: string; onSet: (p: SettingsPatch) => void; onBack: () => void }) {
  return (
    <div className="space-y-8">
      <BackLink onBack={onBack} />
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">General</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight">Profile</h1>
      </header>
      <section className="rounded-2xl border border-border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground">Your name</label>
        <input
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none"
          value={name}
          onChange={(e) => onSet({ name: e.target.value })}
        />
      </section>
    </div>
  );
}

function PrivacyPage({ state, onSet, onBack }: { state: State; onSet: (p: SettingsPatch) => void; onBack: () => void }) {
  return (
    <div className="space-y-8">
      <BackLink onBack={onBack} />
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">General</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight">Privacy & data</h1>
        <p className="text-sm text-muted-foreground">Connected sources, API key, model, and interests.</p>
      </header>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Anthropic API key</p>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none"
          type="password"
          placeholder="sk-ant-…"
          value={state.apiKey}
          onChange={(e) => onSet({ apiKey: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          {!state.apiKey && import.meta.env.VITE_ANTHROPIC_API_KEY ? "Built-in key active. Paste your own to override." : "Stored only on this device. Powers briefings and the assistant."}
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Model</p>
        <select className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" value={state.model} onChange={(e) => onSet({ model: e.target.value })}>
          <option value="claude-haiku-4-5-20251001">Haiku 4.5 (fast, cheap)</option>
          <option value="claude-sonnet-5">Sonnet 5 (smart)</option>
        </select>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Interests (personalizes your briefing)</p>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none"
          placeholder="e.g. AI, web dev, scouting, fitness"
          value={state.interests}
          onChange={(e) => onSet({ interests: e.target.value })}
        />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected sources</h2>
        <Integrations />
      </section>
    </div>
  );
}

import { useState } from "react";
import type { ReactNode } from "react";
import { Check, Plus, X } from "lucide-react";
import { accents } from "./theme";
import { uid } from "./store";
import type { Accent, Area, Goal } from "./store";
import { cn } from "./cn";

// One control vocabulary shared by onboarding and settings.

export const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/80 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
      {title && <h2 className="text-sm font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl border border-border bg-background p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "min-h-10 flex-1 rounded-lg px-2 text-sm transition-colors",
            value === o.id ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AccentPicker({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) {
  return (
    <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-3">
      {(Object.keys(accents) as Accent[]).map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={accents[id].label}
          onClick={() => onChange(id)}
          className="flex flex-col items-center gap-1.5"
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-shadow",
              "bg-[var(--sw-l)] dark:bg-[var(--sw-d)]",
              value === id && "ring-2 ring-foreground/70",
            )}
            style={{ "--sw-l": accents[id].light, "--sw-d": accents[id].dark } as React.CSSProperties}
          >
            {value === id && <Check className="h-4 w-4 text-background" />}
          </span>
          <span className={cn("text-xs", value === id ? "text-foreground" : "text-muted-foreground")}>{accents[id].label}</span>
        </button>
      ))}
    </div>
  );
}

export const areaLabels: Record<Area, string> = {
  school: "School",
  projects: "Projects",
  coding: "Coding",
  business: "Business",
  fitness: "Fitness",
  scouts: "Scouts",
  personal: "Personal",
};

export function AreaChips({ value, onChange }: { value: Area[]; onChange: (a: Area[]) => void }) {
  const toggle = (a: Area) => onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(areaLabels) as Area[]).map((a) => {
        const on = value.includes(a);
        return (
          <button
            key={a}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(a)}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors",
              on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {on && <Check className="h-3.5 w-3.5 text-primary" />}
            {areaLabels[a]}
          </button>
        );
      })}
    </div>
  );
}

export function GoalsEditor({
  goals,
  areas,
  onAdd,
  onDelete,
}: {
  goals: Goal[];
  areas: Area[];
  onAdd: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<Area>(areas[0] ?? "personal");
  function add() {
    if (!title.trim()) return;
    onAdd({ id: uid(), title: title.trim(), area, progress: 0 });
    setTitle("");
  }
  return (
    <div className="space-y-2">
      {goals.map((g) => (
        <div key={g.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm">{g.title}</span>
          <span className="text-xs text-muted-foreground">{areaLabels[g.area]}</span>
          <button
            type="button"
            aria-label={`Remove ${g.title}`}
            onClick={() => onDelete(g.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className={cn(inputClass, "min-w-0 flex-1")}
          placeholder="Add a goal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          aria-label="New goal"
        />
        <select className={cn(inputClass, "w-[6.5rem] shrink-0 px-2")} value={area} onChange={(e) => setArea(e.target.value as Area)} aria-label="Goal area">
          {(Object.keys(areaLabels) as Area[]).map((a) => (
            <option key={a} value={a}>
              {areaLabels[a]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!title.trim()}
          aria-label="Add goal"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}
      >
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}

export const toneOptions = [
  { id: "warm", label: "Warm" },
  { id: "direct", label: "Direct" },
  { id: "playful", label: "Playful" },
] as const;

export const lengthOptions = [
  { id: "brief", label: "Brief" },
  { id: "detailed", label: "Detailed" },
] as const;

import { Newspaper, Sparkles } from "lucide-react";
import type { Area } from "./store";
import { useStore } from "./store";
import { previewChipClass, samplePattern, sampleStories } from "./samples";

const areaLabel: Record<Area, string> = {
  school: "School",
  projects: "Projects",
  coding: "Coding",
  business: "Finances",
  fitness: "Fitness",
  scouts: "Scouts",
  personal: "Personal",
};

// ponytail: "personal" is the catch-all bucket, not one of the tracked life pillars
const allAreas: Area[] = ["school", "projects", "coding", "business", "fitness", "scouts"];

export function Insights() {
  const { state } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const stale = state.briefing?.date !== today;
  const realStories = state.briefing && !stale ? state.briefing.stories : undefined;
  const hasStories = !!realStories?.length;
  const stories = hasStories ? realStories! : sampleStories;
  const realPattern = state.briefing && !stale ? state.briefing.pattern : undefined;
  const hasPattern = !!realPattern;
  const pattern = hasPattern ? realPattern! : samplePattern;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">This week</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">Patterns and news, curated for your goals.</p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Daily brief</h2>
          {!hasStories && <span className={previewChipClass}>Preview</span>}
        </div>
        <div className="space-y-2">
          {stories.map((s) => (
            <article key={s.title} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-wider text-primary">{s.category}</p>
              <h3 className="mt-1 font-serif text-lg leading-snug">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">All life areas</h2>
        <div className="space-y-2">
          {allAreas.filter((a) => state.profile.areas.includes(a)).map((area) => {
            const tasks = state.tasks.filter((t) => t.area === area);
            const open = tasks.filter((t) => !t.done);
            const goals = state.goals.filter((g) => g.area === area);

            let percent = 0;
            if (goals.length) percent = Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length);
            else if (tasks.length) percent = Math.round(((tasks.length - open.length) / tasks.length) * 100);

            let note = "No data yet";
            if (area === "business") {
              const monthly = state.finances.filter((f) => f.date.startsWith(thisMonth)).reduce((s, f) => s + f.amount, 0);
              note = `${monthly >= 0 ? "+" : ""}$${monthly} this month`;
            } else if (open.length) {
              note = `${open.length} open task${open.length === 1 ? "" : "s"}`;
            } else if (goals[0]) {
              note = goals[0].title;
            }

            return (
              <div key={area} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{areaLabel[area]}</span>
                  <span className="font-serif text-lg">{percent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{note}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-accent/60 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Pattern this week</p>
              {!hasPattern && <span className={previewChipClass}>Preview</span>}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{pattern}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

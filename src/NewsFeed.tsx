import { Newspaper, Sparkles } from "lucide-react";
import type { Story } from "./store";
import { previewChipClass } from "./samples";

// ponytail: CSS gradient tile per category instead of a binary image asset —
// no news images ship with the app, category is enough to color-code the tile.
const gradients: Record<string, string> = {
  ai: "from-[oklch(0.9_0.05_20)] to-[oklch(0.75_0.12_30)]",
  tech: "from-[oklch(0.55_0.15_40)] to-[oklch(0.3_0.08_30)]",
  world: "from-[oklch(0.9_0.08_90)] to-[oklch(0.75_0.1_140)]",
  local: "from-[oklch(0.85_0.06_200)] to-[oklch(0.65_0.1_250)]",
};

function tileClass(category: string) {
  return gradients[category.toLowerCase()] ?? "from-muted to-accent";
}

export function NewsFeed({ stories, preview }: { stories: Story[]; preview?: boolean }) {
  if (stories.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Newspaper className="h-3.5 w-3.5 text-primary" />
        Your news
        {preview && <span className={previewChipClass}>Preview</span>}
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
        {stories.map((s) => (
          <article key={s.title} className="space-y-3 p-4">
            <div className="flex gap-3">
              <div className={`h-16 w-20 shrink-0 rounded-xl bg-gradient-to-br ${tileClass(s.category)}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-primary">{s.category}</p>
                <h3 className="mt-0.5 font-serif text-base leading-snug">{s.title}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {s.source} · {s.time}
                </p>
              </div>
            </div>
            <div className="flex gap-2 rounded-2xl bg-muted/50 p-3">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">{s.summary}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

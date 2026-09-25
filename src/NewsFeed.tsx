import { BrainCircuit, Cpu, Globe, MapPin, Newspaper } from "lucide-react";
import type { Story } from "./store";
import { previewChipClass } from "./samples";

// ponytail: accent-tinted icon per category instead of images — follows the user's accent color.
const icons: Record<string, typeof Newspaper> = { ai: BrainCircuit, tech: Cpu, world: Globe, local: MapPin };

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
        {stories.map((s) => {
          const Icon = icons[s.category.toLowerCase()] ?? Newspaper;
          return (
          <article key={s.title} className="space-y-2 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-primary">{s.category}</p>
                <h3 className="mt-0.5 font-serif text-base leading-snug">{s.title}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {s.source} · {s.time}
                </p>
              </div>
            </div>
            <p className="pl-[3.25rem] text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
          </article>
          );
        })}
      </div>
    </section>
  );
}

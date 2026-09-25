import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { useStore } from "./store";
import { AccentPicker, AreaChips, Field, GoalsEditor, Segmented, inputClass, toneOptions } from "./fields";
import { cn } from "./cn";

const steps = ["welcome", "assistant", "you", "focus", "connect", "done"] as const;

// Sakai's mark: a ring that draws itself, a dot that lands, then a few stars link up around it.
export function Mark({ size = 132, animate = true }: { size?: number; animate?: boolean }) {
  const stars = [
    [16, 60], [36, 22], [94, 14], [120, 50], [104, 108], [42, 116],
  ];
  const links = [[0, 1], [2, 3], [4, 5]];
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" aria-hidden="true" className={cn("text-primary", animate && "mark-animate")}>
      {links.map(([a, b], i) => (
        <line
          key={i}
          className="mark-link"
          style={{ animationDelay: `${900 + i * 120}ms` }}
          x1={stars[a][0]} y1={stars[a][1]} x2={stars[b][0]} y2={stars[b][1]}
          stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" pathLength={1}
        />
      ))}
      {stars.map(([x, y], i) => (
        <circle key={i} className="mark-star" style={{ animationDelay: `${700 + i * 90}ms` }} cx={x} cy={y} r="2" fill="currentColor" />
      ))}
      <circle className="mark-ring" cx="66" cy="66" r="30" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" pathLength={1} />
      <circle className="mark-dot" cx="66" cy="66" r="9" fill="currentColor" />
    </svg>
  );
}

function Step({ title, lede, children }: { title: string; lede?: string; children?: ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl leading-tight tracking-tight text-balance">{title}</h1>
        {lede && <p className="text-sm text-muted-foreground text-pretty">{lede}</p>}
      </header>
      {children}
    </div>
  );
}

export function Onboarding() {
  const { state, dispatch } = useStore();
  const [i, setI] = useState(0);
  const step = steps[i];
  const a = state.assistant;
  const p = state.profile;
  const assistantName = a.name.trim() || "Sakai";
  const setA = (patch: Partial<typeof a>) => dispatch({ type: "assistant", patch });
  const setP = (patch: Partial<typeof p>) => dispatch({ type: "profile", patch });
  const finish = () => dispatch({ type: "settings", patch: { onboarded: true } });
  const next = () => (i === steps.length - 1 ? finish() : setI(i + 1));

  return (
    <div className="flex min-h-screen flex-col px-6 pt-6">
      <div className="flex h-10 items-center gap-3">
        {i > 0 && step !== "done" ? (
          <button
            onClick={() => setI(i - 1)}
            aria-label="Back"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-8" />
        )}
        <div className="flex flex-1 gap-1.5" aria-label={`Step ${i + 1} of ${steps.length}`}>
          {steps.map((s, n) => (
            <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", n <= i ? "bg-primary" : "bg-border")} />
          ))}
        </div>
        {step !== "done" ? (
          <button onClick={finish} className="min-h-10 px-2 text-sm text-muted-foreground hover:text-foreground">
            Skip
          </button>
        ) : (
          <span className="w-8" />
        )}
      </div>

      <main key={step} className="onb-in flex-1 py-8">
        {step === "welcome" && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 text-center">
            <Mark />
            <div className="space-y-3">
              <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-balance">Meet your chief of staff.</h1>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground text-pretty">
                Sakai turns school, projects, and everything else into one clear next step, and tells you why.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Setup takes about a minute. Change anything later in Settings.</p>
          </div>
        )}

        {step === "assistant" && (
          <Step title="Name your assistant." lede="This is who you'll talk to. Pick a name and a color that feels like yours.">
            <Field label="Assistant name">
              <input className={inputClass} value={a.name} maxLength={24} onChange={(e) => setA({ name: e.target.value })} placeholder="Sakai" />
            </Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">Accent color</p>
              <AccentPicker value={a.accent} onChange={(accent) => setA({ accent })} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">How should {assistantName} talk?</p>
              <Segmented label="Tone" value={a.tone} options={toneOptions} onChange={(tone) => setA({ tone })} />
            </div>
          </Step>
        )}

        {step === "you" && (
          <Step title="A little about you." lede={`${assistantName} uses this to plan around your day. It never leaves this device.`}>
            <Field label="Your name">
              <input className={inputClass} value={state.name} autoComplete="given-name" onChange={(e) => dispatch({ type: "settings", patch: { name: e.target.value } })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="School or work">
                <input className={inputClass} value={p.org} placeholder="e.g. Lincoln High" onChange={(e) => setP({ org: e.target.value })} />
              </Field>
              <Field label="Grade or role">
                <input className={inputClass} value={p.role} placeholder="e.g. Junior" onChange={(e) => setP({ role: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Usually up at">
                <input type="time" className={inputClass} value={p.wake} onChange={(e) => setP({ wake: e.target.value })} />
              </Field>
              <Field label="Usually asleep by">
                <input type="time" className={inputClass} value={p.sleep} onChange={(e) => setP({ sleep: e.target.value })} />
              </Field>
            </div>
            <Field label="Timezone">
              <input className={inputClass} value={p.timezone} onChange={(e) => setP({ timezone: e.target.value })} />
            </Field>
          </Step>
        )}

        {step === "focus" && (
          <Step title="What are you juggling?" lede="Pick the areas you want to track. Goals are optional; add one or two to start.">
            <AreaChips value={p.areas} onChange={(areas) => setP({ areas })} />
            <div className="space-y-2">
              <p className="text-sm font-medium">Goals</p>
              <GoalsEditor
                goals={state.goals}
                areas={p.areas}
                onAdd={(goal) => dispatch({ type: "add-goal", goal })}
                onDelete={(id) => dispatch({ type: "delete-goal", id })}
              />
            </div>
            <Field label="Interests" hint="Shapes your news feed.">
              <input
                className={inputClass}
                value={state.interests}
                placeholder="e.g. AI, web dev, scouting, fitness"
                onChange={(e) => dispatch({ type: "settings", patch: { interests: e.target.value } })}
              />
            </Field>
          </Step>
        )}

        {step === "connect" && (
          <Step title="Connect your world." lede="All optional. Keys and links are stored only on this phone; skip anything and add it later.">
            <Field label="Anthropic API key" hint="Powers chat and your daily briefing.">
              <input
                type="password"
                className={inputClass}
                value={state.apiKey}
                placeholder="sk-ant-…"
                autoComplete="off"
                onChange={(e) => dispatch({ type: "settings", patch: { apiKey: e.target.value } })}
              />
            </Field>
            <Field label="GitHub username" hint="Counts your commits this week.">
              <input
                className={inputClass}
                value={state.integrations.githubUser}
                autoCapitalize="off"
                onChange={(e) => dispatch({ type: "integrations", patch: { githubUser: e.target.value } })}
              />
            </Field>
            <Field label="Canvas calendar feed" hint="Canvas → Calendar → Calendar Feed → copy the .ics link.">
              <input
                className={inputClass}
                value={state.integrations.canvasIcs}
                placeholder="https://…/feed.ics"
                inputMode="url"
                onChange={(e) => dispatch({ type: "integrations", patch: { canvasIcs: e.target.value } })}
              />
            </Field>
            <Field label="Google Calendar secret address" hint="Calendar settings → your calendar → Secret address in iCal format.">
              <input
                className={inputClass}
                value={state.integrations.gcalIcs}
                placeholder="https://calendar.google.com/…/basic.ics"
                inputMode="url"
                onChange={(e) => dispatch({ type: "integrations", patch: { gcalIcs: e.target.value } })}
              />
            </Field>
          </Step>
        )}

        {step === "done" && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 text-center">
            <Mark size={104} />
            <div className="space-y-3">
              <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-balance">
                Hi {state.name.trim() || "there"}. I'm {assistantName}.
              </h1>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground text-pretty">
                Tell me what's on your plate, by voice or text, and I'll sort it into what matters first.
              </p>
            </div>
          </div>
        )}
      </main>

      <div className="sticky bottom-0 -mx-6 bg-gradient-to-t from-background via-background to-transparent px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <button
          onClick={next}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80"
        >
          {step === "welcome" ? "Get started" : step === "done" ? `Start with ${assistantName}` : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

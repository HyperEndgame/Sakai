import { useEffect, useRef, useState } from "react";
import { Flame, Sparkles, GitCommit, Mail, Calendar as CalIcon, BookOpen, RefreshCw, Mic, ArrowUp } from "lucide-react";
import { apiKey, chatWithSakai, generateBriefing } from "./ai";
import { useStore } from "./store";
import type { Integrations, Quadrant, Task } from "./store";
import { useVoice } from "./useVoice";
import { NewsFeed } from "./NewsFeed";
import { cn } from "./cn";
import { formatDue } from "./date";
import { previewChipClass, sampleBriefingText, sampleStories } from "./samples";

const priorityOrder: Quadrant[] = ["urgent-important", "important", "urgent", "low"];

function greeting(hour: number, name: string) {
  const hello = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${hello}, ${name}.`;
}

function nextOpenTask(open: Task[], topAction: string | undefined): Task | undefined {
  const matched = topAction ? open.find((t) => topAction.includes(t.title)) : undefined;
  if (matched) return matched;
  for (const q of priorityOrder) {
    const found = open.find((t) => t.quadrant === q);
    if (found) return found;
  }
  return undefined;
}

function integrationChips(i: Integrations) {
  const chips: { icon: React.ReactNode; label: string }[] = [];
  const gmail = i.gmailStatus?.match(/Scanned (\d+) emails/)?.[1];
  if (i.gmailClientId && gmail) chips.push({ icon: <Mail className="h-3 w-3" />, label: `${gmail} emails` });
  const gcal = i.gcalStatus?.match(/\((\d+) in feed\)/)?.[1];
  if (i.gcalIcs && gcal) chips.push({ icon: <CalIcon className="h-3 w-3" />, label: `${gcal} events` });
  if (i.canvasIcs && i.canvasStatus) chips.push({ icon: <BookOpen className="h-3 w-3" />, label: "Canvas" });
  const commits = i.githubStatus?.match(/(\d+) commits/)?.[1];
  if (i.githubUser && commits) chips.push({ icon: <GitCommit className="h-3 w-3" />, label: `${commits} commits` });
  return chips;
}

export function Dashboard({ onOpenTasks }: { onOpenTasks: () => void }) {
  const { state, dispatch } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [lastReply, setLastReply] = useState("");
  const { listening, toggle } = useVoice((t) => sendChat(t));
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const stale = state.briefing?.date !== today;
  const hasBriefing = !!state.briefing && !stale;
  const hasStories = hasBriefing && !!state.briefing!.stories?.length;
  const open = state.tasks.filter((t) => !t.done);
  const next = nextOpenTask(open, state.briefing?.topAction);
  const chips = integrationChips(state.integrations);
  const dateLine = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  async function refresh() {
    if (!apiKey(state)) {
      setError("Add your Anthropic API key in Settings first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const b = await generateBriefing(state);
      for (const p of b.priorities) {
        dispatch({ type: "update-task", id: p.id, patch: { quadrant: p.quadrant, why: p.why } });
      }
      dispatch({
        type: "set-briefing",
        briefing: { date: today, text: b.text, topAction: b.topAction, news: b.news, stories: b.stories, pattern: b.pattern },
      });
    } catch (e: any) {
      setError(e.message ?? "Briefing failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendChat(text: string) {
    const msg = text.trim();
    if (!msg || chatBusy) return;
    if (!apiKey(state)) {
      setLastReply("Add your Anthropic API key in Settings first.");
      return;
    }
    setInput("");
    setLastReply("");
    dispatch({ type: "chat", msg: { role: "user", text: msg } });
    setChatBusy(true);
    try {
      const reply = await chatWithSakai(state, dispatch, msg);
      dispatch({ type: "chat", msg: { role: "assistant", text: reply } });
      setLastReply(reply);
    } catch (e: any) {
      setLastReply(`Error: ${e.message}`);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{dateLine}</p>
        <h1 className="font-serif text-3xl leading-[1.05] tracking-tight sm:text-4xl">{greeting(now.getHours(), state.name)}</h1>
        <p className="text-sm text-muted-foreground">What can I help you with?</p>
      </section>

      {next && (
        <button
          onClick={onOpenTasks}
          className="flex w-full items-center gap-3 rounded-full border border-border bg-card/60 px-4 py-2.5 text-left text-xs transition-colors hover:border-primary/40"
        >
          <Flame className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-muted-foreground">Next · </span>
            <span className="font-medium">{next.title}</span>
          </span>
          {next.due && <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">Due {formatDue(next.due)}</span>}
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendChat(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          <button
            type="button"
            aria-label={listening ? "Stop listening" : "Start voice input"}
            onClick={toggle}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
              listening ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Mic className={cn("h-4 w-4", listening && "animate-pulse")} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat(input);
              }
            }}
            placeholder={listening ? "Listening…" : "Type or speak an update"}
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || chatBusy}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
      {lastReply && <p className="px-1 text-xs text-muted-foreground">{lastReply}</p>}

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Daily briefing
            {!hasBriefing && <span className={previewChipClass}>Preview</span>}
          </div>
          <button onClick={refresh} disabled={busy} aria-label="Refresh briefing" className="text-muted-foreground transition-colors hover:text-foreground">
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
          </button>
        </div>
        <p className="mt-3 font-serif text-lg leading-relaxed">{hasBriefing ? state.briefing!.text : sampleBriefingText}</p>
        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {chips.map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1">
                {c.icon}
                {c.label}
              </span>
            ))}
          </div>
        )}
        {!hasBriefing && (
          <button className="mt-4 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={refresh} disabled={busy}>
            {busy ? "Thinking…" : "Generate briefing"}
          </button>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </section>

      <NewsFeed stories={hasStories ? state.briefing!.stories! : sampleStories} preview={!hasStories} />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Mic, ArrowUp, Sparkles } from "lucide-react";
import { apiKey, chatWithSakai } from "./ai";
import { useStore } from "./store";
import { useVoice } from "./useVoice";
import { cn } from "./cn";

const suggestions = [
  "I finished my Eagle Scout requirement",
  "Made $699 from a client",
  "English essay due Aug 10",
  "Plan my week",
];

export function Chat() {
  const { state, dispatch } = useStore();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { listening, toggle } = useVoice((t) => send(t));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chat, busy]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    if (!apiKey(state)) {
      dispatch({ type: "chat", msg: { role: "assistant", text: "Add your Anthropic API key in Settings first." } });
      return;
    }
    setInput("");
    dispatch({ type: "chat", msg: { role: "user", text: msg } });
    setBusy(true);
    try {
      const reply = await chatWithSakai(state, dispatch, msg);
      dispatch({ type: "chat", msg: { role: "assistant", text: reply } });
    } catch (e: any) {
      dispatch({ type: "chat", msg: { role: "assistant", text: `Error: ${e.message}` } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-11rem)] flex-col">
      <header className="space-y-1 pb-4">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Assistant</p>
        <h1 className="font-serif text-3xl tracking-tight">Talk to Sakai</h1>
      </header>

      <div className="flex-1 space-y-4 pb-6">
        {state.chat.length === 0 && (
          <div className="flex max-w-[85%] gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              Hey — I'm Sakai. Tell me what changed today and I'll update the right place. You can also just talk if it's easier.
            </p>
          </div>
        )}
        {state.chat.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" ? (
              <div className="flex max-w-[85%] gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm leading-relaxed text-foreground">{m.text}</p>
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</div>
            )}
          </div>
        ))}
        {busy && <p className="text-sm text-muted-foreground">Thinking…</p>}
        <div ref={endRef} />
      </div>

      {state.chat.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-24 z-10"
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
                send(input);
              }
            }}
            placeholder={listening ? "Listening…" : "Type or speak an update"}
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

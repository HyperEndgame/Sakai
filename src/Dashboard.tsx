import { useState } from "react";
import { apiKey, chatWithRohtak, generateBriefing } from "./ai";
import { useStore } from "./store";
import { useVoice } from "./useVoice";

function greeting(name: string): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return `Morning, ${name}.`;
  if (h >= 12 && h < 17) return `Afternoon, ${name}.`;
  if (h >= 17 && h < 22) return `Evening, ${name}.`;
  return `Still up, ${name}.`;
}

function integrationChips(i: import("./store").Integrations) {
  const chips: string[] = [];
  const gmail = i.gmailStatus?.match(/Scanned (\d+) emails/)?.[1];
  if (i.gmailClientId && gmail) chips.push(`${gmail} emails`);
  const gcal = i.gcalStatus?.match(/\((\d+) in feed\)/)?.[1];
  if (i.gcalIcs && gcal) chips.push(`${gcal} events`);
  if (i.canvasIcs && i.canvasStatus) chips.push("Canvas");
  const commits = i.githubStatus?.match(/(\d+) commits/)?.[1];
  if (i.githubUser && commits) chips.push(`${commits} commits`);
  return chips;
}

export function Dashboard({ onOpenTasks }: { onOpenTasks: () => void }) {
  const { state, dispatch } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [lastReply, setLastReply] = useState("");
  const { listening, toggle } = useVoice((t) => sendChat(t));

  const today = new Date().toISOString().slice(0, 10);
  const stale = state.briefing?.date !== today;
  const open = state.tasks.filter((t) => !t.done);
  const nextTask = state.briefing?.topAction
    ? open.find((t) => state.briefing!.topAction.includes(t.title)) ?? open[0]
    : open[0];
  const chips = integrationChips(state.integrations);

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
      dispatch({ type: "set-briefing", briefing: { date: today, text: b.text, topAction: b.topAction, news: b.news } });
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
    setChatInput("");
    setLastReply("");
    dispatch({ type: "chat", msg: { role: "user", text: msg } });
    setChatBusy(true);
    try {
      const reply = await chatWithRohtak(state, dispatch, msg);
      dispatch({ type: "chat", msg: { role: "assistant", text: reply } });
      setLastReply(reply);
    } catch (e: any) {
      setLastReply(`Error: ${e.message}`);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="home-date">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
      <h1 className="home-greeting">{greeting(state.name)}</h1>
      <p className="home-sub muted">Here's your day.</p>

      {nextTask && (
        <button className="next-task" onClick={onOpenTasks}>
          <span className="next-task-dot" />
          <span className="next-task-text">
            <span className="muted small">Next</span>
            <span>{nextTask.title}</span>
          </span>
          <span className="muted small">Open →</span>
        </button>
      )}

      <div className="home-chat-bar">
        <button className={listening ? "mic on" : "mic"} onClick={toggle} aria-label="Voice input">
          {listening ? "●" : "🎙"}
        </button>
        <input
          className="input"
          placeholder="Tell Rohtak what changed…"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendChat(chatInput)}
        />
        <button className="btn" onClick={() => sendChat(chatInput)} disabled={chatBusy}>
          {chatBusy ? "…" : "Send"}
        </button>
      </div>
      {lastReply && <p className="muted small home-chat-reply">{lastReply}</p>}

      <section className="card accent">
        <div className="card-label">Daily briefing</div>
        {state.briefing && !stale ? (
          <>
            <p>{state.briefing.text}</p>
            {state.briefing.news && (
              <>
                <div className="card-label" style={{ marginTop: 12 }}>News for you</div>
                <p>{state.briefing.news}</p>
              </>
            )}
          </>
        ) : (
          <p className="muted">No briefing for today yet.</p>
        )}
        {chips.length > 0 && (
          <div className="chip-row">
            {chips.map((c) => <span key={c} className="chip">{c}</span>)}
          </div>
        )}
        <button className="btn" onClick={refresh} disabled={busy}>
          {busy ? "Thinking…" : stale ? "Generate briefing" : "Refresh briefing"}
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
}

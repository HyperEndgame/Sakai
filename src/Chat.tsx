import { useEffect, useRef, useState } from "react";
import { apiKey, chatWithRohtak } from "./ai";
import { useStore } from "./store";
import { useVoice } from "./useVoice";

export function Chat() {
  const { state, dispatch } = useStore();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
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
      const reply = await chatWithRohtak(state, dispatch, msg);
      dispatch({ type: "chat", msg: { role: "assistant", text: reply } });
    } catch (e: any) {
      dispatch({ type: "chat", msg: { role: "assistant", text: `Error: ${e.message}` } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page chat-page">
      <h1>Chat</h1>
      <div className="chat-log">
        {state.chat.length === 0 && (
          <p className="muted">
            Tell me anything — "essay due August 10", "made $699 from my client", "finished my Eagle Scout
            requirement" — and I'll update your dashboard.
          </p>
        )}
        {state.chat.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
        ))}
        {busy && <div className="bubble assistant muted">Thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="chat-bar">
        <button className={listening ? "mic on" : "mic"} onClick={toggle} aria-label="Voice input">
          {listening ? "●" : "🎙"}
        </button>
        <input
          className="input"
          placeholder="Type or speak…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
        />
        <button className="btn" onClick={() => send(input)} disabled={busy}>Send</button>
      </div>
    </div>
  );
}

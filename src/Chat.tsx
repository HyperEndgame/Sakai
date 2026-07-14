import { useEffect, useRef, useState } from "react";
import { chatWithSakai } from "./ai";
import { useStore } from "./store";

// ponytail: Web Speech API (built into Android WebView/Chrome); swap for a native
// speech plugin if recognition quality disappoints
function useVoice(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  function toggle() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input not supported on this device.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => onText(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return { listening, toggle };
}

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
    if (!state.apiKey) {
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
    <div className="page chat-page">
      <h1>Sakai</h1>
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

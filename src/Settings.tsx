import { useStore } from "./store";

// ponytail: integrations are stubs — each needs OAuth credentials that can't ship in an APK.
// Wire them through Supabase Edge Functions when accounts are ready.
const integrations = ["Gmail", "Google Calendar", "GitHub", "Canvas", "Discord", "Claude Code"];

export function Settings() {
  const { state, dispatch } = useStore();

  return (
    <div className="page">
      <h1>Settings</h1>

      <section className="card">
        <div className="card-label">Anthropic API key</div>
        <input
          className="input"
          type="password"
          placeholder="sk-ant-…"
          value={state.apiKey}
          onChange={(e) => dispatch({ type: "settings", patch: { apiKey: e.target.value } })}
        />
        <p className="muted small">Stored only on this device. Powers briefings and the assistant.</p>
      </section>

      <section className="card">
        <div className="card-label">Model</div>
        <select
          className="input"
          value={state.model}
          onChange={(e) => dispatch({ type: "settings", patch: { model: e.target.value } })}
        >
          <option value="claude-haiku-4-5-20251001">Haiku 4.5 (fast, cheap)</option>
          <option value="claude-sonnet-5">Sonnet 5 (smart)</option>
        </select>
      </section>

      <section className="card">
        <div className="card-label">Interests (personalizes your briefing)</div>
        <input
          className="input"
          placeholder="e.g. AI, web dev, scouting, fitness"
          value={state.interests}
          onChange={(e) => dispatch({ type: "settings", patch: { interests: e.target.value } })}
        />
      </section>

      <section className="card">
        <div className="card-label">Integrations</div>
        {integrations.map((name) => (
          <div key={name} className="task-row">
            <span>{name}</span>
            <span className="muted small">Coming soon</span>
          </div>
        ))}
      </section>
    </div>
  );
}

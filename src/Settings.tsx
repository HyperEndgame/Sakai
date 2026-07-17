import { Integrations } from "./Integrations";
import { useStore } from "./store";
import type { State, Theme } from "./store";

type SettingsPatch = Partial<Pick<State, "interests" | "apiKey" | "model" | "name" | "theme" | "decorations">>;

export function Settings() {
  const { state, dispatch } = useStore();
  const set = (patch: SettingsPatch) => dispatch({ type: "settings", patch });

  return (
    <div className="page">
      <h1>Settings</h1>

      <section className="card">
        <div className="card-label">Profile</div>
        <input
          className="input"
          placeholder="Your name"
          value={state.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </section>

      <section className="card">
        <div className="card-label">Customization</div>
        <div className="row">
          {(["system", "light", "dark"] as Theme[]).map((t) => (
            <button
              key={t}
              className={state.theme === t ? "btn" : "ghost"}
              onClick={() => set({ theme: t })}
              style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 10 }}
            >
              {t === "system" ? "Auto" : t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
        <label className="task-row" style={{ marginTop: 4 }}>
          <span>
            Ambient decoration
            <div className="muted small">Cherry blossom in light mode, constellation in dark mode</div>
          </span>
          <input
            type="checkbox"
            checked={state.decorations}
            onChange={(e) => set({ decorations: e.target.checked })}
          />
        </label>
      </section>

      <section className="card">
        <div className="card-label">Anthropic API key</div>
        <input
          className="input"
          type="password"
          placeholder="sk-ant-…"
          value={state.apiKey}
          onChange={(e) => set({ apiKey: e.target.value })}
        />
        <p className="muted small">
          {!state.apiKey && import.meta.env.VITE_ANTHROPIC_API_KEY
            ? "Built-in key active. Paste your own to override."
            : "Stored only on this device. Powers briefings and the assistant."}
        </p>
      </section>

      <section className="card">
        <div className="card-label">Model</div>
        <select
          className="input"
          value={state.model}
          onChange={(e) => set({ model: e.target.value })}
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
          onChange={(e) => set({ interests: e.target.value })}
        />
      </section>

      <h1 style={{ marginTop: 8 }}>Connect</h1>
      <Integrations />
    </div>
  );
}

import { useState } from "react";
import { useStore } from "./store";
import type { SettingsPatch } from "./store";
import { listFreeModels, pickFreeModel } from "./ai";
import { Field, Segmented, inputClass, modelOptions } from "./fields";
import { cn } from "./cn";

const providers = [
  { id: "claude", label: "Claude" },
  { id: "freellmapi", label: "FreeLLMAPI" },
] as const;

// Suggested ids from the router's catalog, best fit for Sakai first.
const favorites = [/gpt-oss-120b/i, /llama-3\.3-70b/i, /nemotron.*super/i, /glm-4\.7/i];

// Provider + key + model, shared by onboarding and Settings → AI & keys.
export function AiSetup() {
  const { state, dispatch } = useStore();
  const set = (patch: SettingsPatch) => dispatch({ type: "settings", patch });
  const [status, setStatus] = useState("");
  const [ids, setIds] = useState<string[]>([]);

  async function connect() {
    setStatus("Connecting…");
    try {
      const all = await listFreeModels(state);
      setIds(all);
      if (!state.llmModel) set({ llmModel: pickFreeModel(all) });
      setStatus(`Connected · ${all.length} models`);
    } catch (e: any) {
      setStatus(e?.message ?? "Couldn't reach the router");
    }
  }

  const suggestions = [
    ...favorites.map((re) => ids.find((id) => re.test(id))).filter((id): id is string => !!id),
    "auto:smart",
    "auto:fast",
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Provider</span>
        <Segmented label="AI provider" value={state.provider} options={providers} onChange={(p) => set({ provider: p })} />
      </div>

      {state.provider === "claude" ? (
        <>
          <Field label="Anthropic API key" hint="Stored only on this device.">
            <input className={inputClass} type="password" autoComplete="off" placeholder="sk-ant-…" value={state.apiKey} onChange={(e) => set({ apiKey: e.target.value })} />
          </Field>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Model</span>
            <Segmented label="Model" value={state.model as (typeof modelOptions)[number]["id"]} options={modelOptions} onChange={(m) => set({ model: m })} />
          </div>
        </>
      ) : (
        <>
          <Field label="Router address" hint="Your FreeLLMAPI server as seen from this phone, e.g. http://192.168.4.175:31415">
            <input
              className={inputClass}
              inputMode="url"
              autoCapitalize="off"
              autoComplete="off"
              placeholder="http://192.168.x.x:31415"
              value={state.llmBase}
              onChange={(e) => set({ llmBase: e.target.value })}
            />
          </Field>
          <Field label="Unified key" hint="Keys page header in the FreeLLMAPI dashboard.">
            <input className={inputClass} type="password" autoComplete="off" placeholder="freellmapi-…" value={state.llmKey} onChange={(e) => set({ llmKey: e.target.value })} />
          </Field>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Model</span>
              <button
                type="button"
                onClick={connect}
                disabled={!state.llmBase.trim() || !state.llmKey.trim()}
                className="min-h-9 rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-40"
              >
                Connect
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={state.llmModel === id}
                  onClick={() => set({ llmModel: id })}
                  className={cn(
                    "min-h-8 rounded-full border px-3 text-xs transition-colors",
                    state.llmModel === id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {id}
                </button>
              ))}
            </div>
            <input
              className={inputClass}
              autoCapitalize="off"
              autoComplete="off"
              placeholder="auto:smart"
              value={state.llmModel}
              onChange={(e) => set({ llmModel: e.target.value })}
              aria-label="Model id"
            />
            {status && <p className="text-xs text-muted-foreground">{status}</p>}
          </div>
        </>
      )}
    </div>
  );
}

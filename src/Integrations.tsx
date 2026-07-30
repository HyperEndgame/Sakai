import { useState } from "react";
import { syncCanvas, syncGcal, syncGithub } from "./sync";
import { syncGmail } from "./gmail";
import { useStore } from "./store";

function Card(props: {
  title: string;
  desc: string;
  status: string;
  canSync: boolean;
  onSync: () => Promise<string>;
  statusKey: "githubStatus" | "canvasStatus" | "gcalStatus" | "gmailStatus";
  children: React.ReactNode;
}) {
  const { dispatch } = useStore();
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    try {
      const msg = await props.onSync();
      dispatch({ type: "integrations", patch: { [props.statusKey]: msg } });
    } catch (e: any) {
      dispatch({ type: "integrations", patch: { [props.statusKey]: `Failed: ${e.message}` } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{props.title}</p>
      <p className="text-xs text-muted-foreground">{props.desc}</p>
      {props.children}
      <button
        onClick={sync}
        disabled={busy || !props.canSync}
        className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Syncing…" : "Sync now"}
      </button>
      {props.status && (
        <p className={props.status.startsWith("Failed") ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{props.status}</p>
      )}
    </section>
  );
}

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none";

export function Integrations() {
  const { state, dispatch } = useStore();
  const i = state.integrations;
  const set = (patch: Partial<typeof i>) => dispatch({ type: "integrations", patch });

  return (
    <div className="space-y-2">
      <Card
        title="GitHub"
        desc="Tracks your coding activity — commits and active repos this week."
        status={i.githubStatus}
        canSync={!!i.githubUser}
        statusKey="githubStatus"
        onSync={() => syncGithub(state)}
      >
        <input className={inputClass} placeholder="GitHub username" value={i.githubUser} onChange={(e) => set({ githubUser: e.target.value })} />
        <input className={inputClass} type="password" placeholder="Token (needed for private repos)" value={i.githubToken} onChange={(e) => set({ githubToken: e.target.value })} />
      </Card>

      <Card
        title="Canvas"
        desc="Imports upcoming assignments as school tasks. Canvas → Calendar → Calendar Feed → copy the .ics link."
        status={i.canvasStatus}
        canSync={!!i.canvasIcs}
        statusKey="canvasStatus"
        onSync={() => syncCanvas(state, dispatch)}
      >
        <input className={inputClass} placeholder="Canvas calendar feed URL (.ics)" value={i.canvasIcs} onChange={(e) => set({ canvasIcs: e.target.value })} />
      </Card>

      <Card
        title="Google Calendar"
        desc="Imports upcoming events. Google Calendar → Settings → your calendar → Secret address in iCal format."
        status={i.gcalStatus}
        canSync={!!i.gcalIcs}
        statusKey="gcalStatus"
        onSync={() => syncGcal(state, dispatch)}
      >
        <input className={inputClass} placeholder="Secret iCal URL" value={i.gcalIcs} onChange={(e) => set({ gcalIcs: e.target.value })} />
      </Card>

      <Card
        title="Gmail"
        desc="Scans recent emails for real deadlines and action items — skips newsletters and receipts. Needs a Google OAuth Client ID: Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application), add this app's origin, enable the Gmail API."
        status={i.gmailStatus}
        canSync={!!i.gmailClientId}
        statusKey="gmailStatus"
        onSync={() => syncGmail(state, dispatch)}
      >
        <input className={inputClass} placeholder="Google OAuth Client ID" value={i.gmailClientId} onChange={(e) => set({ gmailClientId: e.target.value })} />
      </Card>

      <section className="space-y-1 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Coming later</p>
        <div className="flex items-center justify-between text-sm">
          <span>Claude Code</span>
          <span className="text-xs text-muted-foreground">Desktop sync, phase 2</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Discord DMs</span>
          <span className="text-xs text-muted-foreground">Blocked — reading DMs violates Discord ToS</span>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">Calendar feeds may be blocked by the browser on web — they sync fine in the Android app.</p>
    </div>
  );
}

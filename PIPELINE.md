# Sakai — pipeline

## Structure
- `src/store.tsx` — state (tasks/finances/goals/chat/briefing/settings), reducer, localStorage persistence, rule-based quadrant fallback
- `src/ai.ts` — Anthropic API calls: daily briefing (JSON), chat with tool-use (add_task, complete_task, log_finance, update_goal)
- `src/Dashboard.tsx` — briefing, top-ROI action, Eisenhower quadrants, stats, goals
- `src/Tasks.tsx` — task CRUD
- `src/Chat.tsx` — assistant chat + voice (Web Speech API)
- `src/Settings.tsx` — BYOK API key, model, interests, integration stubs
- `src/notify.ts` — Capacitor ongoing notification dashboard
- Capacitor wraps the Vite build into an Android APK (`npm run android`)

## v0.1 (2026-07-13, one-shot per user request — no agent loop)
- Plan: MVP of the /goal spec. Skipped: OAuth integrations (Gmail/Calendar/GitHub/Canvas/Discord — need real credentials), Supabase (localStorage until multi-device sync needed), Kotlin foreground service (Capacitor ongoing notification first), desktop app, external news API (briefing covers it).
- Issues found: none yet.

## v0.2 (2026-07-13)
- Connect tab (`src/Integrations.tsx` + `src/sync.ts`): GitHub activity (public events API), Canvas + Google Calendar via ICS feed import → deduplicated tasks with `source` field. CapacitorHttp dodges CORS on-device; browser may block feeds (works in APK). Gmail (needs OAuth app), Claude Code (phase 2), Discord (ToS-blocked) documented in-app.
- Built-in API key: `VITE_ANTHROPIC_API_KEY` from gitignored `.env`, Settings key overrides (`apiKey()` in ai.ts).
- News brief: briefing now uses the `web_search` server tool, returns a personalized 1-2 sentence news item.
- `android/` committed (Capacitor scaffold + notification/mic permissions). Build assets gitignored — run `npm run build && npx cap sync android` before gradle. No SDK on this machine, so APK compile is on the user in Android Studio.
- Kotlin `DashboardService` (android-extras/) NOT wired in — it polls Supabase, which isn't deployed. Capacitor ongoing notification covers the persistent dashboard until then.
- `supabase/` (edge functions + migration from parallel session) committed for the future Supabase move; not deployed.
- Renamed `integrations.ts` → `sync.ts` (Windows case-collision with `Integrations.tsx` broke tsc).
- Issues found: none yet.
- Debug APK built locally via `gradlew assembleDebug` (JAVA_HOME/ANDROID_HOME pointed at Android Studio's bundled JBR + SDK) → `android/app/build/outputs/apk/debug/app-debug.apk`.

## v0.3 (2026-07-17)
- Gmail integration (`src/gmail.ts`): client-side OAuth via Google Identity Services token client (gmail.readonly scope, no backend/refresh token needed — matches the BYOK pattern used for GitHub/Anthropic). User pastes a Google OAuth Client ID in the Connect tab (`gmailClientId` in `integrations` state); sync fetches last 3 days of messages, sends subject/from/snippet digest to Claude to extract real action items (skips newsletters/receipts), imports as tasks with `source: "gmail"`.
- Not tested end-to-end — needs a real Google Cloud OAuth client ID from the user (Console → Credentials → OAuth client ID → Web application → add app origin, enable Gmail API). Code path verified via `tsc` typecheck + build only.
- Remaining gaps, deliberately left as-is:
  - Kotlin `DashboardService` (android-extras/) still not wired — Capacitor's ongoing notification (`src/notify.ts`) already covers the "persistent dashboard" requirement without needing Supabase deployed; wiring the Kotlin service is only worth it once multi-device sync is needed.
  - Discord DMs: permanently blocked, reading DMs violates Discord ToS. Not a gap to close.
  - Claude Code desktop sync + full desktop app: explicitly phase 2 in the original spec, needs the Supabase backend deployed first as the sync layer.
- Issues found: none yet.

# Rohtak (formerly Sakai) — pipeline

## Structure
- `src/store.tsx` — state (tasks/finances/goals/chat/briefing/settings/name/theme/decorations), reducer, localStorage persistence, rule-based quadrant fallback
- `src/ai.ts` — Anthropic API calls: daily briefing (JSON), chat with tool-use (add_task, complete_task, log_finance, update_goal)
- `src/theme.ts` — resolves light/dark/system, applies `data-theme` to `<html>`
- `src/Header.tsx` + `src/Logo.tsx` + `src/icons.tsx` — shared top bar, minimal placeholder mark, inline SVG icon set
- `src/Decorations.tsx` — ambient CherryBlossom (light) / Constellation (dark) overlays, toggled in Settings
- `src/Dashboard.tsx` — Home tab: greeting, small next-task card, chat bar (primary input), daily briefing + integration chips
- `src/Tasks.tsx` — task CRUD, Eisenhower quadrant grouping with colored dots + why-pills
- `src/Calendar.tsx` — agenda view of tasks with due dates
- `src/Insights.tsx` — life-areas grid (derived from tasks/goals) + goals list + stats (moved off Home)
- `src/Chat.tsx` + `src/useVoice.ts` — assistant chat + shared voice-input hook
- `src/Settings.tsx` — Profile, Customization (theme + decorations), API key, model, interests, embedded Connect (Integrations) section
- `src/notify.ts` — persistent Android notification (Kotlin foreground service via DashboardBridge plugin)
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

## v0.4 (2026-07-17)
- Wired the Kotlin `DashboardService` for real: added `org.jetbrains.kotlin.android` to `android/build.gradle` + `android/app/build.gradle` (Kotlin wasn't configured at all before — `compileDebugKotlin` now runs as part of `assembleDebug`).
- Rewrote `DashboardService.kt` to read a local snapshot (`SharedPreferences("sakai")` keys `dash_title`/`dash_body`) instead of polling Supabase — removes the hard dependency on an undeployed backend. Refreshes every 30s from the local snapshot; JS writes the snapshot on every state change.
- New `DashboardBridge.kt`: minimal custom Capacitor plugin (`@CapacitorPlugin`) exposing `save({title, body})` — writes the SharedPreferences snapshot and starts the foreground service (`startForegroundService`, `START_STICKY`, survives the app being swiped away). Registered in `MainActivity.java` via `registerPlugin(DashboardBridge.class)`.
- `src/notify.ts` now calls `DashboardBridge.save(...)` first, falling back to the old dismissible `LocalNotifications` entry only if the native plugin call throws (e.g. a stale build without `cap sync`).
- Manifest: added `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_DATA_SYNC` permissions and `<service android:name=".DashboardService" foregroundServiceType="dataSync">`.
- This closes the "persistent notification dashboard" requirement for real — it's now a true non-dismissible Android foreground service, not just a JS-driven notification that only updates while the app runs.
- `DESKTOP.md`: architecture doc for the future desktop app + Claude Code sync, as the original spec literally asked ("create architecture that supports a future computer app") rather than a built app. Covers: Supabase as the shared sync layer (schema already exists in `supabase/migrations/0001_init.sql`, realtime already enabled on `tasks`/`briefings`), how a desktop client would reuse the same `ai.ts` tool-use contract, how Claude Code sync would push session summaries via a new `dev_sessions` table (schema included, not yet migrated), and the exact deploy path once someone actually stands up a Supabase project.
- Still not done, and why:
  - **Supabase not deployed** — needs a real Supabase project (URL + service key), which requires the user's own account; not something buildable without those credentials. `DESKTOP.md` has the exact deploy commands for when that's ready.
  - **Discord DMs** — not a gap, a permanent no. Reading DMs outside Discord's official bot API (which can't read DM history without being a participant) violates Discord ToS.
  - **Full desktop app** — the spec asked for architecture, not a build; `DESKTOP.md` is that architecture. Building the actual desktop client is real new scope (a whole second app), not something implied by "create architecture."
- Issues found: none yet — `assembleDebug` confirmed `compileDebugKotlin` succeeds and the APK packages cleanly.

## v0.5 (2026-07-17) — full home/tasks redesign + rebrand to Rohtak

**Plan**: opus advisor was unavailable this session ("temporarily disabled for this conversation"); sonnet planned and built directly from the user's 4 reference mockups (light/dark Home, light/dark Tasks) plus explicit written deltas from those mockups: chat bar becomes the primary interaction (moved to top-middle of Home, replaces the mockup's "Tell Sakai what changed" widget entirely), a small next-task card sits above it, the daily briefing card sits below it, "Life areas" moves off Home onto a new Insights tab, bottom nav gains Calendar + Settings, branding changes to "Rohtak" with a new placeholder mark (two offset rings) replacing the "S" avatar, and Settings gets a Customization page for a light-mode cherry-blossom / dark-mode constellation ambient decoration toggle. Ran `/impeccable` first per project rules — no PRODUCT.md existed, so ran a short confirmation interview (register, personality, anti-refs, a11y) via AskUserQuestion and wrote `PRODUCT.md`; skipped a separate DESIGN.md generation pass since the existing `app.css` tokens were already read directly and matched the mockups closely (identity-preservation — no new palette needed, just a dark-mode variant).

**Built**:
- State: `name` (default "Hyper"), `theme` ("light"|"dark"|"system", default "system"), `decorations` (boolean, default true) added to `store.tsx`.
- `theme.ts`: `useApplyTheme` resolves system preference via `matchMedia`, live-updates on OS theme change, sets `document.documentElement.dataset.theme`.
- Dark mode tokens added to `app.css` under `:root[data-theme="dark"]` — warm near-black bg/surface, lighter coral accent for contrast, kept the same token names so no component code needed to branch on theme.
- `Header.tsx` (Logo + "Rohtak" wordmark + theme toggle) rendered once in `App.tsx`, shared across all tabs.
- `Decorations.tsx`: `CherryBlossom` (light) and `Constellation` (dark) — CSS-keyframe driven, seeded-pseudorandom layout (not `Math.random()` directly, so layout doesn't reshuffle every render), full `prefers-reduced-motion` static fallback per `PRODUCT.md`'s accessibility requirement. Rendered conditionally in `App.tsx` based on `state.decorations` + resolved theme.
- `Dashboard.tsx` rewritten: time-of-day greeting (`"Still up, {name}."` late at night, matching the mockup exactly), small `next-task` mini-card (button, navigates to Tasks via an `onOpenTasks` prop from `App.tsx`), a chat bar reusing `chatWithSakai` + the extracted `useVoice` hook for quick capture (shows the reply inline, also appends to the shared `state.chat` history so the Chat tab stays in sync), briefing card below with integration-status chips (regex-parsed from the existing `githubStatus`/`gcalStatus`/`gmailStatus` strings — no new tracking state). Stats row and Life-areas grid removed from Home.
- `Insights.tsx` (new tab): life-areas grid for school/projects/coding/business(labeled "Finances")/fitness/scouts, percent derived from goals (if any exist for that area) else task completion ratio, plus the Goals list and stats row moved off Home.
- `Calendar.tsx` (new tab): agenda list grouped by due date + an Overdue section — deliberately not a month grid, same information with far less code.
- `Tasks.tsx`: quadrant groups now show colored dots + "Do first/Schedule/Delegate/Later" labels matching the mockup; the AI's `why` explanation now renders in a soft `.why-pill` box instead of plain muted text.
- `Settings.tsx`: added Profile (name) and Customization (theme picker + decorations toggle) sections; `Integrations.tsx` lost its own page wrapper and is now embedded under a "Connect" heading at the bottom of Settings, since Connect is no longer a top-level tab.
- `App.tsx`: bottom nav is now Home/Chat/Tasks/Calendar/Insights/Settings (6 tabs, icon + label) using a new minimal inline SVG icon set (`icons.tsx`) — no icon library added.
- Rebrand: "Sakai" → "Rohtak" in `index.html` title, `capacitor.config.ts` appName, `android/app/src/main/res/values/strings.xml` (app_name, title_activity_main), `notify.ts` notification title, `DashboardService.kt` notification channel name — package ID (`com.hyperendgame.sakai`) and repo name deliberately left unchanged (a rename there is a much bigger, riskier move than a display-name change, not implied by "change the name").
- `useVoice` extracted from `Chat.tsx` into `useVoice.ts` so `Dashboard.tsx`'s chat bar could reuse it instead of duplicating the Web Speech API wrapper.

**Verification**: `npm run build` (tsc + vite build) passes clean. Browser-driven verification hit a degraded session (the `computer` screenshot tool timed out repeatedly this run, and a couple of ref-based clicks didn't land), so verification leaned on `read_page`/`get_page_text`/direct JS `.click()` + `getComputedStyle` checks instead: confirmed Home renders the greeting/next-task/chat-bar/briefing structure in the right order, dark-mode toggle correctly flips `data-theme` and cascades through `--bg`/etc. (confirmed via `getComputedStyle`, not a visual screenshot), Tasks/Calendar/Insights/Settings all render and are reachable, adding a task and clicking "Open →" from the Home next-task card correctly navigates to Tasks and shows it grouped under "Later · Low priority".

**Haiku review**: dispatched, scoped to the specific things not manually verified — the `nextTask`/`integrationChips` regex parsing in `Dashboard.tsx` against the real status strings in `sync.ts`/`gmail.ts`, `Decorations.tsx`/CSS class-name matching, `theme.ts` hook-rule correctness, `Settings.tsx`'s `SettingsPatch` type against the store's `Action` type, leftover references to the old 5-tab structure, and `notify.ts` still matching the `DashboardBridge` native contract.

Findings (all fixed):
1. **Real bug** — `integrationChips`'s Gmail chip used a generic `firstNumber()` regex (`/\d+/`) against `gmailStatus`, so a failed sync ("Failed: HTTP 403") would render as "403 emails" instead of being hidden. Fixed by matching the actual success-message shape (`/Scanned (\d+) emails/`) like the GitHub/GCal chips already did — a failure string simply won't match now, no chip shown. (GitHub/GCal chips were already safe: their regexes require literal words — "commits", "in feed" — that don't appear in a "Failed: ..." string.)
2. **Leftover rebrand strings** — the Home chat-bar placeholder ("Tell Sakai what changed…") and the Tasks page subtitle ("Sakai sorts everything...") still said "Sakai". Also caught two Claude system-prompt strings in `ai.ts` ("You are Sakai, a personal chief of staff...") that would have leaked the old name into the assistant's own replies — renamed those and the `chatWithSakai` function (→ `chatWithRohtak`) across `ai.ts`/`Chat.tsx`/`Dashboard.tsx` for consistency.
3. **Defensive, not a real bug** — flagged `Decorations.tsx` petal `width`/`height` as unitless numbers in an inline style object; React auto-appends `px` to numeric dimensional style values so this already worked, but added explicit `px` template strings anyway since it's a zero-risk one-line change that removes any doubt.
4. Everything else came back clean: regex matches for GitHub/GCal chips, `theme.ts` hook rules, `SettingsPatch` vs `Action` type parity, `onOpenTasks` prop wiring, no stale tab-literal references, `notify.ts` vs `DashboardBridge` contract.

Rebuilt (`npm run build` + `assembleDebug`) clean after fixes.

**Known pre-existing issue, not introduced this session**: `sync.ts`'s dev-mode `console.assert` self-check for `parseIcs` was already logging `"parseIcs broken"` in the console before this redesign touched anything (confirmed via `git diff` — `sync.ts` hasn't changed since v0.2). Not investigated further this pass; flagged for a future session.

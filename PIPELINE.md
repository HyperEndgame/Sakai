# Sakai (formerly Rohtak) — pipeline

## Structure
- `src/store.tsx` — state (tasks/finances/goals/chat/briefing/settings/name/theme/decoration/notifications), reducer, localStorage persistence, rule-based quadrant fallback
- `src/ai.ts` — Anthropic API calls: daily briefing (JSON, now incl. `stories`/`pattern`), chat with tool-use (add_task, complete_task, log_finance, update_goal)
- `src/theme.ts` — resolves light/dark/system, toggles the `.dark` class + `color-scheme` on `<html>` (Tailwind v4 dark variant)
- `src/styles.css` — Tailwind v4 entry (oklch design tokens, `@theme inline` mapping, petal/star keyframes, reduced-motion override)
- `src/cn.ts` — `clsx` + `tailwind-merge` helper
- `src/App.tsx` — app shell: header (brand mark + theme toggle), 5-tab bottom nav (lucide icons), renders `Decorations`
- `src/Decorations.tsx` — ambient CherryBlossom (light) / Constellation (dark) / none overlays, 3-way switch on `state.decoration`
- `src/Dashboard.tsx` — Home tab: greeting, next-task card, chat bar (primary input, `chatWithSakai` + `useVoice`), daily briefing + integration chips, `NewsFeed`
- `src/NewsFeed.tsx` — "Your news" cards from `briefing.stories`, CSS gradient tile per category (no image assets)
- `src/Tasks.tsx` — task CRUD, Eisenhower quadrant grouping with colored dots + why-pills
- `src/Insights.tsx` — Daily brief (`briefing.stories`), life-areas grid (derived from tasks/goals) as progress bars, Pattern this week (`briefing.pattern`)
- `src/Chat.tsx` + `src/useVoice.ts` — assistant chat + shared voice-input hook
- `src/Settings.tsx` — index (Appearance + 4 rows) + local-`useState` sub-pages: Customization (theme + 3 decoration previews), Notifications, Profile, Privacy & data (API key/model/interests + Integrations)
- `src/Integrations.tsx` — Connect cards (GitHub/Canvas/GCal/Gmail), restyled to Tailwind, sync logic untouched
- `src/notify.ts` — persistent Android notification (Kotlin foreground service via DashboardBridge plugin), gated on `state.notifications`
- Capacitor wraps the Vite build into an Android APK (`npm run android`)
- Deleted: `Calendar.tsx`, `icons.tsx`, `Logo.tsx`, `Header.tsx`, `app.css` (folded into `App.tsx` / `styles.css`)

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

## v0.6 (2026-07-30) — Tailwind v4 UI overhaul, port Lovable mockup, rebrand to Sakai

**Plan**: pre-written by the user as `UI_PLAN.md` (not opus this session — the plan was
already settled, task was "follow it, don't redesign it"). Source of truth: Lovable mockup
in `sakai example code/` (6 screen files + `decoration.tsx`/`news-feed.tsx`/`theme.tsx`/
`mock-data.ts`/`styles.css` + 10 screenshots). Decisions locked in the plan: adopt Tailwind
v4 + lucide-react (no Radix, no router — keep the `tab` useState), rebrand app name to
Sakai (mockup's own copy still said "Rohtak" for the *user's* display name — that's
`state.name`, left alone), delete `Calendar.tsx` (5 tabs not 6), `mock-data.ts` is shape
reference only — every screen wires to real `useStore()`.

**Built**:
- Deps: `tailwindcss@4`, `@tailwindcss/vite`, `lucide-react`, `clsx`, `tailwind-merge`,
  `tw-animate-css`. `vite.config.ts` gets the `tailwindcss()` plugin.
- `src/styles.css` (new, replaces `app.css`): Tailwind v4 entry ported verbatim from the
  mockup's tokens (oklch light/dark palette, `@theme inline` mapping, Fraunces/Inter font
  vars, petal-fall/star-twinkle keyframes) with `@source "./"` so Tailwind scans `src/`
  from its own directory. Added one line beyond the mockup: a `prefers-reduced-motion`
  override that kills `.petal`/`.star` animation — `PRODUCT.md` requires a static fallback
  and the Lovable source doesn't have one.
- `src/theme.ts`: switched from `data-theme` attribute to toggling the `.dark` class +
  `style.colorScheme` (Tailwind v4's dark variant is `&:is(.dark *)`). Kept the existing
  3-way `light|dark|system` resolution — did not downgrade to the mockup's 2-way context.
- `src/store.tsx`: `decorations: boolean` → `decoration: "none"|"cherry-blossom"|
  "constellation"` (default `"cherry-blossom"`); added `notifications: boolean` (default
  `true`); `Briefing` gained optional `stories?: Story[]` (exactly 3) and `pattern?: string`
  so old persisted briefings without them still render.
- `src/ai.ts`: `chatWithRohtak` → `chatWithSakai`, both system prompts now say Sakai (were
  leaking "Rohtak" into replies). Briefing JSON extended with `stories` (3 news items:
  category/title/source/time/summary) and `pattern` (one-line weekly observation) — same
  single web-search call, two new consumers (Home + Insights), no second fetch.
- Screens ported near-verbatim from the mockup JSX, `createFileRoute`/`Link`/`useNavigate`
  stripped, `@/lib/mock-data` swapped for `useStore()`:
  - `App.tsx` — folded `Header.tsx`+`Logo.tsx` in, 5-tab nav with lucide icons (deleted
    `icons.tsx`), renders `Decorations` keyed on resolved theme + `state.decoration`.
  - `Dashboard.tsx` — greeting uses `state.name`; next-task picks the highest-priority open
    task by quadrant order (matches `briefing.topAction` first, falls back through
    urgent-important → important → urgent → low); chat bar sends inline via `chatWithSakai`
    + `useVoice` (kept the existing inline-reply UX rather than the mockup's "navigate to
    /chat" — there's no router, and the existing behavior is strictly more useful); briefing
    card + regex-derived source chips (Mail/Calendar/BookOpen/GitCommit icons) unchanged
    logic, restyled.
  - `NewsFeed.tsx` (new) — renders `briefing.stories`; `<img>` replaced with a
    `bg-gradient-to-br` tile keyed on `category` (ai/tech/world/local + fallback), no binary
    image assets ship. Renders nothing when `stories` is absent or the briefing is stale.
  - `Tasks.tsx` — real tasks/quadrants/why-pills in the mockup's card style; kept the add-task
    form and a delete button (mockup has neither, both load-bearing).
  - `Chat.tsx` — `state.chat` + `chatWithSakai` + `useVoice`, kept the 4 suggestion chips.
  - `Insights.tsx` — 3 sections per the mockup exactly: Daily brief (`briefing.stories`, tag/
    title/summary card style — not the image-thumbnail style, that's Home-only), All life
    areas (existing percent derivation from goals/tasks, restyled as progress bars, short
    note per area), Pattern this week (`briefing.pattern`). Dropped the old standalone Goals
    list and stats row — the plan's Insights spec only names these 3 sections and the
    mockup doesn't have them; goal progress still feeds the areas grid.
  - `Settings.tsx` — index (Appearance card + 4 rows) plus 4 sub-pages via local `useState`
    (no router): Customization (3-way theme picker + the 3 decoration preview cards ported
    exact from `_app.settings.customization.tsx`), Notifications (new toggle), Profile
    (name), Privacy & data (API key/model/interests + `Integrations`).
  - `Decorations.tsx` — 3-way switch (`none`/`cherry-blossom`+light/`constellation`+dark),
    kept the existing seeded-PRNG layout and reduced-motion static fallback; restyled with
    Tailwind classes matching the mockup's overlay structure.
  - `Integrations.tsx` — restyled to Tailwind, sync logic (GitHub/Canvas/GCal/Gmail)
    untouched.
- Rebrand "Rohtak" → "Sakai" (app name only — `state.name`/greeting is unaffected):
  `index.html` title + Google Fonts links, `capacitor.config.ts` appName, Android
  `strings.xml` (app_name/title_activity_main), `notify.ts` notification title,
  `DashboardService.kt` channel name + placeholder text.
- Deleted: `Calendar.tsx`, `icons.tsx`, `Logo.tsx`, `Header.tsx`, `app.css`.
- lucide-react 1.28 dropped brand icons (`Github` etc. no longer exported) — swapped for
  `GitCommit` in the Dashboard's commit-count chip, no new dependency.

**Verification**: `npm run build` (tsc + vite build) passes clean. Browser verification:
Playwright's MCP server needs a system `google-chrome` binary this sandbox doesn't have and
can't `apt install` (no sudo); worked around it by installing Playwright's bundled Chromium
directly (`npx playwright install chromium`) and driving it with a throwaway
`playwright-core` script (`/tmp/verify-ui.mjs`) — seeded `localStorage["sakai-state-v1"]`
with representative tasks/briefing/integrations data, then screenshotted all 5 tabs in both
light and dark mode at the screenshot viewport size (400×850 close to the reference
599×1219). Confirmed against `Screenshot_20260730_092336.png` (dark Home) and
`..._092359.png` (light Home): greeting/next-task/chat-bar/briefing/news-feed layout,
spacing, and color tokens all match. Also drove into Settings → Customization (all 3
decoration cards + active-state ring + "switch to X mode" hint), Settings → Privacy & data,
and confirmed the constellation decoration renders full-page in dark mode. No console
errors from app code (one transient `net::ERR` on the Google Fonts CDN request on one run,
not reproduced on a second run — sandbox network flakiness, not app code; font stack falls
back to `ui-serif, Georgia, serif` / `ui-sans-serif, system-ui` regardless).

**Haiku review**: dispatched, scoped to what wasn't manually screenshotted — type parity
between `Settings.tsx`'s `SettingsPatch` and the store's `Action["settings"]` variant,
`ai.ts`'s new `stories`/`pattern` fields end-to-end into `Dashboard`/`Insights`, the
`nextOpenTask` priority-order fallback logic, `App.tsx`'s notification-effect gating on
`state.notifications`, and a repo-wide sweep for stale "Rohtak"/`decorations`/`data-theme`/
`chatWithRohtak` references.

Findings: build/types/wiring all confirmed clean (`Settings.tsx`'s `SettingsPatch` matches
the store `Action`'s `"settings"` variant field-for-field; `stories`/`pattern` flow
end-to-end from `ai.ts` → `Dashboard.refresh()` → `set-briefing` → `Insights`/`NewsFeed`
with consistent `Story` typing; `nextOpenTask()`'s quadrant fallback order is correct;
`App.tsx`'s notification effect gates on `state.notifications` with correct deps; no stale
"Rohtak"/`decorations`/`data-theme`/`chatWithRohtak` references or dangling imports from
deleted files anywhere in `src/`). One real visual bug from a separate review pass, fixed
this version:

- **Raw ISO dates instead of the mockup's short format** — `Dashboard.tsx`'s next-task chip
  showed "DUE 2026-08-10" and `Tasks.tsx`'s task-card meta line showed "due 2026-08-10",
  where the screenshots show "DUE AUG 10" / "Due Aug 10". Added `src/date.ts` —
  `formatDue()`, a single function using `Intl`/`toLocaleDateString` (no date library).
  It parses the stored `YYYY-MM-DD` via regex and reconstructs a **local**-midnight `Date`
  (`new Date(y, m-1, d)`) rather than `new Date(due)`, which parses as UTC midnight and
  rolls back a day in negative-UTC timezones — verified with a throwaway script under
  `TZ=Pacific/Kiritimati` (+14) and `TZ=Etc/GMT+12` (-12), both render "Aug 10" for
  `"2026-08-10"`. Falls back to the raw string (not "Invalid Date") on empty/unparseable
  input. Has a `console.assert` dev-mode self-check (same pattern as `sync.ts`'s existing
  `parseIcs` check) covering the good-date, bad-string, and empty-string cases. Wired into
  both call sites; also capitalized `Tasks.tsx`'s "due" → "Due" to match the mockup.
  Re-verified via the same `playwright-core` screenshot script — both tabs now read
  "DUE AUG 10" / "Due Aug 10" / "Due Jul 30".

## v0.7 (2026-07-30) — decoration fixes, canvas constellation, preview data, voice-only tasks

**Plan**: pre-written by the user as `UI_PLAN_V2.md` (follow it, don't redesign). Four items:
fix the cherry-blossom stuck-at-top bug (root cause already diagnosed in the plan), port the
canvas constellation from `teambir/apps/web/components/sections/ConstellationBg.tsx`, add
`src/samples.ts` preview data with a hard rule that samples are a render-time fallback only
(never written to store/localStorage/`initial`), and strip manual task entry from
`Tasks.tsx`.

**Built**:
- `src/Decorations.tsx` — `CherryBlossom`: `animationDelay` flipped to **negative**
  (`-${p.delay}s`) so each petal starts mid-fall instead of sitting at its 0% keyframe
  (`top:0`, `opacity:1`) until the delay elapses — that positive-delay bug was the entire
  stuck-row-at-top symptom. Each petal also gets a new `--petal-y` inline custom property
  (a seeded 0-90% vertical offset) so the `prefers-reduced-motion` fallback in `styles.css`
  parks it scattered instead of collapsing back into the same stuck row (the old fallback
  just set `animation:none` with no static position — reproduced the exact bug it was
  supposed to work around).
  `Constellation`: replaced the static SVG (22 fixed dots + nearest-neighbor lines) with a
  canvas port of teambir's `ConstellationBg.tsx` — per-frame star drift, O(n²) link pass
  between nearby stars, pointer-proximity glow, touch support. Changes from the source:
  dropped `'use client'`; recolored via a new `--star-rgb` CSS custom property (see below)
  read once via `getComputedStyle` instead of teambir's hardcoded gold `rgba(242,187,44,…)`
  — canvas fill/stroke strings can't parse `oklch()` (old Android WebViews silently fail to
  paint), so `--star-rgb` is a plain space-separated `R G B` triple, hand-converted from the
  existing `--primary` oklch values via a throwaway oklch→sRGB script (Björn Ottosson's
  formulas — no color library dependency): light `202 101 60`, dark `231 136 93`. Positioned
  `pointer-events-none fixed inset-0 z-0` (same overlay contract as the old SVG version, not
  teambir's `absolute inset-0`). Reduced-motion: checked once via `matchMedia`, draws a
  single static frame (stars + links, no rAF loop, no pointer listeners) instead of animating
  — the old CSS-only fallback doesn't reach into canvas. Capped at `MAX_STARS = 90` regardless
  of viewport width (teambir *increases* density below 500px, the opposite of what a phone
  needs) with a `ponytail:` comment naming the O(n²) ceiling and the spatial-grid upgrade path
  if density/frame-rate needs ever grow. Kept teambir's full teardown (cancel rAF,
  `ro.disconnect()`, remove all four window listeners) so toggling theme back and forth
  doesn't leak a rAF loop.
  Removed the now-dead `.star`/`@keyframes star-twinkle` CSS (only the deleted SVG version
  used that class).
- `src/styles.css` — added `--star-rgb` to `:root` and `.dark`; reduced-motion block for
  `.petal` now sets `top: var(--petal-y, 40%)` alongside `animation: none` instead of just
  killing the animation.
- `src/samples.ts` (new) — preview-only content: `sampleBriefingText`, `samplePattern`,
  `sampleStories: Story[]` (3 items), `sampleTasks: Task[]` (6 items, one per mockup
  quadrant/area, ids prefixed `sample-` so nothing can collide with a real task id), and
  `previewChipClass` (shared Tailwind classes for the small muted "Preview" badge). Uses the
  real `Story`/`Task` types from `store.tsx`, not new shapes. **Never imported by
  `store.tsx`** — it has zero write path into the reducer, `initial`, or `localStorage`;
  every consumer is a component picking real-data-or-sample at render time.
- `src/Dashboard.tsx` — briefing card and `NewsFeed` now compute `hasBriefing`/`hasStories`
  (real, non-stale data present) and fall back to `sampleBriefingText`/`sampleStories` when
  false, with a `Preview` chip next to "DAILY BRIEFING" / "YOUR NEWS" only in the fallback
  case. Integration chips (emails/events/commits) were deliberately left alone — the plan's
  table doesn't list them as a preview-sample row, so faking connected-integration counts
  would risk exactly the "indistinguishable fake data" problem the Preview-chip rule exists
  to prevent.
- `src/NewsFeed.tsx` — `stories` prop is no longer optional/nullable (caller always supplies
  either real or sample data); added an optional `preview` boolean that renders the chip.
- `src/Insights.tsx` — same real-or-sample pattern for "Daily brief" (stories) and "Pattern
  this week", each independently: a stale/empty briefing can still have no stories yet, and
  vice versa, so the two chips can appear independently. Removed the `Generate a briefing on
  Home…` placeholder text now that the pattern section always has content.
- `src/Tasks.tsx` — deleted the add-task `<section>` (title input, area `<select>`, date
  input, "Add task" button) and its backing `title`/`area`/`due` state, `add()`, and the
  `autoQuadrant`/`uid`/`Plus`/`areas` imports — nothing else in the file used them. Kept the
  done-toggle and delete buttons for real tasks. When `state.tasks.length === 0`, renders
  `sampleTasks` instead with a `Preview` chip next to the "Tasks" heading; `TaskCard` now
  takes optional `onDone`/`onDelete` — omitted for sample tasks, so they render with no
  checkbox and no delete button (not just visually different — genuinely non-interactive,
  since there's nothing wired to call). Empty state (zero real tasks) now reads "No tasks
  yet — tell Sakai what's on your plate from the chat bar on Home" instead of a form.
  Confirmed (didn't refactor) that voice-driven `complete_task` already works end-to-end:
  `ai.ts`'s `summarize()` lists every open task as `- [id] title (...)`, so Claude has real
  task ids to pass to the `complete_task` tool from a spoken/typed instruction.

**Verification**: `npm run build` (tsc + vite build) passes clean — one real type error hit
along the way (`ctx`/`canvas` narrowed to non-null at the top of the effect but TypeScript
doesn't carry that narrowing into the nested `drawLinks`/`drawStars`/`drawFrame` function
declarations that close over them; fixed by re-binding to new explicitly-typed consts
immediately after the null checks).

Browser-driven verification via a `playwright-core` script (`/tmp/verify-v07.mjs`), same
approach as v0.6 (bundled Chromium, no system browser needed):
- **Empty store, both themes, all 5 tabs** — screenshotted every combination; confirmed
  against the two reference screenshots (`Screenshot_20260730_092336.png` dark Home,
  `..._092359.png` light Home) — greeting/next-task/chat-bar/briefing/news layout and the
  sample copy match verbatim (it's the same copy, ported into `samples.ts`). Two `Preview`
  chips found on Home (briefing + news) as expected.
- **Cherry blossom, t=0, animations paused** — injected a global
  `* { animation-play-state: paused !important }` style, read all 14 `.petal` bounding
  rects: only 1/14 within 5px of the top edge (that one's just a petal whose seeded
  `top`/`delay` combination happens to paint near the top mid-fall — not a stuck cluster).
  Confirms the old bug (all 14 stuck in a row at `top:0`) is gone.
- **Cherry blossom, reduced motion emulated** (`newPage({ reducedMotion: "reduce" })`) — 0/14
  petals at the top edge, scattered per their seeded `--petal-y`; screenshot shows a static
  scattered field, not a row.
- **Constellation, dark mode** — canvas renders a coral (not teambir gold) star field with
  link lines; confirmed genuinely animating via a whole-canvas pixel checksum sampled 2s
  apart across 3 samples (all three differ) — an earlier check that sampled only a 100-pixel
  corner slice over 500ms gave a false "not animating" reading (that corner is often empty
  and the drift per frame is sub-pixel over a short window), corrected by checksumming the
  full canvas over a longer interval.
- **Constellation, reduced motion emulated** — canvas checksum identical across two samples
  2s apart → confirmed static, no rAF loop.
- **Constellation, theme toggled dark→light→dark 3×** — no thrown errors, canvas remounts
  and keeps animating cleanly after the toggles (proxy for "no leaked rAF loop": each mount
  starts fresh and each unmount's cleanup cancels the previous frame/listeners since the
  effect has an empty dependency array and a full teardown).
- **Real data wins** — seeded `localStorage["sakai-state-v1"]` with a real task, a
  non-stale briefing (real text/story/pattern), then re-rendered: Home shows the real
  briefing text and real story title with **no** Preview chip; Tasks shows the real seeded
  task (interactive checkbox visible) and confirmed the sample task title
  ("Finish English essay draft") is **absent** with **no** Preview chip; Insights shows the
  real pattern and story with **no** Preview chip. This is the correctness bar from the
  task brief (samples must never look actionable or linger once real data exists) — verified
  by string-matching the rendered page text for both presence of real content and absence of
  sample content/chips, not just visual inspection.

**Known, not investigated**: one `net::ERR`-style 404 was seen once during manual screenshot
capture, not reproduced by a dedicated repeat-navigation check — consistent with the
sandbox's Google Fonts CDN flakiness already noted in v0.6, not app code. `sync.ts`'s
pre-existing `parseIcs` assert failure (noted in the task brief as out of scope) untouched.

Not run this session: an Android APK rebuild (`assembleDebug`) — no code under `android/`
changed, only `src/`, so the existing APK build path is unaffected; skipped rebuilding since
nothing native-facing moved.

**Post-review fix**: coordinator + haiku review caught a regression in `initStars` —
stars were placed with uniform `Math.random()` x/y instead of teambir's grid-with-jitter
distribution (`(col + 0.15 + Math.random()*0.7) / cols`), which is the defining visual trait
of the animation being ported. Uniform random measured 116 links with 2 isolated stars and
visible clumping/voids at 600×1100; restored the grid placement. Kept the `MAX_STARS` cap
correct against it: capping `count` alone while still deriving `col`/`row` from the
*uncapped* `cols` would leave empty rows once the cap actually binds, so now the grid
dimensions themselves are shrunk before generating (`cols`/`rows` scaled down by
`sqrt(MAX_STARS / (cols*rows))`, then `rows` hard-clamped to `floor(MAX_STARS / cols)` so
`cols*rows` never exceeds the cap even after rounding) — every cell in the resulting grid
gets exactly one jittered star, no partial last row. Left the reduced-motion early-return
path untouched per the coordinator's explicit call (correct as written, not worth the
churn). Re-verified at 600×1100 (the coordinator's own test viewport): grid stats now
`cols:5, rows:9, count:45, links:80, isolated:0` — matches the "even mesh, no isolated
stars" bar from teambir's original. `npm run build` re-run clean after the fix.

Not committed/pushed per instruction — review happens first.

## v0.7.1 (2026-09-23) — merge + housekeeping
- Fast-forwarded `main` to `ui-overhaul` (7d90875) and pushed; `npm run build` + `assembleDebug` clean.
- `parseIcs` "broken" notes above are stale: the self-check passes (verified by running the parser on its own sample). Nothing to fix.
- `ai.ts` `callClaude`: API errors now show Anthropic's `error.message` instead of raw JSON.
- Found: the `.env` Anthropic key's account has no credit ("credit balance is too low") — chat/briefing fail until topped up or a key is set in Settings. Error surfaces correctly in the UI.
- No Android emulator installed: the SDK's `android-37.1` system image is only a partial download (`.installer`), and no AVD exists.
- README/PRODUCT_REPORT/PRODUCT updated for Sakai v0.7.
- Emulator set up (2026-09-25): `android-35/google_apis/x86_64` image + AVD `Sakai_Pixel` (1080x2400). APK installs and runs; all 5 tabs + dark mode render; `DashboardService` stays foreground after `am kill` and shows "Sakai · All clear". Notification appears up to 30s after granting permission (next refresh tick). Launch: `emulator -avd Sakai_Pixel`.

## v0.8 (2026-09-25) — onboarding + full settings
**Plan (Opus)**:
- State: `onboarded`, `assistant {name, accent, tone, length, instructions}`, `profile {org, role, timezone, wake, sleep, about, areas[]}`; `load()` deep-merges nested defaults so old saves keep working. New actions: `delete-goal`, `reset`.
- `fields.tsx`: shared controls (Field, TextInput, Segmented, AccentPicker, AreaChips, GoalsEditor, Toggle) used by BOTH onboarding and settings — one control vocabulary.
- `Onboarding.tsx`: 6 steps — Welcome (code-built mark animation: ring draws, dot lands, stars link; no Lottie dep) → Assistant (name, accent, tone) → You (name, school/work, role, timezone, rhythm) → Focus (areas, goals, interests) → Connect (optional API key + GitHub/Canvas/GCal) → Done. Skip always visible; Back/Continue; progress bar; defaults so Continue never blocks.
- Accent: `useApplyAccent` in `theme.ts` overrides `--primary/--ring/--star-rgb` per theme; coral = stylesheet default.
- `ai.ts`: `persona(state)` builds the system prompt from assistant name/tone/length/instructions; `summarize` adds profile. App wordmark stays "Sakai"; assistant name shows in Chat/placeholder/notification.
- Settings index regrouped: Assistant · Profile · Life & goals · Daily rhythm · Appearance · Notifications · AI & keys · Connections · Data (export JSON, replay welcome, erase all).
- Docs: DEVLOG.md (new) + README each iteration.

**Built**: `fields.tsx` (shared controls), `Onboarding.tsx` (6 steps + `Mark` SVG animation, keyframes in `styles.css`, reduced-motion static), `Settings.tsx` rebuilt (9 subpages), `theme.ts` `accents` + `useApplyAccent` (useLayoutEffect so vars land before the canvas reads `--star-rgb`; `Decorations` keyed on accent to recolor), `ai.ts` `persona()` + profile in `summarize()`, assistant name in Chat/Tasks copy, Insights grid filtered by `profile.areas`, DEVLOG.md added.
**Verified**: browser (mobile viewport) full click-through; Android 16 emulator (`Sakai_A16`, API 36): all 6 onboarding steps, Settings index + Assistant page, Plum accent + dark mode across Settings/Home/Insights, state persists after force-stop.
**Haiku review**:
1. `persona()` produced "You are Sakai, 's personal chief of staff" when name empty → fixed (falls back to "the user's").
Everything else clean (load deep-merge, hook order, accent/layout-effect ordering, export strips keys, two-tap erase, GoalsEditor empty-areas default).
- Haiku re-review after fix: no breaking issues. Loop closed.

## v0.8.1 (2026-09-25) — polish (small fix; no haiku per user)
- Removed nav `backdrop-blur`, card gradients, onboarding footer gradient (visual bleed + lag); petal `filter` removed.
- `NewsFeed.tsx`: accent icon tiles replace hardcoded gradients. `theme.ts` accents retuned (ids unchanged: sage=Moss, sky=Slate, plum=Rose, amber=Ochre).
- `App.tsx` scroll-to-top on tab change; `styles.css` overscroll none + no tap highlight; `MainActivity` `OVER_SCROLL_NEVER`.
- `DashboardBridge.setBars` + `notify.ts syncSystemBars` (called from `useApplyTheme`) paint status/nav bars from computed body bg.
- SDK 35 (`variables.gradle`, `suppressUnsupportedCompileSdk=35`, `values-v35/styles.xml` edge-to-edge opt-out). Targeting 36 later needs inset padding instead of the opt-out.
- FGS `dataSync` → `specialUse` (6h/day cap on API 35).
- Onboarding: single Skip under Continue; default decoration `none`. `UI_PLAN*.md` → `archive/`.

## v0.8.2 (2026-09-25) — phone build (small; no haiku)
- `NewsFeed.tsx` restored to e3b4d92 layout (user preference).
- `src/back.ts`: global back-handler stack exposed as `window.sakaiBack()`; `useBack(active, fn)` used by App (tab→Home), Settings (subpage→index), Onboarding (step→prev). `MainActivity` OnBackPressedCallback evaluates it, else `moveTaskToBack`.
- Release APK built with `VITE_ANTHROPIC_API_KEY=` so no key ships in the bundle (verified: 0 `sk-ant-api` matches in APK assets). Settings key path verified end-to-end on API 36 (401 invalid key for dummy).

## v0.8.3 (2026-09-25) — icon, crash guards, theme fade (small; no haiku)
- Icon: `res/drawable/ic_sakai_fg.xml` + `ic_sakai_mono.xml` (vector of the onboarding `Mark`), adaptive icons in `mipmap-anydpi-v26`, legacy PNGs regenerated, bg `#F8F3EB`. Capacitor splash PNGs deleted; launch theme uses `windowSplashScreenAnimatedIcon`.
- `fields.tsx`: goal-area chips replace `<select>`, `TimeField` (±30 min) replaces `type=time`, `modelOptions` Segmented replaces model `<select>`.
- `theme.ts`: `useApplyTheme` derives `effective` (no effect-set state), class flip in `useLayoutEffect`; `fadeTheme()` wraps changes in `startViewTransition` + `flushSync`, `.theme-swap` kills per-element transitions; bars sync after 320 ms.
- Crash (user report: voice + tab switch; not reproducible on API 36 emulator): `src/Crash.tsx` ErrorBoundary per tab + global error log (`sakai-last-error`, shown in Settings → Data); `useVoice` aborts on unmount, try/catch start; `MainActivity` WebViewListener recreates on render-process-gone; `DashboardService.onStartCommand` calls `startForeground`; `DashboardBridge.save` catches blocked FGS start.
- Open: if the phone still crashes, read Settings → Data → Last error, or `adb logcat` over USB.

## v0.8.4 (2026-09-26) — diagnostics (small; no haiku)
- Icon vectors/PNGs reduced to ring + dot.
- `main.tsx`: root `ErrorBoundary` (reload on "Back to Home"); boundary shows `lastError()` stack.
- `MainActivity`: default uncaught-exception handler saves stack to prefs `last_crash`; `DashboardBridge.lastCrash()` returns+clears; `Crash.tsx` pulls it on boot via `notify.nativeCrash()`.
- Tab-switch blank still unreproduced on API 36 emulator (-gpu host, dark/light, fresh onboarding w/ key + notifications). Suspect WebView GPU/renderer on device → need `adb logcat` from the Nothing 3a.

## v0.8.5 (2026-09-26) — tab crash root cause (small; no haiku)
- Phone crash screen: `TypeError: n is not a function` in React `safelyCallDestroy`. Cause: `useEffect(() => window.scrollTo(0,0))` returns a Promise on new WebView (Chrome scroll-promise). Rule: never expression-bodied effects.
- `setBars(color, light, duration)`: native `ValueAnimator.ofArgb` tween; `useApplyTheme` passes 320 when `.theme-swap` is set.

## v0.8.6 (2026-09-26) — calendar, native voice, edge-to-edge
- Plan: calendar = month grid over task due dates (imports already land as tasks) + per-day add; brief removed from Insights; nav re-tap bumps a nonce keyed onto the tab's ErrorBoundary; voice → `@capacitor-community/speech-recognition` (its manifest adds `<queries>` RecognitionService, the missing piece for WebView speech on Android 11+); bars → edge-to-edge so the page crossfade covers them.
- Code: `src/Calendar.tsx` (`MonthCalendar`, `dayKey`), `Tasks.tsx` day section; `App.tsx` nonce; `useVoice.ts` native/web split; `MainActivity.edgeToEdge()` sets transparent bars, injects `--sat/--sab` (re-injected onPageLoaded), pads WebView parent by IME inset; `body` padding-top + fixed `body::before` status strip; `min-h-screen` → `100dvh - --sat`; `setBars` = icon contrast only.
- Debug: WebView ignores its own padding → keyboard covered input; pad parent instead.
- Haiku review: no breaking issues.

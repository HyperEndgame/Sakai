# Sakai devlog

Newest first. One entry per iteration: what shipped, how it was verified, what's next.

## 2026-09-26 · v0.8.7 — FreeLLMAPI provider
- **Settings → AI & keys → Provider: Claude | FreeLLMAPI.** Enter your router address + unified key, tap **Connect** to load its model list; Sakai auto-picks **GPT-OSS 120B** (best tool-calling model with the most free budget across Groq/Cloudflare/Ollama), falling back to Llama 3.3 70B → Nemotron Super → GLM-4.7 → `auto:smart`. Also on the onboarding Connect step.
- The desktop FreeLLMAPI build only serves the OpenAI API (`/v1/messages` is 404), so Sakai translates its Claude-style calls (system, tools, tool_use/tool_result loop) to `/v1/chat/completions` and back. Chat tools, briefing and Gmail extraction all work through it. Web search is Claude-only, so FreeLLMAPI briefings pick news from model knowledge.
- Router calls use native HTTP on Android (plain-http LAN address, no CORS/mixed-content issues); cleartext allowed.
- Fixed: chat composer covering the last suggestion chip after edge-to-edge; long unbroken text (e.g. an HTML error) widening the whole app.
- Verified on the Android 16 emulator against the real router on this PC (`10.0.2.2:31415`): Connect and chat both reach it and surface its auth error with a dummy key. Review agent: no breaking issues.

## 2026-09-26 · v0.8.6 — Calendar, voice, edge-to-edge
- **Tasks calendar**: month grid at the top of Tasks. Dots mark days with open tasks (incl. Canvas/Google Calendar imports); tap a day to see what's due and add a task for that date.
- **Insights**: daily brief removed (news stays on Home).
- **Re-tap a tab to reset it**: tapping Settings while on a settings page returns to the main Settings list (works for every tab).
- **Voice typing** now uses Android's native speech recognizer via a plugin. Root cause: Android 11+ hides the speech service from apps that don't declare it (`<queries>` for `RecognitionService`), so the WebView's built-in voice couldn't find it on the phone.
- **Status/nav bars**: app is now edge-to-edge; the bars are transparent and the page paints behind them, so the theme fade covers them in the same frame (measured identical mid-fade). Keyboard still pushes content up (WebView parent padded by the IME inset).
- Verified on the Android 16 emulator; review agent: no breaking issues.

## 2026-09-26 · v0.8.5 — Tab-switch crash fixed
- **Root cause** (from the new crash screen on the phone): `useEffect(() => window.scrollTo(0, 0))`. Newer Android WebViews return a Promise from `scrollTo`; React treated it as the effect's cleanup and crashed calling it on the next tab switch ("n is not a function"). The emulator's older WebView returns undefined, so it never reproduced there. Fixed with a block body; same guard applied to the voice cleanup.
- **Status/nav bars** now tween natively (320 ms `ValueAnimator`) in step with the page crossfade instead of snapping a beat later.

## 2026-09-26 · v0.8.4 — Crash diagnostics, simpler icon
- App icon is just the ring and dot (no constellation lines), matching the in-app header mark.
- Phone still blanks on tab switch; **not reproducible** on the Android 16 emulator (light, dark, fresh install + key + notifications, host GPU). Added diagnostics so the phone can tell us why:
  - whole-app error screen: any JS crash now shows the error text instead of a blank page
  - native (Java) crashes are saved and shown on next launch
- Next: USB logcat from the phone if it still blanks with no error shown (that means the WebView/GPU process died, which JS can't catch).

## 2026-09-25 · v0.8.3 — Icon, crash guards, smooth theme
- **App icon** is now the Sakai mark (ring, dot, linked stars) on cream, as an adaptive icon with a themed-icon (monochrome) layer. The Capacitor splash logo is gone; launch shows the Sakai mark.
- **No native dropdowns in onboarding/settings**: goal area is a chip row, wake/sleep times are −/+ steppers (30 min), model is a segmented control.
- **Theme switch** is one 320 ms crossfade (View Transitions) instead of every element easing separately; the theme class flips in the same frame as the state, and the status bar repaints after the fade.
- **Crash hardening** (couldn't reproduce on the emulator, so every likely path is guarded):
  - each tab is wrapped in an error boundary: a broken screen shows a message and "Back to Home" instead of blanking the app
  - the last JS error is saved on-device and shown in **Settings → Data → Last error** (copyable)
  - voice input: mic is released when you leave the screen, start errors are caught
  - if the WebView renderer dies, the screen is rebuilt instead of the app closing
  - notification service always answers `startForegroundService` with `startForeground`, and a blocked start no longer throws
- Verified on the Android 16 emulator: icon in the drawer, tab stress (15 rapid switches), voice → tab switch (mic released), theme fade, new steppers/chips.

## 2026-09-25 · v0.8.2 — Phone build
- "Your news" back to the original layout (image tile + summary box), by request.
- **Android Back button** now steps back inside the app (settings subpage → Settings → Home, onboarding step → previous step) and only backgrounds the app at Home. Before, it closed the app from anywhere.
- Phone APK is built **without** the `.env` key baked in, so the key you paste in Settings is the one used.
- Verified on the Android 16 emulator: the key typed in Settings → AI & keys is sent to Anthropic (a dummy key gets "401: API key is invalid", so a real key works). Back-button chain checked.
- APK published as a GitHub Release (private repo): **Releases → v0.8.2 → sakai-v0.8.2.apk**.

## 2026-09-25 · v0.8.1 — Polish pass
**Fixed**
- **Color bleeding**: removed the blurred see-through bottom nav (content smeared through it), the accent-tinted card gradients, and the onboarding footer fade. Surfaces are solid now.
- **Clashing colors**: news thumbnails were hardcoded pink/rust/green gradients; now an accent-tinted icon per category. Accent palette retuned to muted tones that sit with cream/charcoal: Coral, Moss, Slate, Rose, Ochre.
- **Lag**: no backdrop blur, no per-petal drop-shadow filter.
- **Overscroll stretch** disabled (native WebView + CSS).
- **Tap flash** (Android's blue highlight) removed; tabs now open scrolled to the top.
- **Status & navigation bars** now match the app background in light and dark.
- Cherry blossom is **off by default**. Onboarding has a clear **Skip setup / Skip the rest** button under Continue.

**Android**
- Target/compile SDK 34 → 35 (edge-to-edge enforcement opted out so the WebView sits between the bars).
- Dashboard notification service switched `dataSync` → `specialUse`: Android 15+ caps dataSync services at 6 h/day, which would have killed the always-on notification.

**Housekeeping**: old `UI_PLAN*.md` moved to `archive/`.

**Verified** on the Android 16 emulator: fresh install → Skip setup → Home, overscroll at bottom, dark/light bars, new accents, service type `specialUse`.

## 2026-09-25 · v0.8 — Welcome flow + full settings
**Shipped**
- First-run onboarding (6 steps): welcome animation → name your assistant (name, accent, tone) → about you (name, school/work, grade/role, wake/sleep, timezone) → focus (life areas, goals, interests) → connect (API key, GitHub, Canvas, Google Calendar; all optional) → "Hi, I'm {assistant}". Skip is always visible, and every field has a default so Continue never blocks.
- Welcome animation is built in code from Sakai's own mark: the ring draws itself, the dot lands and breathes, and nearby stars link up. It has no animation library and falls back to a static mark when reduce-motion is on.
- Settings rebuilt into two groups: **You & {assistant}** (Assistant, Profile, Life & goals, Daily rhythm) and **App** (Appearance, Notifications, AI & keys, Connections, Data).
  - Assistant: name, accent color (Coral/Sage/Sky/Plum/Amber), tone, reply length, custom instructions.
  - Appearance: Light/Dark/System + accent + decoration.
  - Data: copy all data as JSON (keys stripped), replay welcome, erase everything (two-tap confirm).
- The assistant's name, tone, length, custom instructions and your profile now feed Claude's system prompt.
- Accent color recolors the whole app, including the dark-mode constellation.

**Verified**: `npm run build` clean; full flow clicked through in the browser and on an **Android 16 (API 36) emulator** (`Sakai_A16`): all 6 steps, accent switch, dark mode, Settings subpages.

**Next**: see PIPELINE.md v0.8 for review findings.

## 2026-09-23 · v0.7.1 — Merge + emulator
- Merged `ui-overhaul` (Tailwind v4 redesign, back to the Sakai name) into `main`.
- Clearer Claude API error messages. Set up Android emulators (API 35, API 36). Persistent notification confirmed to survive the app being killed.

# Sakai devlog

Newest first. One entry per iteration: what shipped, how it was verified, what's next.

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

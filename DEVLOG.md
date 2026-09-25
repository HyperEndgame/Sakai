# Sakai devlog

Newest first. One entry per iteration: what shipped, how it was verified, what's next.

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

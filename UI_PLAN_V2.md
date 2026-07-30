# UI plan v2 — decorations, preview data, voice-only input

Follow this; don't redesign it. Branch `ui-overhaul` (already checked out).

---

## 1. Cherry blossom: fix the petals stuck at the top

**Root cause** (`src/Decorations.tsx:44`): `animationDelay: ${p.delay}s` is **positive**, and
there is no `animation-fill-mode`. Before its delay elapses (up to 14s), a petal renders with
its *base* styles — `top: 0`, no transform, `opacity: 1` — so all 14 petals sit visible and
motionless in a row along the top edge. The Lovable original used a **negative** delay
(`-${delay}s`), which starts each petal mid-flight instead.

**Fix:** negative delays. Not `fill-mode: backwards` — that would just hold them invisible
above the fold, so nothing falls until the delay passes.

**Also broken, fix in the same pass:** the `prefers-reduced-motion` block in `styles.css`
sets `animation: none` on `.petal`. With no transform, that collapses every petal back into
the same stuck row at `top: 0` — the reduced-motion fallback reproduces the exact bug we're
fixing. `PRODUCT.md` requires a *static* fallback, not a broken one. Give each petal an
inline vertical offset (e.g. a `--petal-y` custom property) so reduced-motion renders them
scattered and still, and keep motion driven by the keyframe otherwise.

Verify by screenshotting at t=0 with animations paused — no cluster at the top edge — and
again with `prefers-reduced-motion: reduce` emulated.

## 2. Constellation: port the canvas version from teambir

Replace the static SVG `Constellation()` with the canvas animation at
`/home/necron/claude_projects/teambir/apps/web/components/sections/ConstellationBg.tsx`.
Read that file first. Port it, with these changes:

- **Strip Next.js-isms**: drop `'use client'`.
- **Recolor.** It hardcodes teambir gold `rgba(242,187,44,…)` in four places. Sakai's accent
  must drive it instead. Add a `--star-rgb` triple (space-separated RGB, e.g. `226 124 92`)
  to `:root` and `.dark` in `styles.css`, matched to the existing `--primary` oklch values;
  read it once via `getComputedStyle(document.documentElement)` and interpolate into the
  `rgba()` strings. **Do not** put raw `oklch()` into canvas fill/stroke strings — older
  Android WebViews don't parse it and the whole layer silently fails to paint.
- **Positioning**: teambir uses `absolute inset-0`; Sakai needs the same fixed full-screen
  overlay the current decoration uses (`pointer-events-none fixed inset-0 z-0`), behind the
  `z-10` content wrapper.
- **`prefers-reduced-motion`**: required by `PRODUCT.md`. Check it via `matchMedia`; when set,
  draw **one** static frame (stars + links, no `requestAnimationFrame` loop, no pointer
  tracking). The current CSS-only fallback won't apply to canvas.
- **Cleanup**: keep the existing teardown (`cancelAnimationFrame`, `ro.disconnect()`, and
  removal of all four window listeners). A leaked rAF loop across theme toggles will pin the
  CPU on a phone.
- **Cost**: the link pass is O(n²) over stars every frame, and teambir *increases* star
  density below 500px — which is Sakai's only real target. Cap the star count (~90) and leave
  a `ponytail:` comment naming the O(n²) ceiling and the spatial-grid upgrade path.
- Keep the existing gating: constellation renders in dark mode only.

## 3. Preview data — look like the screenshots when empty, real data when not

Today `NewsFeed` returns `null` with no stories, Tasks is blank, and Insights reads 0%. The
app looks broken before an API key is set.

Create `src/samples.ts` exporting the mockup's example content — 3 news stories, 6 tasks
(one per quadrant grouping), a briefing line, a `pattern` string. Shapes must be the **real**
`Story` / `Task` / `Briefing` types from `store.tsx`, not new ones.

**Wiring rule, this is the important part:** samples are a *fallback for an empty section*,
never a seed. Do **not** write them into the store, into `localStorage`, or into `initial`.
Each section picks real data when it exists and samples only when it's empty:

| Section | Real source | Falls back to samples when |
|---|---|---|
| Home briefing | `state.briefing` (fresh) | no briefing, or stale |
| Home "Your news" | `briefing.stories` | absent or empty |
| Tasks list | `state.tasks` | `state.tasks.length === 0` |
| Insights daily brief | `briefing.stories` | absent or empty |
| Insights pattern | `briefing.pattern` | absent |

The moment real data lands, samples vanish for that section — no flag, no migration, no
"dismiss" state to persist. Derive it from the data being there.

**Mark it as preview.** Sample tasks must not be actionable — no working checkbox, no delete
— and each sampled section gets one small muted "Preview" chip next to its heading. This app's
entire value is trusting the priority list; fake tasks that are indistinguishable from real
ones can cause a genuinely missed deadline. Keep the marker to one small element so the layout
still matches the screenshots.

## 4. Tasks: remove manual entry, voice/text only

The user will never add a task by hand — everything goes through Sakai via voice or text.

- Delete the add-task form from `Tasks.tsx` (the `<section>` with the title input, area
  `<select>`, date input, and "Add task" button) and the now-dead `title`/`area`/`due` state,
  `add()`, and the `autoQuadrant`/`uid`/`Plus` imports if nothing else uses them.
- **Keep** the done toggle — the user explicitly still wants to check things off by hand.
- Empty state (real tasks, not samples) should point at the chat bar rather than a form.
- Leave `ai.ts`'s `add_task` / `complete_task` tools alone; they're the real input path.
- Sanity-check that `complete_task` can actually be driven by voice: `summarize()` already
  sends task ids to Claude. Confirm, don't refactor.

## 5. Verify

1. `npm run build` passes.
2. All 5 tabs, both themes, in a real browser.
3. Cherry blossom: no stuck row at the top, at t=0 and under reduced-motion.
4. Constellation: animates in dark mode, recolored to the coral accent, one static frame
   under reduced-motion, no rAF leak after toggling theme back and forth.
5. Empty store → every section matches the screenshots via samples.
6. Seed a real task + briefing into `localStorage` → samples disappear, real data renders.
7. `PIPELINE.md` updated with a v0.7 entry.

Do not commit or push — that's handled after review.

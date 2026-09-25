# UI overhaul plan — port Lovable mockup into the app

Source of truth: `/home/necron/claude_projects/sakai example code/` (screens, tokens,
10 screenshots). Target: `/home/necron/claude_projects/sakai/src/`.

Goal: the running app matches the screenshots. Real data from the existing store —
**no mock data ships**. `mock-data.ts` is a shape reference only.

## Decisions already made (do not re-litigate)

| Question | Decision |
|---|---|
| Styling | Adopt Tailwind v4. Port Lovable JSX near-verbatim. |
| shadcn/ui | **Skip all 40 components.** Nothing imports them. No Radix deps. |
| Router | **No router.** Keep the `tab` useState in `App.tsx`. Strip every `createFileRoute`. |
| Tabs | 5: Home, Chat, Tasks, Insights, Settings. **Delete `Calendar.tsx`.** |
| Branding | App name = **Sakai**. Greeting name = `state.name` from Settings. |
| News feed | Real Claude web-search data. Thumbnail column kept, filled with a **CSS gradient tile** per category — no binary image assets. |

## Step 1 — deps + Tailwind wiring

```
npm i tailwindcss@^4 @tailwindcss/vite lucide-react clsx tailwind-merge tw-animate-css
```

- `vite.config.ts`: add the `tailwindcss()` plugin.
- New `src/styles.css`: copy `styles.css` from the example folder verbatim, except the
  first three lines — make Tailwind scan `src/` (`@import "tailwindcss";` + `@source "./";`).
  Keep every oklch token, the `@theme inline` block, and the `.petal` / `.star` keyframes.
- Delete `src/app.css`; point `src/main.tsx` at `styles.css`.
- New `src/cn.ts`: `clsx` + `twMerge`, the standard two-liner.
- `index.html`: add the Google Fonts link for **Fraunces** (serif display) and **Inter**.
  `ponytail: CDN fonts, self-host if the APK needs to render offline.`

## Step 2 — theme

`src/theme.ts` currently sets `data-theme` on `<html>`. Tailwind's dark variant is
`&:is(.dark *)`, so switch it to toggle the **`.dark` class** plus `style.colorScheme`.
Keep the existing 3-way `light | dark | system` resolution — do **not** downgrade to the
mockup's 2-way. The header button toggles light↔dark as in the screenshots.

## Step 3 — store changes (`src/store.tsx`)

Two field changes, both small:

- `decorations: boolean` → `decoration: "none" | "cherry-blossom" | "constellation"`.
  Default `"cherry-blossom"` (matches the screenshots: petals in light, nothing in dark).
- Add `notifications: boolean`, default `true`. Gate `updateDashboardNotification` in
  `App.tsx` on it, so the Settings "Notifications" row drives something real.

Add both to the `settings` action's `Pick<>`. `load()` already spreads over `initial`, so
stale persisted keys are harmless.

## Step 4 — AI (`src/ai.ts`)

- Rename `chatWithRohtak` → `chatWithSakai`; update both system prompts to say **Sakai**
  (they currently say Rohtak and leak the wrong name into replies).
- Extend the briefing JSON with two fields:
  - `stories: [{ category, title, source, time, summary }]` — exactly 3.
  - `pattern: string` — one observation, feeds the Insights "Pattern this week" card.
- Mirror both onto the `Briefing` type in `store.tsx` as **optional** (`stories?`,
  `pattern?`) so previously-persisted briefings still render.
- One AI call, two consumers: Home "Your news" and Insights "Daily brief" both read
  `briefing.stories`. Do not add a second fetch.

## Step 5 — screens

Port from the example folder. Strip `createFileRoute` / `Link` / `useNavigate`; use the
existing `tab` state and props. Swap `@/lib/mock-data` for `useStore()`.

| New file | Ported from | Wire to |
|---|---|---|
| `App.tsx` (app shell) | `app-shell.tsx` | 5-tab nav, `Decoration`, header. Fold `Header.tsx` + `Logo.tsx` in and delete them. Delete `icons.tsx` — lucide replaces it. |
| `Dashboard.tsx` | `_app.index.tsx` | Greeting uses `state.name`. Next-task = highest-priority open task. Chat bar keeps `useVoice` + `chatWithSakai`. Briefing card + source chips from `state.briefing` and the existing status-string regexes. |
| `NewsFeed.tsx` (new) | `news-feed.tsx` | `briefing.stories`. Replace `<img>` with a gradient `<div>` keyed on category. Render nothing when `stories` is absent. |
| `Tasks.tsx` | `_app.tasks.tsx` | Real tasks, real quadrant grouping, real `why`. Keep the existing add-task form — the mockup omits it but it's load-bearing. |
| `Chat.tsx` | `_app.chat.tsx` | `state.chat` + `chatWithSakai` + `useVoice`. Keep the 4 suggestion chips. |
| `Insights.tsx` | `_app.insights.tsx` | "Daily brief" ← `briefing.stories`. Life areas keep the **existing** percent derivation, restyled as progress bars; derive a short note (e.g. "3 open tasks"). "Pattern this week" ← `briefing.pattern`. |
| `Settings.tsx` | `_app.settings.tsx` | Index = Appearance card + 4 rows. Sub-page via local `useState`, not a router. |
| `Decorations.tsx` | `decoration.tsx` | Switch on the new 3-way `decoration` field. Keep the existing `prefers-reduced-motion` static fallback — `PRODUCT.md` requires it and the Lovable version drops it. |

### Settings rows — keep the mockup's 4 labels, put real content behind each

| Row | Real content |
|---|---|
| Customization | Theme picker + the 3 decoration preview cards from `_app.settings.customization.tsx` (exact) |
| Notifications | The new `notifications` toggle |
| Profile | `state.name` field |
| Privacy & data | `Integrations.tsx` (Connect) + API key, model, interests — hint text "Connected sources" already fits |

Restyle `Integrations.tsx` to Tailwind; keep all its logic untouched.

## Step 6 — rebrand + cleanup

Replace "Rohtak" with "Sakai" as the **app** name in: `index.html` title,
`capacitor.config.ts`, `android/.../strings.xml`, `notify.ts`, `DashboardService.kt`
channel name. Leave the package ID `com.hyperendgame.sakai` alone — it already says sakai.

Delete: `Calendar.tsx`, `icons.tsx`, `Logo.tsx`, `Header.tsx`, `app.css`.

## Constraints

- Max 3 levels of indentation, functions do one thing, short names (project rules).
- `npm run build` (tsc + vite) must pass clean before you report done.
- Do not add a state library, an icon library other than lucide, or any Radix package.
- Leave `sync.ts` alone — it has a known pre-existing `parseIcs` assert failure that is
  out of scope for this pass.

## Verify before reporting done

1. `npm run build` passes.
2. `npm run dev`, then check each of the 5 tabs renders in **both** light and dark.
3. Compare against the screenshots — the two Home shots
   (`Screenshot_20260730_092336.png` dark, `..._092359.png` light) are the highest-signal.
4. Report what deviates from the screenshots and why.

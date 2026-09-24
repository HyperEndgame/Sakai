# Sakai — Product Report

## What it is

A mobile-first personal operating system for one user: an AI chief of staff that
ingests school, work, coding, and personal signals and turns them into a single
prioritized view with a reason attached to every priority. Chat is the primary
input, not a bolted-on tab — natural language in, structured dashboard state out.

Local-first by design: state lives in `localStorage` on-device, zero backend
required to run. Ships as a web app (Vite/React) and an Android APK (Capacitor),
built for a single named device (Nothing Phone 3a).

## Current capabilities (v0.7)

| Area | Capability |
|---|---|
| **Home** | Time-of-day greeting, next-task card, chat bar as primary input, AI daily briefing, news feed |
| **Tasks** | Created via chat/voice only; Eisenhower quadrant auto-sort (Do first / Schedule / Delegate / Later) with an AI-written "why" for each placement |
| **Chat/Voice** | Claude tool-use assistant (`add_task`, `complete_task`, `log_finance`, `update_goal`) driven by natural language or voice (Web Speech API) |
| **Insights** | Life-areas grid, weekly pattern, news stories, goals |
| **Connect** | GitHub public activity, Canvas + Google Calendar via ICS import, Gmail action-item extraction (BYOK OAuth) — all deduplicated into tasks with a `source` tag |
| **News** | 3 personalized stories via Claude's web-search tool |
| **Notifications** | Persistent, non-dismissible Android foreground service (native Kotlin plugin) showing the current dashboard state |
| **Theming** | Light/dark, cherry blossom (light) / canvas constellation (dark), respecting `prefers-reduced-motion`; preview data fills empty sections |
| **Settings** | Profile, theme/decoration customization, BYOK Anthropic key + model choice, interests |

Stack: React 18 + TypeScript + Vite, Capacitor 6 for Android, no state library
(reducer + Context), Tailwind v4 + lucide-react, no backend
in production yet.

## Design position

Deliberately not a SaaS dashboard or an enterprise admin tool: no gradients,
no gamification, no dense data-grids. One right action per screen, reasoning
shown as a first-class UI element (`why-pill`), one considered decorative
signature rather than scattered ornamentation. Built to feel personal — "one
life," not "one team."

## What's built but not turned on

- **Supabase backend** — full schema (`tasks`, `milestones`, `briefings`,
  `messages`) and edge functions already written and committed, realtime
  enabled on `tasks`/`briefings`. Not deployed — needs the user's own Supabase
  project/credentials. This is the gating dependency for everything below.
- **`dev_sessions` table** (designed, not migrated) — for Claude Code session
  sync.

## Future capabilities (already architected in `DESKTOP.md`)

1. **Multi-device sync** — deploy Supabase, swap `store.tsx`'s localStorage
   calls for Supabase queries behind a settings toggle; local-only stays
   default for single-device use.
2. **Desktop app** — same `tasks`/`briefings` realtime channels, same
   `ai.ts` tool-use contract reused verbatim; Dashboard logic is portable
   since it's just state → JSX.
3. **Claude Code sync** — a session-end hook pushes a work summary to
   `dev_sessions`, surfacing recent coding activity as a milestone on mobile
   with no polling.
4. **Desktop-only agent tools** — `open_file`, `run_command`, `browse_url`
   added to the existing tool-use loop (Claude Agent SDK / computer-use),
   writing back into the same `tasks`/`messages` tables so mobile sees the
   results.
5. **Server-side integration polling** — `github-sync` edge function already
   written to move GitHub polling server-side once multiple devices need the
   same data without duplicating client-side fetches.

## Known gaps / permanent no's

- **Gmail integration**: code path complete, untested end-to-end — needs a
  real Google Cloud OAuth client ID from the user.
- **Discord DMs**: permanently out of scope — reading DMs outside Discord's
  official bot API violates ToS.

## Where this is headed

The product is functionally complete for its stated MVP (single-device,
BYOK, local-first) and the only thing standing between "phone app" and
"synced multi-device personal OS with a desktop agent" is deploying the
already-written Supabase backend. Every future capability above is additive
on top of the same `ai.ts` tool-use contract — no architecture rewrite
required to get there.

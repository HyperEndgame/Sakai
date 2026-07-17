# Desktop sync architecture

The mobile app is local-first (localStorage, `src/store.tsx`) so it works with zero setup.
This is the architecture for the future desktop app and Claude Code sync — the schema and
edge functions already exist (`supabase/`), just not deployed. Nothing here needs to be
built until multi-device sync is actually wanted; deploying `supabase/migrations/0001_init.sql`
and pointing `src/store.tsx` at Supabase (instead of localStorage) is the only mobile-side change.

## Why Supabase as the sync layer

Same tables serve every client — mobile, desktop, and Claude Code — through Postgres row-level
security keyed on `auth.uid()`, so no client needs its own sync protocol. `supabase_realtime` is
already enabled on `tasks` and `briefings` (`0001_init.sql:49`), so a desktop app gets live
updates for free via `supabase.channel(...)` instead of polling.

## Schema (already written, `supabase/migrations/0001_init.sql`)

- `tasks` — mirrors `src/store.tsx`'s `Task` type (title, due_date, quadrant, source, done)
- `milestones` — goals/finance entries (`category`, `name`, `value`, `note`)
- `briefings` — daily AI briefing history
- `messages` — chat history with the assistant

## Desktop app responsibilities

1. **Auth**: Supabase Auth (magic link or GitHub OAuth — same account as mobile).
2. **Read**: subscribe to `tasks`/`briefings` realtime channels; render the same Eisenhower
   view as mobile (`src/Dashboard.tsx` logic is portable — it's just state → JSX).
3. **Write**: same `add_task`/`complete_task`/`log_finance`/`update_goal` tool contract already
   defined in `src/ai.ts` — the desktop assistant calls the same Claude tool-use loop, just
   dispatching to Supabase writes instead of a local reducer.
4. **Extra desktop-only capabilities** (per the original spec — browser access, computer
   interaction, file management, workflow automation): these are Claude Agent SDK / computer-use
   concerns, layered on top of the same task/briefing sync — not a different backend. A desktop
   client adds tools like `open_file`, `run_command`, `browse_url` to the same tool-use loop
   pattern already in `ai.ts:65-106`; results still land in the same `tasks`/`messages` tables so
   mobile sees them.

## Claude Code sync

`supabase/functions/github-sync/index.ts` already polls commit activity server-side (the
mobile app currently does this client-side in `src/sync.ts` — the edge function is the
multi-device upgrade so polling doesn't duplicate per device). Claude Code sync extends this
same idea: a local hook (Claude Code's `Stop` or session-end hook) POSTs a summary of what was
worked on to a new `dev_sessions` table (project, files touched, summary), which shows up as a
`coding` milestone/task on mobile — no polling needed, it's push-on-event from the desktop side.

```sql
create table dev_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  project text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
alter table dev_sessions enable row level security;
create policy "own dev_sessions" on dev_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

## Deploy path (when needed)

```
supabase init
supabase link --project-ref <ref>
supabase db push                      # applies 0001_init.sql (+ dev_sessions above)
supabase functions deploy assistant briefing canvas-sync github-sync
```

Then swap `src/store.tsx`'s `localStorage` read/write for Supabase queries, gated behind a
Settings toggle so local-only stays the default for a single-device user.

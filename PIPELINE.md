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

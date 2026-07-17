# Sakai

A mobile-first personal operating system: an AI-powered life dashboard that acts as your chief of staff. Daily briefings, Eisenhower-matrix prioritization, and a Claude-powered assistant that turns "my essay is due August 10" into dashboard updates.

## Run

```
npm install
npm run dev
```

Copy `.env.example` to `.env` and set `VITE_ANTHROPIC_API_KEY` (or paste a key in Settings — stored only on-device).

## Android APK

```
npm run android       # builds web, syncs, opens Android Studio
```

Build > Build APK in Android Studio, install on device (optimized for Nothing Phone 3a). The `android/` project is committed; build assets regenerate on sync.

## Features

- **Today** — AI daily briefing, single highest-ROI action, tasks grouped by urgency/importance with reasons
- **Tasks** — quick add with area + deadline; auto-prioritized
- **Sakai** — chat/voice assistant (Claude tool-use) that updates tasks, finances, and goals from natural language
- **Connect** — GitHub coding activity, Canvas assignments + Google Calendar events imported as tasks (ICS feeds; sync fully works in the APK, browsers may block the feeds), Gmail action-item extraction (needs a Google OAuth Client ID, see in-app instructions)
- **News** — personalized 1-2 sentence brief inside the daily briefing (Claude web search)
- **Settings** — API key, model, interests

See `PIPELINE.md` for structure and roadmap.

# Sakai

A mobile-first personal operating system: an AI-powered life dashboard that acts as your chief of staff. Daily briefings, Eisenhower-matrix prioritization, and a Claude-powered assistant that turns "my essay is due August 10" into dashboard updates.

## Run

```
npm install
npm run dev          # http://localhost:5199
```

Copy `.env.example` to `.env` and set `VITE_ANTHROPIC_API_KEY` (or paste a key in Settings — stored only on-device). The key's account needs API credit.

## Android APK

```
npm run android      # builds web, syncs, opens Android Studio
```

In Android Studio: pick an emulator or USB device and press Run, or Build > Build APK(s). Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Rebuild after any `src/` change — the APK bundles the web build.

## Tabs

- **Home** — greeting, next task, chat/voice bar (primary input), AI daily briefing, news feed
- **Chat** — full assistant history; Claude tool-use updates tasks, finances, and goals
- **Tasks** — Eisenhower quadrants with an AI "why" per task; tasks are created through chat/voice
- **Insights** — life-areas progress, weekly pattern, news stories, goals
- **Settings** — profile, theme, API key, model, interests, Connect (GitHub, Canvas/Google Calendar ICS, Gmail)

Empty sections show clearly labelled preview data until real data exists.

See `PIPELINE.md` for structure and history.

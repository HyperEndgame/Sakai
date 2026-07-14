# Sakai

A mobile-first personal operating system: an AI-powered life dashboard that acts as your chief of staff. Daily briefings, Eisenhower-matrix prioritization, and a Claude-powered assistant that turns "my essay is due August 10" into dashboard updates.

## Run

```
npm install
npm run dev
```

Open Settings and paste your Anthropic API key (stored only on-device).

## Android APK

```
npx cap add android   # first time only
npm run android       # builds web, syncs, opens Android Studio
```

Build > Build APK in Android Studio, install on device (optimized for Nothing Phone 3a).

## Features

- **Today** — AI daily briefing, single highest-ROI action, tasks grouped by urgency/importance with reasons
- **Tasks** — quick add with area + deadline; auto-prioritized
- **Sakai** — chat/voice assistant (Claude tool-use) that updates tasks, finances, and goals from natural language
- **Settings** — API key, model, interests, integrations (stubs)

See `PIPELINE.md` for structure and roadmap.

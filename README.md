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

Emulators: `Sakai_A16` (Android 16, matches the Nothing Phone 3a) and `Sakai_Pixel` (Android 15). Start one with `$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe -avd Sakai_A16`, or pick it in Android Studio's Device Manager.

In Android Studio: pick an emulator or USB device and press Run, or Build > Build APK(s). Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Rebuild after any `src/` change — the APK bundles the web build.

## First run

A short welcome flow sets up your assistant (name, accent color, tone), your profile (school/work, daily rhythm, timezone), the life areas and goals you track, and optional keys/feeds. Skip anytime; everything is editable in Settings, and **Settings → Data → Replay welcome** runs it again.

## Tabs

- **Home** — greeting, next task, chat/voice bar (primary input), AI daily briefing, news feed
- **Chat** — full assistant history; Claude tool-use updates tasks, finances, and goals
- **Tasks** — Eisenhower quadrants with an AI "why" per task; tasks are created through chat/voice
- **Insights** — life-areas progress, weekly pattern, news stories, goals
- **Settings**
  - *You & your assistant*: Assistant (name, accent, tone, reply length, custom instructions), Profile, Life & goals, Daily rhythm
  - *App*: Appearance (light/dark/system, accent, decoration), Notifications, AI & keys, Connections (GitHub, Canvas/Google Calendar ICS, Gmail), Data (copy as JSON, replay welcome, erase)

Empty sections show clearly labelled preview data until real data exists.

See `DEVLOG.md` for what changed each iteration and `PIPELINE.md` for structure and agent notes.

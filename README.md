# Velvet Keys — Soulful R&B Music Generator

A web app that lets anyone generate soulful, piano-driven contemporary R&B songs in the spirit of
John Legend (warm vocals, gospel runs, lush jazzy chords), powered by [SunoAPI.org](https://docs.sunoapi.org/).

## Features
- **Vibe presets:** Piano Ballad, Gospel Soul, Slow Jam, Neo-Soul Groove, First Dance, Heartbreak, Feel-Good
- **Describe it:** type an idea and the AI writes the lyrics and the song
- **Write my own lyrics:** custom title + lyrics, with a ✨ lyrics helper
- Male/female vocals, V6 / V6 Wild / V6 Mini models, extra style touches, instrumental option
- Streams a preview as soon as it's ready, download MP3s, and a library saved in your browser
- Shows remaining SunoAPI credits

> Suno does not accept real artist names in prompts, so the "John Legend" sound is described by its musical traits.

## How it works
```
public/               static front end (index.html, style.css, app.js)
netlify/lib/suno.mjs  shared SunoAPI helper (reads SUNO_API_KEY)
netlify/functions/    serverless proxy to SunoAPI.org (keeps the API key secret)
  generate.mjs   POST /api/generate   -> POST https://api.sunoapi.org/api/v1/generate
  status.mjs     GET  /api/status     -> GET  /api/v1/generate/record-info
  lyrics.mjs     POST/GET /api/lyrics -> /api/v1/lyrics (+ /record-info)
  credits.mjs    GET  /api/credits    -> GET  /api/v1/generate/credit
  callback.mjs   /api/callback        (required callBackUrl; the app polls instead)
```

## Deploy on Netlify
1. In Netlify: **Add new site → Import an existing project → GitHub** and pick this repo (branch `main`).
2. Build settings are read from `netlify.toml` (no build command; publish dir `public`).
3. **Site configuration → Environment variables → Add variable**
   - Key: `SUNO_API_KEY`
   - Value: your key from https://sunoapi.org/api-key
4. Deploy (or **Trigger deploy** if it was already deployed before you added the variable).

**Never commit your API key** — it belongs only in the Netlify environment variable.

## Run locally (optional)
```bash
npm install -g netlify-cli
cp .env.example .env   # put your key in .env
netlify dev
```

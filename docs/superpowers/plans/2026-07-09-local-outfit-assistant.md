# Local Outfit Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first desktop web app that recommends 2-3 outfits from the user's wardrobe using weather, occasion, editable tags, liked outfit references, and optional visual-model assistance.

**Architecture:** Use a Vite React frontend for the local UI and IndexedDB storage. Use a small Express backend for weather and OpenAI-compatible model proxy calls so API keys stay out of browser code. Keep the recommendation engine deterministic first, then use model ranking when available.

**Tech Stack:** React, TypeScript, Vite, Vitest, Express, IndexedDB, Open-Meteo weather API, OpenAI-compatible Responses API.

---

### Task 1: Scaffold App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `server/index.js`
- Create: `.env.example`

- [ ] Create the project files and install dependencies.
- [ ] Add scripts for `dev`, `server`, `test`, and `build`.
- [ ] Verify `npm install` succeeds.

### Task 2: Recommendation Engine

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/recommendation.ts`
- Create: `src/lib/recommendation.test.ts`

- [ ] Write failing Vitest tests for weather filtering, occasion preference, and 2-3 outfit generation.
- [ ] Run the tests and verify they fail because the implementation is missing.
- [ ] Implement deterministic recommendation helpers.
- [ ] Run the tests and verify they pass.

### Task 3: Backend API

**Files:**
- Modify: `server/index.js`
- Create: `src/lib/api.ts`

- [ ] Add `GET /api/weather` using Open-Meteo geocoding and forecast endpoints.
- [ ] Add model proxy endpoints for clothing tags, style extraction, and outfit ranking.
- [ ] Add safe mock/fallback responses when model configuration is missing.

### Task 4: Local Storage

**Files:**
- Create: `src/lib/storage.ts`

- [ ] Implement IndexedDB stores for wardrobe items, liked outfits, settings, recommendation records, and image blobs.
- [ ] Add import/export backup helpers.

### Task 5: React UI

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/components/WardrobeView.tsx`
- Create: `src/components/LikesView.tsx`
- Create: `src/components/TodayView.tsx`
- Create: `src/components/SettingsView.tsx`
- Create: `src/components/TagEditor.tsx`

- [ ] Build four app views: Today, Wardrobe, Style Likes, Settings.
- [ ] Support adding/editing wardrobe items and liked images.
- [ ] Support fetching weather, selecting occasion, generating recommendations, and showing explanations.
- [ ] Support backup export/import.

### Task 6: Verification

**Files:**
- All app files.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start the local dev server.
- [ ] Report the local URL and any known limitations.

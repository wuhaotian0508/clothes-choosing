# Local Outfit Assistant Design

## Summary

Build a local-first desktop web app that helps the user choose what to wear today from their existing wardrobe. The first version runs locally, stores wardrobe data in the browser, reads live weather through a backend proxy, and uses an OpenAI-compatible visual model to auto-tag clothes and rank outfit candidates.

The daily result is 2-3 outfit recommendations made from existing wardrobe items, with short reasons tied to weather, occasion, and the user's liked outfit references.

## Goals

- Let the user upload wardrobe item photos or create text-only clothing entries.
- Use a visual model to generate editable tags for each clothing item.
- Let the user upload liked outfit images to build style preference tags.
- Ask the user for today's occasion manually.
- Fetch weather through an API and use it as a recommendation constraint.
- Generate 2-3 outfit candidates from existing wardrobe items.
- Use tag-based filtering first, then visual-model ranking for final selection.
- Store all personal wardrobe data locally for v1.

## Non-Goals For V1

- No account system.
- No cloud sync.
- No Pinterest OAuth/import.
- No Telegram bot.
- No calendar integration.
- No purchase recommendation workflow.
- No long-term remote image storage.

These are future integrations and should not block the local v1.

## Product Flow

1. Wardrobe setup
   - User adds a wardrobe item by uploading a photo, entering a description, or both.
   - The app sends the photo/description to the local backend.
   - The backend calls the configured visual model and returns suggested tags.
   - User reviews and edits tags before saving.

2. Style preference setup
   - User uploads liked outfit images.
   - The app asks the visual model to extract style tags and preference notes.
   - The app stores these preference tags locally and uses them during ranking.

3. Daily recommendation
   - User opens the app and selects today's occasion, such as class, commute, date, sport, casual, or formal.
   - Backend fetches current weather for the configured location.
   - The app filters wardrobe items by weather and occasion tags.
   - The app builds outfit candidates from available categories.
   - The backend asks the visual model to rank the candidate outfits.
   - The UI shows 2-3 recommended outfits with reasons.

## Architecture

Use a local web app with a frontend and a small backend.

- Frontend: React + Vite.
- Backend: Node.js + Express.
- Local storage: IndexedDB in the browser.
- Image handling: browser stores uploaded image blobs locally.
- Weather access: backend endpoint proxies a weather API.
- Model access: backend endpoint proxies the OpenAI-compatible visual model.

API keys must live in `.env` and must not be hard-coded in source files.

## Model Provider

Use an OpenAI-compatible Responses API provider configured from environment variables:

- `MODEL_BASE_URL`
- `MODEL_API_KEY`
- `MODEL_NAME`
- `MODEL_PROVIDER`

Default model name for v1: `gpt-5.4`.

The model should be used for:

- Clothing tag extraction.
- Liked outfit style extraction.
- Final outfit visual ranking.

The model should not be the only decision-maker. Deterministic tag filtering happens before visual ranking.

## Local Data Model

Wardrobe item:

- `id`
- `name`
- `imageBlobId`
- `description`
- `category`
- `colors`
- `seasonTags`
- `weatherTags`
- `occasionTags`
- `styleTags`
- `warmthLevel`
- `formalityLevel`
- `createdAt`
- `updatedAt`

Liked outfit:

- `id`
- `imageBlobId`
- `description`
- `styleTags`
- `notes`
- `createdAt`

Recommendation record:

- `id`
- `date`
- `occasion`
- `weatherSnapshot`
- `outfits`
- `createdAt`

Outfit candidate:

- `id`
- `itemIds`
- `score`
- `reasons`
- `warnings`

## Recommendation Logic

1. Normalize today's context:
   - Weather: temperature, feels-like temperature, rain, wind, condition.
   - Occasion: user-selected manual value.
   - Preference tags: aggregated from liked outfit images.

2. Filter wardrobe items:
   - Exclude items clearly unsuitable for temperature or rain.
   - Prefer items matching the occasion.
   - Prefer items whose style tags overlap with preference tags.

3. Build candidate outfits:
   - Combine compatible tops, bottoms, shoes, and optional outerwear/accessories.
   - Avoid category conflicts.
   - Keep candidate count small enough for model review.

4. Rank candidates:
   - Send candidate image thumbnails, tags, weather, occasion, and preference summary to the model.
   - Ask for ranked top outfits, short reasons, and any warnings.
   - Return 2-3 final outfits.

5. Explain output:
   - Each outfit should explain why it fits weather, occasion, and personal style.
   - If the wardrobe is insufficient, show the best available options and a mild note instead of switching to purchase recommendations.

## UI Views

1. Today
   - Occasion selector.
   - Weather card.
   - Generate recommendations button.
   - 2-3 outfit recommendation cards.
   - Reasons and warnings.

2. Wardrobe
   - Add item by photo and/or description.
   - Auto-generated tags.
   - Editable tag fields.
   - Wardrobe grid with filters.

3. Style Likes
   - Upload liked outfit images.
   - Extracted style tags.
   - Editable preference notes.

4. Settings
   - Location for weather.
   - Model/base URL status.
   - Export/import local backup.

## Error Handling

- If weather API fails, show the failure and allow manual weather input for that day.
- If model tagging fails, let the user create or edit tags manually.
- If model ranking fails, fall back to deterministic tag-based ranking.
- If there are too few wardrobe items, show what category is missing.
- If local browser storage is unavailable, show a blocking error explaining that local storage is required.

## Testing And Acceptance Criteria

Manual acceptance:

- User can add a clothing item from photo or description.
- Auto tags appear and can be edited.
- User can add liked outfit images and extract preference tags.
- User can set location and fetch weather.
- User can choose an occasion and get 2-3 outfits.
- Recommendations use only saved wardrobe items.
- Recommendations include weather, occasion, and style reasons.
- App still works with manual tags if the model API fails.
- Data persists after browser refresh.
- Export/import backup restores wardrobe and likes.

Engineering checks:

- Frontend builds successfully.
- Backend starts locally.
- API keys are read from environment variables only.
- No pasted secrets are committed.

## Assumptions

- First version targets desktop browser use.
- First version runs locally before any Vercel deployment.
- Personal wardrobe images remain local in browser storage.
- A backend proxy is acceptable for model and weather calls.
- Calendar, Pinterest, Telegram, cloud sync, and purchase suggestions are future work.

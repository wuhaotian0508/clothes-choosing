# Telegram personal bot

The project exposes `GET/POST /api/telegram` as a Vercel Function. The bot is intentionally single-user: the webhook accepts Telegram updates only from `TELEGRAM_ALLOWED_USER_ID`, and cloud reads are always filtered to `TELEGRAM_SUPABASE_USER_ID`.

## Commands

- `/start` and `/help`: show usage
- `/weather`: fetch weather for the saved app location
- `/today`: recommend an outfit for class
- `/today casual`, `/today date`, etc.: recommend for a selected occasion

Supported occasions are `class`, `commute`, `date`, `sport`, `casual`, `formal`, and `travel`.

## Required server environment

Configure these in Vercel, never in browser-exposed `VITE_*` variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- `TELEGRAM_ALLOWED_USER_ID`
- `TELEGRAM_SUPABASE_USER_ID`

The Supabase secret key bypasses RLS, so the endpoint first validates Telegram's webhook secret and then enforces both fixed user IDs before reading any wardrobe rows.

## Registration

After deployment, register the webhook with Telegram's `setWebhook` method using:

- URL: `https://<deployment-domain>/api/telegram`
- Secret token: the exact value of `TELEGRAM_WEBHOOK_SECRET_TOKEN`

The browser wardrobe must be signed in and synced before `/today` can see its items.

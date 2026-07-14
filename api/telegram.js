import {
  getMissingTelegramConfig,
  processTelegramUpdate,
  verifyTelegramSecret
} from "./_telegram.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const missing = getMissingTelegramConfig();
    return res.status(missing.length ? 503 : 200).json({
      ok: missing.length === 0,
      configured: missing.length === 0,
      missing
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const missing = getMissingTelegramConfig();
  if (missing.length) {
    return res.status(503).json({ error: "telegram_not_configured", missing });
  }

  const suppliedSecret = req.headers["x-telegram-bot-api-secret-token"];
  if (!verifyTelegramSecret(suppliedSecret, process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN)) {
    return res.status(401).json({ error: "invalid_webhook_secret" });
  }

  try {
    const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const result = await processTelegramUpdate(update);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error("Telegram webhook failed", error instanceof Error ? error.message : error);
    return res.status(500).json({ error: "telegram_webhook_failed" });
  }
}

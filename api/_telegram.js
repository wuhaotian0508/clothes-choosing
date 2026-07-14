import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { callModelJson, fetchWeather, geocodeLocation } from "./_shared.js";
import { buildRecommendations } from "./_recommendation.js";

export const TELEGRAM_OCCASIONS = [
  "class",
  "commute",
  "date",
  "sport",
  "casual",
  "formal",
  "travel"
];

const OCCASION_LABELS = {
  class: "上课",
  commute: "通勤",
  date: "约会",
  sport: "运动",
  casual: "休闲",
  formal: "正式",
  travel: "旅行"
};

export function getMissingTelegramConfig(env = process.env) {
  return [
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_WEBHOOK_SECRET_TOKEN",
    "TELEGRAM_ALLOWED_USER_ID",
    "TELEGRAM_SUPABASE_USER_ID",
    "SUPABASE_SECRET_KEY"
  ].filter((name) => !env[name]);
}

export function extractTelegramUserId(update) {
  const actor =
    update?.message?.from ??
    update?.edited_message?.from ??
    update?.callback_query?.from ??
    update?.inline_query?.from;
  return actor?.id === undefined ? "" : String(actor.id);
}

export function parseTelegramCommand(text = "") {
  const match = String(text).trim().match(/^\/([a-z]+)(?:@[a-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return { name: match[1].toLowerCase(), argument: (match[2] ?? "").trim().toLowerCase() };
}

export function verifyTelegramSecret(actual, expected) {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function processTelegramUpdate(update, env = process.env) {
  const message = update?.message;
  if (!message?.chat?.id || !message.text) return { ignored: true };

  const senderId = extractTelegramUserId(update);
  if (senderId !== String(env.TELEGRAM_ALLOWED_USER_ID)) {
    return { ignored: true };
  }

  const chatId = message.chat.id;
  const command = parseTelegramCommand(message.text);
  if (!command || ["start", "help"].includes(command.name)) {
    await sendTelegramMessage(chatId, helpText(), env);
    return { handled: true };
  }

  if (command.name === "weather") {
    await sendTelegramChatAction(chatId, "typing", env);
    try {
      const context = await loadCloudContext(env);
      const weather = await loadWeather(context.settings, env);
      await sendTelegramMessage(chatId, formatWeather(weather), env);
    } catch (error) {
      await sendTelegramMessage(chatId, formatUserFacingError(error), env);
    }
    return { handled: true };
  }

  if (command.name === "today") {
    const occasion = command.argument || "class";
    if (!TELEGRAM_OCCASIONS.includes(occasion)) {
      await sendTelegramMessage(
        chatId,
        `不认识场合“${occasion}”。可用：${TELEGRAM_OCCASIONS.join(", ")}`,
        env
      );
      return { handled: true };
    }

    await sendTelegramChatAction(chatId, "typing", env);
    try {
      const result = await createTodayRecommendation(occasion, env);
      await sendTelegramMessage(chatId, formatRecommendation(result), env);
    } catch (error) {
      await sendTelegramMessage(chatId, formatUserFacingError(error), env);
    }
    return { handled: true };
  }

  await sendTelegramMessage(chatId, helpText(), env);
  return { handled: true };
}

export async function createTodayRecommendation(occasion, env = process.env) {
  const context = await loadCloudContext(env);
  const weather = await loadWeather(context.settings, env);
  const candidates = buildRecommendations({
    wardrobe: context.wardrobe,
    weather,
    occasion,
    preferenceTags: context.preferenceTags
  });

  if (candidates.length === 0) {
    return { ...context, weather, occasion, outfits: [] };
  }

  const prompt = [
    "Rank these outfit candidates for today.",
    "Return strict JSON with an outfits array. Each item must contain id, score, reasons, warnings.",
    `Weather: ${JSON.stringify(weather)}`,
    `Occasion: ${occasion}`,
    `Preference tags: ${JSON.stringify(context.preferenceTags)}`,
    `Candidates: ${JSON.stringify(candidates)}`
  ].join("\n");
  const ranked = await callModelJson({
    prompt,
    fallback: { outfits: candidates }
  });
  const outfits = normalizeRankedOutfits(ranked.outfits, candidates);

  await saveRecommendation({ weather, occasion, outfits }, env).catch((error) => {
    console.warn("Telegram recommendation could not be saved", error instanceof Error ? error.message : error);
  });

  return { ...context, weather, occasion, outfits };
}

export function formatRecommendation({ wardrobe, weather, occasion, outfits }) {
  const lines = [
    `🌤 ${weather.location}`,
    `体感 ${Math.round(weather.feelsLikeC)}°C · ${weather.condition} · 降水 ${weather.precipitationMm} mm`,
    `场合：${OCCASION_LABELS[occasion] ?? occasion}`,
    ""
  ];

  if (!outfits.length) {
    lines.push("云端衣橱里还凑不出合适的上衣、下装和鞋。请先在网页登录并执行 Sync now。");
    return lines.join("\n");
  }

  const itemsById = new Map(wardrobe.map((item) => [item.id, item]));
  outfits.forEach((outfit, index) => {
    const names = outfit.itemIds.map((id) => itemsById.get(id)?.name ?? id);
    lines.push(`${index + 1}. ${names.join(" + ")}（${Math.round(outfit.score)} 分）`);
    for (const reason of (outfit.reasons ?? []).slice(0, 2)) lines.push(`   · ${reason}`);
    for (const warning of (outfit.warnings ?? []).slice(0, 1)) lines.push(`   ⚠ ${warning}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

function helpText() {
  return [
    "👕 Clothes Choosing 已连接。",
    "",
    "/today — 默认按上课场景推荐",
    "/today casual — 休闲穿搭",
    "/today date — 约会穿搭",
    "/weather — 查看衣橱设置地点的天气",
    "/help — 查看帮助",
    "",
    `场合参数：${TELEGRAM_OCCASIONS.join(", ")}`
  ].join("\n");
}

function formatWeather(weather) {
  return [
    `🌤 ${weather.location}`,
    `温度 ${Math.round(weather.temperatureC)}°C，体感 ${Math.round(weather.feelsLikeC)}°C`,
    `${weather.condition} · 降水 ${weather.precipitationMm} mm · 风速 ${Math.round(weather.windKph)} km/h`
  ].join("\n");
}

function formatUserFacingError(error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (/cloud wardrobe is empty/i.test(message)) {
    return "云端衣橱还是空的。请先在网页用邮箱登录，点击 Sync now，然后再试 /today。";
  }
  if (/telegram_supabase_user_id|supabase_secret_key|supabase url/i.test(message)) {
    return "机器人还没有完成衣橱账号绑定，请检查服务端配置。";
  }
  return `暂时没能生成推荐：${message.slice(0, 240)}`;
}

async function loadCloudContext(env) {
  const client = createSupabaseAdmin(env);
  const userId = env.TELEGRAM_SUPABASE_USER_ID;
  const [wardrobeResult, likesResult, settingsResult] = await Promise.all([
    client.from("clothes_wardrobe_items").select("data").eq("user_id", userId),
    client.from("clothes_liked_outfits").select("data").eq("user_id", userId),
    client.from("clothes_user_settings").select("data").eq("user_id", userId).maybeSingle()
  ]);

  for (const result of [wardrobeResult, likesResult, settingsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const wardrobe = (wardrobeResult.data ?? []).map((row) => row.data).filter(Boolean);
  if (!wardrobe.length) throw new Error("Cloud wardrobe is empty");
  const likes = (likesResult.data ?? []).map((row) => row.data).filter(Boolean);
  const preferenceTags = [...new Set(likes.flatMap((item) => item.styleTags ?? []))];
  const settings = settingsResult.data?.data ?? {
    location: env.WEATHER_DEFAULT_LOCATION || "Los Angeles"
  };
  return { client, wardrobe, preferenceTags, settings };
}

function createSupabaseAdmin(env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE URL is missing");
  if (!env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is missing");
  if (!env.TELEGRAM_SUPABASE_USER_ID) throw new Error("TELEGRAM_SUPABASE_USER_ID is missing");
  return createClient(url, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

async function loadWeather(settings, env) {
  const hasCoordinates = Number.isFinite(settings.latitude) && Number.isFinite(settings.longitude);
  const geo = hasCoordinates
    ? { name: settings.location || "Current location", latitude: settings.latitude, longitude: settings.longitude }
    : await geocodeLocation(settings.location || env.WEATHER_DEFAULT_LOCATION || "Los Angeles");
  return fetchWeather(geo);
}

function normalizeRankedOutfits(ranked, candidates) {
  if (!Array.isArray(ranked)) return candidates;
  const candidatesById = new Map(candidates.map((item) => [item.id, item]));
  const normalized = ranked
    .map((item) => {
      const fallback = candidatesById.get(item?.id);
      if (!fallback) return null;
      return {
        ...fallback,
        score: Number.isFinite(Number(item.score)) ? Number(item.score) : fallback.score,
        reasons: Array.isArray(item.reasons) ? item.reasons.map(String) : fallback.reasons,
        warnings: Array.isArray(item.warnings) ? item.warnings.map(String) : fallback.warnings
      };
    })
    .filter(Boolean)
    .slice(0, 3);
  return normalized.length ? normalized : candidates;
}

async function saveRecommendation({ weather, occasion, outfits }, env) {
  const client = createSupabaseAdmin(env);
  const id = crypto.randomUUID();
  const record = {
    id,
    date: new Date().toISOString().slice(0, 10),
    occasion,
    weatherSnapshot: weather,
    outfits,
    createdAt: new Date().toISOString()
  };
  const { error } = await client.from("clothes_recommendation_records").upsert({
    id,
    user_id: env.TELEGRAM_SUPABASE_USER_ID,
    data: record,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
}

async function callTelegram(method, body, env) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(`Telegram ${method} failed with HTTP ${response.status}: ${data.description ?? "Unknown error"}`);
  }
  return data.result;
}

async function sendTelegramMessage(chatId, text, env) {
  return callTelegram("sendMessage", { chat_id: chatId, text: String(text).slice(0, 4096) }, env);
}

async function sendTelegramChatAction(chatId, action, env) {
  return callTelegram("sendChatAction", { chat_id: chatId, action }, env);
}

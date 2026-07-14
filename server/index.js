import "dotenv/config";
import express from "express";
import telegramHandler from "../api/telegram.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(express.json({ limit: "25mb" }));

app.all("/api/telegram", telegramHandler);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    modelConfigured: Boolean(process.env.MODEL_BASE_URL && process.env.MODEL_API_KEY),
    weatherProvider: "open-meteo"
  });
});

app.get("/api/weather", async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lon);
    const label = String(req.query.location || "Current location");
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
    const geo = hasCoordinates
      ? { name: label, latitude, longitude }
      : await geocodeLocation(String(req.query.location || process.env.WEATHER_DEFAULT_LOCATION || "Los Angeles"));
    const weather = await fetchWeather(geo);
    res.json(weather);
  } catch (error) {
    res.status(502).json({
      error: "weather_fetch_failed",
      message: error instanceof Error ? error.message : "Unknown weather error"
    });
  }
});

app.post("/api/model/tag-clothing", async (req, res) => {
  const { imageDataUrl, description } = req.body ?? {};
  const prompt = [
    "Analyze this wardrobe item for a personal outfit recommendation app.",
    "Return strict JSON with: name, category, colors, seasonTags, weatherTags, occasionTags, styleTags, warmthLevel, formalityLevel.",
    "Use concise lowercase English tags. category must be one of top, bottom, shoes, outerwear, accessory, onepiece.",
    description ? `User description: ${description}` : ""
  ].join("\n");

  const fallback = inferClothingFallback(description);
  const result = await callModelJson({ prompt, imageDataUrl, fallback });
  res.json(result);
});

app.post("/api/model/extract-style", async (req, res) => {
  const { imageDataUrl, description } = req.body ?? {};
  const prompt = [
    "Analyze this liked outfit reference for a personal outfit recommendation app.",
    "Return strict JSON with: styleTags, notes.",
    "Use concise lowercase English tags describing silhouette, vibe, colors, formality, season, and styling.",
    description ? `User note: ${description}` : ""
  ].join("\n");

  const fallback = {
    styleTags: splitTags(description).length ? splitTags(description) : ["clean", "casual"],
    notes: description || "Manual style reference. Add or edit tags to improve recommendations."
  };
  const result = await callModelJson({ prompt, imageDataUrl, fallback });
  res.json(result);
});

app.post("/api/model/rank-outfits", async (req, res) => {
  const { candidates, weather, occasion, preferenceTags } = req.body ?? {};
  const prompt = [
    "Rank these outfit candidates for today.",
    "Return strict JSON with an outfits array. Each item must contain id, score, reasons, warnings.",
    `Weather: ${JSON.stringify(weather)}`,
    `Occasion: ${occasion}`,
    `Preference tags: ${JSON.stringify(preferenceTags)}`,
    `Candidates: ${JSON.stringify(candidates)}`
  ].join("\n");

  const fallback = {
    outfits: Array.isArray(candidates) ? candidates.slice(0, 3) : []
  };
  const result = await callModelJson({ prompt, fallback });
  res.json(result);
});

app.listen(port, () => {
  console.log(`Local outfit assistant API running on http://localhost:${port}`);
});

async function geocodeLocation(location) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", location);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const first = data.results?.[0];
  if (!first) {
    throw new Error(`No weather location found for "${location}"`);
  }

  return {
    name: [first.name, first.admin1, first.country].filter(Boolean).join(", "),
    latitude: first.latitude,
    longitude: first.longitude
  };
}

async function fetchWeather(location) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current", "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Forecast failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const current = data.current;
  return {
    location: location.name,
    temperatureC: current.temperature_2m,
    feelsLikeC: current.apparent_temperature,
    precipitationMm: current.precipitation,
    windKph: current.wind_speed_10m,
    condition: weatherCodeToText(current.weather_code)
  };
}

async function callModelJson({ prompt, imageDataUrl, fallback }) {
  if (!process.env.MODEL_BASE_URL || !process.env.MODEL_API_KEY) {
    return { ...fallback, modelUsed: false };
  }

  try {
    const baseUrl = process.env.MODEL_BASE_URL.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MODEL_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.MODEL_NAME || "gpt-5.4",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: `${prompt}\nReturn JSON only, no markdown.` },
              ...(imageDataUrl ? [{ type: "input_image", image_url: imageDataUrl }] : [])
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Model failed with HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = extractResponseText(data);
    return { ...JSON.parse(text), modelUsed: true };
  } catch (error) {
    return {
      ...fallback,
      modelUsed: false,
      modelError: error instanceof Error ? error.message : "Unknown model error"
    };
  }
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const text = data.output
    ?.flatMap((item) => item.content ?? [])
    ?.map((content) => content.text)
    ?.filter(Boolean)
    ?.join("\n");

  if (!text) {
    throw new Error("Model response did not include text output");
  }

  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

function inferClothingFallback(description = "") {
  const text = description.toLowerCase();
  const category = text.includes("shoe") || text.includes("sneaker")
    ? "shoes"
    : text.includes("pant") || text.includes("jean") || text.includes("trouser") || text.includes("short")
      ? "bottom"
      : text.includes("jacket") || text.includes("coat") || text.includes("hoodie")
        ? "outerwear"
        : text.includes("dress")
          ? "onepiece"
          : "top";

  const styleTags = splitTags(description).length ? splitTags(description) : ["casual"];
  return {
    name: description?.trim()?.slice(0, 48) || "Wardrobe item",
    category,
    colors: inferColors(text),
    seasonTags: ["spring", "fall"],
    weatherTags: ["mild"],
    occasionTags: ["casual", "class"],
    styleTags,
    warmthLevel: category === "outerwear" ? 3 : 2,
    formalityLevel: text.includes("formal") ? 4 : 2
  };
}

function splitTags(value = "") {
  return value
    .split(/[,，\s]+/)
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 1)
    .slice(0, 8);
}

function inferColors(text) {
  const colors = ["black", "white", "gray", "navy", "blue", "brown", "green", "red", "pink", "beige"];
  const found = colors.filter((color) => text.includes(color));
  return found.length ? found : ["neutral"];
}

function weatherCodeToText(code) {
  if ([0].includes(code)) return "clear";
  if ([1, 2, 3].includes(code)) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "unknown";
}

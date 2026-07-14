import type { AppSettings, Occasion, OutfitCandidate, WeatherSnapshot } from "../types";

export async function fetchWeather(settings: AppSettings | string): Promise<WeatherSnapshot> {
  const params = new URLSearchParams();
  if (typeof settings === "string") {
    params.set("location", settings);
  } else if (settings.useCurrentLocation && settings.latitude != null && settings.longitude != null) {
    params.set("lat", String(settings.latitude));
    params.set("lon", String(settings.longitude));
    params.set("location", settings.location || "Current location");
  } else {
    params.set("location", settings.location);
  }

  const response = await fetch(`/api/weather?${params.toString()}`);
  return parseResponse(response);
}

export async function tagClothing(input: { imageDataUrl?: string; description?: string }) {
  const response = await fetch("/api/model/tag-clothing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse(response);
}

export async function extractStyle(input: { imageDataUrl?: string; description?: string }) {
  const response = await fetch("/api/model/extract-style", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse(response);
}

export async function rankOutfits(input: {
  candidates: OutfitCandidate[];
  weather: WeatherSnapshot;
  occasion: Occasion;
  preferenceTags: string[];
}) {
  const response = await fetch("/api/model/rank-outfits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse(response) as Promise<{ outfits: OutfitCandidate[] }>;
}

async function parseResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }
  return data;
}

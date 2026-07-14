import type { Occasion, OutfitCandidate, WardrobeItem, WeatherSnapshot } from "../types";

type BuildInput = {
  wardrobe: WardrobeItem[];
  weather: WeatherSnapshot;
  occasion: Occasion;
  preferenceTags: string[];
  limit?: number;
};

const REQUIRED_CATEGORIES = ["top", "bottom", "shoes"] as const;

export function buildRecommendations({
  wardrobe,
  weather,
  occasion,
  preferenceTags,
  limit = 3
}: BuildInput): OutfitCandidate[] {
  const usable = wardrobe.filter((item) => isWeatherSuitable(item, weather));
  const byCategory = groupByCategory(usable);
  const baseGroups = REQUIRED_CATEGORIES.map((category) => byCategory.get(category) ?? []);

  if (baseGroups.some((items) => items.length === 0)) {
    return [];
  }

  const candidates: OutfitCandidate[] = [];
  for (const top of baseGroups[0]) {
    for (const bottom of baseGroups[1]) {
      for (const shoes of baseGroups[2]) {
        const coreItems = [top, bottom, shoes];
        const bestOuterwear = pickBestOptionalItem(byCategory.get("outerwear") ?? [], {
          weather,
          occasion,
          preferenceTags
        });
        const items = shouldUseOuterwear(weather, bestOuterwear)
          ? [...coreItems, bestOuterwear as WardrobeItem]
          : coreItems;
        const candidate = scoreOutfit(items, weather, occasion, preferenceTags);
        candidates.push(candidate);
      }
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 3)));
}

export function isWeatherSuitable(item: WardrobeItem, weather: WeatherSnapshot): boolean {
  const tags = new Set(item.weatherTags.map(normalize));
  const raining = weather.precipitationMm > 0 || /rain|drizzle|storm/i.test(weather.condition);
  const feelsLike = weather.feelsLikeC;

  if (raining && tags.has("dry-only")) {
    return false;
  }
  if (feelsLike <= 8 && tags.has("hot")) {
    return false;
  }
  if (feelsLike >= 27 && (tags.has("cold") || item.warmthLevel >= 4)) {
    return false;
  }
  if (feelsLike <= 12 && item.category !== "outerwear" && item.warmthLevel <= 1) {
    return false;
  }

  return true;
}

function groupByCategory(items: WardrobeItem[]) {
  const map = new Map<string, WardrobeItem[]>();
  for (const item of items) {
    map.set(item.category, [...(map.get(item.category) ?? []), item]);
  }
  return map;
}

function scoreOutfit(
  items: WardrobeItem[],
  weather: WeatherSnapshot,
  occasion: Occasion,
  preferenceTags: string[]
): OutfitCandidate {
  const normalizedPreference = new Set(preferenceTags.map(normalize));
  const itemIds = items.map((item) => item.id);
  let score = 0;
  const reasons = new Set<string>();
  const warnings: string[] = [];

  for (const item of items) {
    if (item.occasionTags.map(normalize).includes(occasion)) {
      score += 8;
      reasons.add(`Matches ${occasion}`);
    }

    const styleMatches = item.styleTags.filter((tag) => normalizedPreference.has(normalize(tag)));
    score += styleMatches.length * 5;
    for (const tag of styleMatches) {
      reasons.add(`Matches ${tag} style`);
    }

    score += weatherScore(item, weather);
  }

  if (weather.precipitationMm > 0 && !items.some((item) => hasTag(item.weatherTags, "rain-ok"))) {
    warnings.push("Rain is expected; no rain-ready item was included.");
  }

  if (reasons.size === 0) {
    reasons.add("Best available combination from saved wardrobe items.");
  }

  return {
    id: itemIds.join("__"),
    itemIds,
    score,
    reasons: Array.from(reasons),
    warnings
  };
}

function weatherScore(item: WardrobeItem, weather: WeatherSnapshot): number {
  const tags = new Set(item.weatherTags.map(normalize));
  let score = 0;

  if (weather.precipitationMm > 0 && tags.has("rain-ok")) {
    score += 4;
  }
  if (weather.feelsLikeC >= 24 && tags.has("hot")) {
    score += 3;
  }
  if (weather.feelsLikeC >= 14 && weather.feelsLikeC <= 23 && tags.has("mild")) {
    score += 3;
  }
  if (weather.feelsLikeC <= 12 && tags.has("cold")) {
    score += 3;
  }

  return score;
}

function pickBestOptionalItem(
  items: WardrobeItem[],
  context: { weather: WeatherSnapshot; occasion: Occasion; preferenceTags: string[] }
) {
  return items
    .filter((item) => isWeatherSuitable(item, context.weather))
    .map((item) => ({
      item,
      score: scoreOutfit([item], context.weather, context.occasion, context.preferenceTags).score
    }))
    .sort((a, b) => b.score - a.score)[0]?.item;
}

function shouldUseOuterwear(weather: WeatherSnapshot, item?: WardrobeItem): boolean {
  if (!item) {
    return false;
  }
  return weather.feelsLikeC <= 18 || weather.precipitationMm > 0 || /rain|wind/i.test(weather.condition);
}

function hasTag(tags: string[], expected: string) {
  return tags.some((tag) => normalize(tag) === normalize(expected));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

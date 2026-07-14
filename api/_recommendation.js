const REQUIRED_CATEGORIES = ["top", "bottom", "shoes"];

export function buildRecommendations({
  wardrobe,
  weather,
  occasion,
  preferenceTags,
  limit = 3
}) {
  const usable = wardrobe.filter((item) => isWeatherSuitable(item, weather));
  const byCategory = groupByCategory(usable);
  const baseGroups = REQUIRED_CATEGORIES.map((category) => byCategory.get(category) ?? []);

  if (baseGroups.some((items) => items.length === 0)) {
    return [];
  }

  const candidates = [];
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
          ? [...coreItems, bestOuterwear]
          : coreItems;
        candidates.push(scoreOutfit(items, weather, occasion, preferenceTags));
      }
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 3)));
}

export function isWeatherSuitable(item, weather) {
  const tags = new Set((item.weatherTags ?? []).map(normalize));
  const raining = weather.precipitationMm > 0 || /rain|drizzle|storm/i.test(weather.condition);
  const feelsLike = weather.feelsLikeC;

  if (raining && tags.has("dry-only")) return false;
  if (feelsLike <= 8 && tags.has("hot")) return false;
  if (feelsLike >= 27 && (tags.has("cold") || item.warmthLevel >= 4)) return false;
  if (feelsLike <= 12 && item.category !== "outerwear" && item.warmthLevel <= 1) return false;
  return true;
}

function groupByCategory(items) {
  const map = new Map();
  for (const item of items) {
    map.set(item.category, [...(map.get(item.category) ?? []), item]);
  }
  return map;
}

function scoreOutfit(items, weather, occasion, preferenceTags) {
  const normalizedPreference = new Set(preferenceTags.map(normalize));
  const itemIds = items.map((item) => item.id);
  let score = 0;
  const reasons = new Set();
  const warnings = [];

  for (const item of items) {
    if ((item.occasionTags ?? []).map(normalize).includes(occasion)) {
      score += 8;
      reasons.add(`Matches ${occasion}`);
    }

    const styleMatches = (item.styleTags ?? []).filter((tag) =>
      normalizedPreference.has(normalize(tag))
    );
    score += styleMatches.length * 5;
    for (const tag of styleMatches) reasons.add(`Matches ${tag} style`);
    score += weatherScore(item, weather);
  }

  if (
    weather.precipitationMm > 0 &&
    !items.some((item) => hasTag(item.weatherTags ?? [], "rain-ok"))
  ) {
    warnings.push("Rain is expected; no rain-ready item was included.");
  }

  if (reasons.size === 0) {
    reasons.add("Best available combination from saved wardrobe items.");
  }

  return { id: itemIds.join("__"), itemIds, score, reasons: [...reasons], warnings };
}

function weatherScore(item, weather) {
  const tags = new Set((item.weatherTags ?? []).map(normalize));
  let score = 0;
  if (weather.precipitationMm > 0 && tags.has("rain-ok")) score += 4;
  if (weather.feelsLikeC >= 24 && tags.has("hot")) score += 3;
  if (weather.feelsLikeC >= 14 && weather.feelsLikeC <= 23 && tags.has("mild")) score += 3;
  if (weather.feelsLikeC <= 12 && tags.has("cold")) score += 3;
  return score;
}

function pickBestOptionalItem(items, context) {
  return items
    .filter((item) => isWeatherSuitable(item, context.weather))
    .map((item) => ({
      item,
      score: scoreOutfit(
        [item],
        context.weather,
        context.occasion,
        context.preferenceTags
      ).score
    }))
    .sort((a, b) => b.score - a.score)[0]?.item;
}

function shouldUseOuterwear(weather, item) {
  if (!item) return false;
  return weather.feelsLikeC <= 18 || weather.precipitationMm > 0 || /rain|wind/i.test(weather.condition);
}

function hasTag(tags, expected) {
  return tags.some((tag) => normalize(tag) === normalize(expected));
}

function normalize(value) {
  return String(value).trim().toLowerCase();
}

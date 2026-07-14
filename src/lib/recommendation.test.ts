import { describe, expect, it } from "vitest";
import { buildRecommendations } from "./recommendation";
import type { WardrobeItem, WeatherSnapshot } from "../types";

const weather: WeatherSnapshot = {
  location: "Los Angeles",
  temperatureC: 18,
  feelsLikeC: 17,
  precipitationMm: 2,
  windKph: 12,
  condition: "light rain"
};

const wardrobe: WardrobeItem[] = [
  {
    id: "top-rain",
    name: "Navy knit shirt",
    category: "top",
    colors: ["navy"],
    seasonTags: ["spring", "fall"],
    weatherTags: ["mild", "rain-ok"],
    occasionTags: ["class", "commute"],
    styleTags: ["clean", "minimal"],
    warmthLevel: 2,
    formalityLevel: 2,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z"
  },
  {
    id: "top-hot",
    name: "Thin beach tee",
    category: "top",
    colors: ["white"],
    seasonTags: ["summer"],
    weatherTags: ["hot", "dry-only"],
    occasionTags: ["casual"],
    styleTags: ["relaxed"],
    warmthLevel: 1,
    formalityLevel: 1,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z"
  },
  {
    id: "bottom-clean",
    name: "Straight black trousers",
    category: "bottom",
    colors: ["black"],
    seasonTags: ["spring", "fall", "winter"],
    weatherTags: ["mild", "rain-ok"],
    occasionTags: ["class", "commute", "formal"],
    styleTags: ["clean", "minimal"],
    warmthLevel: 2,
    formalityLevel: 3,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z"
  },
  {
    id: "bottom-sport",
    name: "Gym shorts",
    category: "bottom",
    colors: ["gray"],
    seasonTags: ["summer"],
    weatherTags: ["hot", "dry-only"],
    occasionTags: ["sport"],
    styleTags: ["athletic"],
    warmthLevel: 1,
    formalityLevel: 1,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z"
  },
  {
    id: "shoes-rain",
    name: "Black leather sneakers",
    category: "shoes",
    colors: ["black"],
    seasonTags: ["spring", "fall", "winter"],
    weatherTags: ["mild", "rain-ok"],
    occasionTags: ["class", "commute", "casual"],
    styleTags: ["clean"],
    warmthLevel: 2,
    formalityLevel: 2,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z"
  },
  {
    id: "shoes-dry",
    name: "Canvas slip-ons",
    category: "shoes",
    colors: ["beige"],
    seasonTags: ["summer"],
    weatherTags: ["dry-only"],
    occasionTags: ["casual"],
    styleTags: ["relaxed"],
    warmthLevel: 1,
    formalityLevel: 1,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z"
  },
  {
    id: "outerwear-rain",
    name: "Light rain jacket",
    category: "outerwear",
    colors: ["charcoal"],
    seasonTags: ["spring", "fall"],
    weatherTags: ["rain-ok", "mild"],
    occasionTags: ["class", "commute", "casual"],
    styleTags: ["minimal"],
    warmthLevel: 2,
    formalityLevel: 2,
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z"
  }
];

describe("buildRecommendations", () => {
  it("filters out dry-only items when rain is expected", () => {
    const result = buildRecommendations({
      wardrobe,
      weather,
      occasion: "class",
      preferenceTags: ["clean", "minimal"]
    });

    const usedIds = result.flatMap((outfit) => outfit.itemIds);

    expect(usedIds).not.toContain("top-hot");
    expect(usedIds).not.toContain("bottom-sport");
    expect(usedIds).not.toContain("shoes-dry");
  });

  it("returns the strongest class outfit first when tags match the preference", () => {
    const [first] = buildRecommendations({
      wardrobe,
      weather,
      occasion: "class",
      preferenceTags: ["clean", "minimal"]
    });

    expect(first.itemIds).toEqual(
      expect.arrayContaining(["top-rain", "bottom-clean", "shoes-rain"])
    );
    expect(first.reasons.join(" ")).toContain("class");
    expect(first.reasons.join(" ")).toContain("clean");
  });

  it("returns at most three outfits built only from saved wardrobe ids", () => {
    const result = buildRecommendations({
      wardrobe,
      weather,
      occasion: "commute",
      preferenceTags: ["minimal"]
    });
    const wardrobeIds = new Set(wardrobe.map((item) => item.id));

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.every((outfit) => outfit.itemIds.every((id) => wardrobeIds.has(id)))).toBe(true);
  });
});

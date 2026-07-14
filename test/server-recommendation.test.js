import { describe, expect, it } from "vitest";
import { buildRecommendations } from "../api/_recommendation.js";

const weather = {
  location: "Berkeley",
  temperatureC: 18,
  feelsLikeC: 18,
  precipitationMm: 0,
  windKph: 8,
  condition: "clear"
};

function item(id, category) {
  return {
    id,
    name: id,
    category,
    weatherTags: ["mild"],
    occasionTags: ["class"],
    styleTags: ["clean"],
    warmthLevel: 2
  };
}

describe("server recommendation engine", () => {
  it("builds a complete outfit from cloud wardrobe records", () => {
    const result = buildRecommendations({
      wardrobe: [item("top", "top"), item("bottom", "bottom"), item("shoes", "shoes")],
      weather,
      occasion: "class",
      preferenceTags: ["clean"]
    });
    expect(result).toHaveLength(1);
    expect(result[0].itemIds).toEqual(["top", "bottom", "shoes"]);
  });
});

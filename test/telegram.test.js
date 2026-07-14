import { describe, expect, it } from "vitest";
import {
  extractTelegramUserId,
  formatRecommendation,
  parseTelegramCommand,
  verifyTelegramSecret
} from "../api/_telegram.js";

describe("Telegram integration helpers", () => {
  it("parses slash commands with bot usernames and arguments", () => {
    expect(parseTelegramCommand("/today@closet_bot casual")).toEqual({
      name: "today",
      argument: "casual"
    });
    expect(parseTelegramCommand("hello")).toBeNull();
  });

  it("extracts the sender id and compares webhook secrets", () => {
    expect(extractTelegramUserId({ message: { from: { id: 12345 } } })).toBe("12345");
    expect(verifyTelegramSecret("safe-token", "safe-token")).toBe(true);
    expect(verifyTelegramSecret("wrong", "safe-token")).toBe(false);
  });

  it("formats wardrobe item names into a concise recommendation", () => {
    const text = formatRecommendation({
      wardrobe: [
        { id: "top", name: "White tee" },
        { id: "bottom", name: "Blue jeans" },
        { id: "shoes", name: "Sneakers" }
      ],
      weather: {
        location: "Berkeley",
        feelsLikeC: 18,
        precipitationMm: 0,
        condition: "clear"
      },
      occasion: "class",
      outfits: [
        {
          itemIds: ["top", "bottom", "shoes"],
          score: 24,
          reasons: ["Matches class"],
          warnings: []
        }
      ]
    });
    expect(text).toContain("White tee + Blue jeans + Sneakers");
    expect(text).toContain("Berkeley");
  });
});

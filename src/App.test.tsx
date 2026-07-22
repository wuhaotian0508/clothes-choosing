import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./lib/cloudAuth", () => ({
  ensureClothesProfile: vi.fn(),
  getCloudSession: vi.fn().mockResolvedValue(null),
  getCurrentAppRole: vi.fn().mockResolvedValue("user"),
  onCloudAuthChange: vi.fn(() => () => undefined)
}));

vi.mock("./lib/storage", () => ({
  getSettings: vi.fn().mockResolvedValue({ location: "Los Angeles" }),
  listLikes: vi.fn().mockResolvedValue([]),
  listRecommendations: vi.fn().mockResolvedValue([]),
  listWardrobe: vi.fn().mockResolvedValue([]),
  saveSettings: vi.fn(),
  syncLocalToCloud: vi.fn()
}));

describe("App desktop workspace", () => {
  it("provides a branded primary navigation and dashboard header", async () => {
    render(<App />);

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeTruthy();
    expect(screen.getByText("Local Outfit Assistant")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Your wardrobe, considered." })).toBeTruthy();
    expect((await screen.findAllByText("Los Angeles")).length).toBeGreaterThan(0);
  });
});

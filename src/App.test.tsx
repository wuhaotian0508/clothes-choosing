import { fireEvent, render, screen } from "@testing-library/react";
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

    expect(screen.getByRole("navigation", { name: "YiYi navigation" })).toBeTruthy();
    expect(screen.getByText("Local Outfit Assistant")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tell YiYi about your day." })).toBeTruthy();
    expect(screen.getByText("Text + voice")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start voice input" })).toBeTruthy();
    expect((await screen.findAllByText("Los Angeles")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Wardrobe" }));
    expect(await screen.findByRole("heading", { name: "My wardrobe" })).toBeTruthy();
  });
});

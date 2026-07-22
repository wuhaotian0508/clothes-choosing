import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminView from "./AdminView";

const getAdminSummaryCounts = vi.fn();
const listAdminProfiles = vi.fn();
const getAdminUserData = vi.fn();

vi.mock("../lib/admin", () => ({
  getAdminSummaryCounts: () => getAdminSummaryCounts(),
  listAdminProfiles: (options: unknown) => listAdminProfiles(options),
  getAdminUserData: (userId: string) => getAdminUserData(userId)
}));

describe("AdminView", () => {
  beforeEach(() => {
    getAdminSummaryCounts.mockResolvedValue({
      users: 1,
      wardrobe: 1,
      likes: 0,
      recommendations: 0
    });
    listAdminProfiles.mockResolvedValue({
      profiles: [
        {
          userId: "user-1",
          email: "person@example.com",
          firstSeenAt: "2026-07-01T12:00:00.000Z",
          lastSeenAt: "2026-07-13T12:00:00.000Z"
        }
      ],
      total: 1
    });
    getAdminUserData.mockResolvedValue({
      wardrobe: [
        {
          id: "item-1",
          name: "Blue shirt",
          category: "top",
          colors: ["blue"],
          seasonTags: ["summer"],
          weatherTags: ["mild"],
          occasionTags: ["class"],
          styleTags: ["minimal"],
          warmthLevel: 2,
          formalityLevel: 2,
          createdAt: "2026-07-13T12:00:00.000Z",
          updatedAt: "2026-07-13T12:00:00.000Z"
        }
      ],
      likes: [],
      recommendations: [],
      settings: {
        location: "Current location",
        latitude: 37.8715,
        longitude: -122.273
      }
    });
  });

  it("loads one selected user's data and exposes settings read-only", async () => {
    render(<AdminView />);

    fireEvent.click(await screen.findByRole("button", { name: /person@example.com/i }));
    expect(await screen.findByText("Blue shirt")).toBeTruthy();
    expect(getAdminUserData).toHaveBeenCalledWith("user-1");

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(await screen.findByText("Sensitive location data")).toBeTruthy();
    expect(screen.getByText("37.8715")).toBeTruthy();
    expect(screen.getByText("-122.273")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });
});

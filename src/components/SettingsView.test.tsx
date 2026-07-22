import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsView from "./SettingsView";

vi.mock("../lib/cloudAuth", () => ({
  getCloudConfigStatus: () => "configured",
  sendMagicLink: vi.fn(),
  signOutCloud: vi.fn()
}));

vi.mock("../lib/storage", () => ({
  downloadJson: vi.fn(),
  exportBackup: vi.fn(),
  importBackup: vi.fn(),
  syncLocalToCloud: vi.fn()
}));

const sharedProps = {
  settings: { location: "Los Angeles" },
  onSettingsChange: vi.fn(),
  onChanged: vi.fn()
};

describe("SettingsView cloud account", () => {
  it("shows a clear optional login form when signed out", () => {
    render(
      <SettingsView
        {...sharedProps}
        sessionEmail={null}
        role="user"
        onOpenAdmin={vi.fn()}
      />
    );

    expect(screen.getByText("Cloud account")).toBeTruthy();
    expect(screen.getByText(/optional sign-in/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send login link" })).toBeTruthy();
  });

  it("shows administrator access and opens the dashboard", () => {
    const onOpenAdmin = vi.fn();
    render(
      <SettingsView
        {...sharedProps}
        sessionEmail="3069867102@qq.com"
        role="admin"
        onOpenAdmin={onOpenAdmin}
      />
    );

    expect(screen.getByText("Administrator")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Admin dashboard" }));
    expect(onOpenAdmin).toHaveBeenCalledOnce();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthGate from "./AuthGate";

const sendMagicLink = vi.fn();

vi.mock("../lib/cloudAuth", () => ({
  getCloudConfigStatus: () => "configured",
  sendMagicLink: (email: string) => sendMagicLink(email)
}));

describe("AuthGate", () => {
  beforeEach(() => {
    sendMagicLink.mockReset();
    sendMagicLink.mockResolvedValue(undefined);
  });

  it("shows the admin visibility notice before sending a magic link", async () => {
    render(<AuthGate />);

    expect(screen.getByText("Cloud privacy notice")).toBeTruthy();
    expect(screen.getByText(/saved precise location can be viewed/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send login link" }));

    await waitFor(() => expect(sendMagicLink).toHaveBeenCalledWith("person@example.com"));
    expect(await screen.findByText(/check your email/i)).toBeTruthy();
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HubHome from "./HubHome.jsx";

const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock
}));

vi.mock("../state/sounds.js", () => ({
  playSound: vi.fn(),
  unlockAudio: vi.fn()
}));

describe("HubHome", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("joins a room with a normalized code", () => {
    render(<HubHome />);

    fireEvent.change(screen.getByPlaceholderText("Enter room code"), {
      target: { value: " ab12 " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Join Room" }));

    expect(navigateMock).toHaveBeenCalledWith("/room/AB12");
  });

  it("creates a room and navigates to the join code", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ joinCode: "Z9QK" })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HubHome />);

    fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/rooms",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxPlayers: 12 })
        })
      );
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/room/Z9QK");
    });
  });
});

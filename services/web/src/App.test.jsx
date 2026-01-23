import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

vi.mock("./state/sounds.js", () => ({
  isSoundEnabled: vi.fn(() => true),
  playSound: vi.fn(),
  setSoundEnabled: vi.fn(),
  unlockAudio: vi.fn()
}));

describe("App", () => {
  const renderRoute = (route) => {
    render(
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    );
  };

  const expectRouteText = (text) => {
    const matches = screen.getAllByText((_, element) => element?.textContent === text);
    expect(matches.length).toBeGreaterThan(0);
  };

  it("renders key routes", () => {
    const routes = [
      { path: "/", text: "GAME HUB" },
      { path: "/wordle", text: "WORDLE_" },
      { path: "/connect4", text: "CONNECT 4" },
      { path: "/draw", text: "Draw & Guess" },
      { path: "/charades", text: "Charades" },
      { path: "/slither", text: "SERPENT.IO" }
    ];

    routes.forEach(({ path, text }) => {
      renderRoute(path);
      expectRouteText(text);
      cleanup();
    });
  });

  it("redirects unknown routes to the hub", () => {
    renderRoute("/unknown-route");
    expectRouteText("GAME HUB");
  });
});

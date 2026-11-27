import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { App } from "../App";

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null, login: vi.fn(), register: vi.fn() }),
}));

vi.mock("../hooks/useInstallation", () => ({
  useInstallation: () => ({
    data: { setup_required: true, registration_enabled: true, migration_required: false },
    isPending: false, isError: false, refetch: vi.fn(),
  }),
}));

afterEach(() => cleanup());

describe("Classic authentication on an empty installation", () => {
  it("keeps the original sign-in page and sign-up link accessible", async () => {
    window.history.replaceState({}, "", "/signin");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("/signup");
    expect(window.location.pathname).toBe("/signin");
  });

  it.each(["/signup", "/setup"])("opens the original sign-up page from %s", async path => {
    window.history.replaceState({}, "", path);
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Sign up" })).toBeTruthy();
    expect(window.location.pathname).toBe("/signup");
    expect(screen.queryByText("Installation code")).toBeNull();
  });
});

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AboutSettings } from "../components/AboutSettings";
import { api } from "../api/client";
vi.mock("../api/client", () => ({ api: { get: vi.fn() } }));
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><AboutSettings/></QueryClientProvider>); }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.get).mockResolvedValue({ data: { version: "0.1.0", python: "3.12.5", fastapi: "0.115.0", database: "SQLite 3.45", mlflow: "2.15.0", dvc: null, runtime: "Linux" } }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("About settings", () => {
  it("shows real runtime and build data and provides the project links", async () => {
    mount(); await screen.findByText("3.12.5");
    expect(screen.getByText("SQLite 3.45")).toBeTruthy();
    expect(screen.getByText("Not installed")).toBeTruthy();
    expect(screen.getByText(`v${__MLITE_BUILD__.version}`)).toBeTruthy();
    expect(screen.getByRole("link", { name: "GitHub" }).getAttribute("href")).toBe("https://github.com/Youssef-Laaroussi/MLOpsLite");
    expect(screen.getByRole("link", { name: "Releases" }).getAttribute("href")).toContain("/releases");
  });
  it("expands the additional technologies", async () => {
    mount(); await screen.findByText("3.12.5");
    fireEvent.click(screen.getByRole("button", { name: "Show more technologies" }));
    expect(screen.getByText("SQLAlchemy")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show fewer technologies" }));
    expect(screen.queryByText("SQLAlchemy")).toBeNull();
  });
  it("retries unavailable runtime information", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Offline"));
    mount(); await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("3.12.5");
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("copies the full commit rather than its abbreviated display", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    mount(); await screen.findByText("3.12.5");
    if (__MLITE_BUILD__.commit) {
      fireEvent.click(screen.getByRole("button", { name: "Copy commit hash" }));
      await screen.findByRole("status");
      expect(writeText).toHaveBeenCalledWith(__MLITE_BUILD__.commit);
    } else expect((screen.getByRole("button", { name: "Copy commit hash" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesSettings } from "../components/PreferencesSettings";
import { fetchProjects } from "../api/client";
import { useAuth } from "../context/AuthContext";
vi.mock("../api/client", () => ({ fetchProjects: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><PreferencesSettings/></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  vi.mocked(useAuth).mockReturnValue({ user: { id: "user-1" } } as ReturnType<typeof useAuth>);
  vi.mocked(fetchProjects).mockResolvedValue([{ id: "project-1", name: "Personal" }] as Awaited<ReturnType<typeof fetchProjects>>);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("Preferences settings", () => {
  it("remembers appearance, real project selection, and switches after remount", async () => {
    const view = mount(); await screen.findByRole("option", { name: "Personal" });
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.change(screen.getByLabelText("Default project"), { target: { value: "project-1" } });
    fireEvent.click(screen.getByRole("switch", { name: "Show timestamps in logs" }));
    view.unmount(); mount();
    await screen.findByRole("option", { name: "Personal" });
    expect(screen.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByLabelText("Default project") as HTMLSelectElement).value).toBe("project-1");
    expect(screen.getByRole("switch", { name: "Show timestamps in logs" }).getAttribute("aria-checked")).toBe("false");
  });
  it("restores all defaults and the existing overview refresh preference", async () => {
    mount(); await screen.findByRole("option", { name: "Personal" });
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    fireEvent.change(screen.getByLabelText("Font size"), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText("Dashboard refresh"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("switch", { name: "Enable model versioning" }));
    expect(localStorage.getItem("mlite_pref_refresh")).toBe("60");
    fireEvent.click(screen.getByRole("button", { name: "Reset to Default" }));
    expect(screen.getByRole("button", { name: "Light" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByLabelText("Font size") as HTMLSelectElement).value).toBe("14");
    expect(screen.getByRole("switch", { name: "Enable model versioning" }).getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem("mlite_pref_refresh")).toBe("15");
    expect(JSON.parse(localStorage.getItem("mlite_preferences_user-1")!).appearance).toBe("light");
  });
  it("uses defaults for invalid saved values and keeps regional choices", async () => {
    localStorage.setItem("mlite_preferences_user-1", JSON.stringify({ appearance: "invalid", timezone: "not-a-zone", fontSize: 999, language: "fr" }));
    mount(); await screen.findByRole("option", { name: "Personal" });
    expect((screen.getByLabelText("Language") as HTMLSelectElement).value).toBe("fr");
    expect((screen.getByLabelText("Timezone") as HTMLSelectElement).value).toBe("Africa/Casablanca");
    expect((screen.getByLabelText("Font size") as HTMLSelectElement).value).toBe("14");
  });
  it("reports browser storage failures and retains the prior setting", async () => {
    mount(); await screen.findByRole("option", { name: "Personal" });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(screen.getByRole("alert").textContent).toContain("Could not save");
    expect(screen.getByRole("button", { name: "Light" }).getAttribute("aria-pressed")).toBe("true");
  });
  it("handles unavailable projects without inventing project names", async () => {
    vi.mocked(fetchProjects).mockRejectedValue(new Error("Offline"));
    mount(); await screen.findByRole("option", { name: "Projects unavailable" });
    expect((screen.getByLabelText("Default project") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.queryByRole("option", { name: "Personal" })).toBeNull();
  });
  it("keeps each user's preferences separate", async () => {
    const first = mount(); await screen.findByRole("option", { name: "Personal" });
    fireEvent.click(screen.getByRole("button", { name: "Dark" })); first.unmount();
    vi.mocked(useAuth).mockReturnValue({ user: { id: "user-2" } } as ReturnType<typeof useAuth>);
    mount(); await waitFor(() => expect(screen.getByRole("button", { name: "Light" }).getAttribute("aria-pressed")).toBe("true"));
  });
});

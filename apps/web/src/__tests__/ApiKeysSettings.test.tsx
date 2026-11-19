import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiKeysSettings } from "../components/ApiKeysSettings";
import { createApiKey, fetchApiKeys, revokeApiKey } from "../api/client";
const { confirmAction } = vi.hoisted(() => ({ confirmAction: vi.fn() }));
vi.mock("../api/client", () => ({ createApiKey: vi.fn(), fetchApiKeys: vi.fn(), revokeApiKey: vi.fn() }));
vi.mock("../components/ActionFeedback", () => ({ useActionFeedback: () => ({ confirmAction }) }));
const active = { id: "active", name: "ci-deploy", key_prefix: "mlt_test", created_at: "2026-01-01T00:00:00Z", expires_at: null, is_revoked: false };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchApiKeys).mockResolvedValue([active]); confirmAction.mockResolvedValue(true); });
afterEach(cleanup);
describe("API keys settings", () => {
  it("requires both starred fields before creating a key", async () => {
    render(<ApiKeysSettings/>); await screen.findByText("ci-deploy");
    const name = screen.getByLabelText(/Key Name/) as HTMLInputElement;
    const permissions = screen.getByLabelText(/Permissions/) as HTMLSelectElement;
    expect(name.required).toBe(true);
    expect(permissions.required).toBe(true);
    expect(permissions.value).toBe("");
    expect(screen.getByText("Select permissions...")).toBeTruthy();
    expect(screen.getByText("Permissions (Scopes)").querySelector("em")?.textContent).toBe("*");
    fireEvent.change(name, { target: { value: "runner" } });
    fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
    expect(createApiKey).not.toHaveBeenCalled();
  });
  it("creates a key with the selected expiration and shows the secret only once", async () => {
    vi.mocked(createApiKey).mockResolvedValue({ ...active, key: "test-secret-only" });
    render(<ApiKeysSettings/>);
    await screen.findByText("ci-deploy");
    fireEvent.change(screen.getByLabelText(/Key Name/), { target: { value: "runner" } });
    fireEvent.change(screen.getByLabelText(/Permissions/), { target: { value: "account" } });
    fireEvent.change(screen.getByLabelText(/Expiration/), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Create API Key" }));
    await screen.findByText("test-secret-only");
    expect(createApiKey).toHaveBeenCalledWith("runner", 30);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss new API key" }));
    expect(screen.queryByText("test-secret-only")).toBeNull();
  });
  it("distinguishes expired and revoked keys and confirms revocation", async () => {
    vi.mocked(fetchApiKeys).mockResolvedValue([active, { ...active, id: "old", name: "old-key", expires_at: "2020-01-01T00:00:00Z" }, { ...active, id: "revoked", name: "revoked-key", is_revoked: true }]);
    render(<ApiKeysSettings/>);
    await screen.findByText("Expired");
    expect(screen.getByText("Revoked")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Actions for old-key"));
    expect((screen.getByRole("button", { name: "Revoke old-key" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Actions for ci-deploy"));
    fireEvent.click(screen.getByRole("button", { name: "Revoke ci-deploy" }));
    await waitFor(() => expect(revokeApiKey).toHaveBeenCalledWith("active"));
    expect(confirmAction).toHaveBeenCalled();
  });
  it("does not revoke when confirmation is cancelled", async () => {
    confirmAction.mockResolvedValue(false);
    render(<ApiKeysSettings/>); await screen.findByText("ci-deploy");
    fireEvent.click(screen.getByLabelText("Actions for ci-deploy"));
    fireEvent.click(screen.getByRole("button", { name: "Revoke ci-deploy" }));
    await waitFor(() => expect(confirmAction).toHaveBeenCalled());
    expect(revokeApiKey).not.toHaveBeenCalled();
  });
  it("reports loading errors and retries without showing fabricated usage", async () => {
    vi.mocked(fetchApiKeys).mockRejectedValueOnce(new Error("Offline"));
    render(<ApiKeysSettings/>);
    await screen.findByRole("alert");
    expect(screen.getByText("Not available")).toBeTruthy();
    expect((screen.getByLabelText(/Permissions/) as HTMLSelectElement).required).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("ci-deploy");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

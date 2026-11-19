import { afterEach, describe, expect, it, vi } from "vitest";
import { api, createApiKey, fetchApiKeys } from "../api/client";
afterEach(() => { vi.restoreAllMocks(); });
describe("API key server contract", () => {
  it("reads the api_keys response envelope", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: { api_keys: [{ id: "key-1" }], total: 1 } });
    expect(await fetchApiKeys()).toEqual([{ id: "key-1" }]);
  });
  it("sends expires_at and normalizes the returned secret for existing callers", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { id: "key-1", key: "test-secret" } });
    const before = Date.now();
    expect((await createApiKey("runner", 30)).full_key).toBe("test-secret");
    const payload = post.mock.calls[0][1] as { name: string; expires_at: string };
    expect(payload.name).toBe("runner");
    expect(new Date(payload.expires_at).getTime()).toBeGreaterThanOrEqual(before + 30 * 86400000);
  });
  it("sends null when no expiration is selected", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { key: "test-secret" } });
    await createApiKey("runner");
    expect(post).toHaveBeenCalledWith("/auth/api-keys", { name: "runner", expires_at: null });
  });
});

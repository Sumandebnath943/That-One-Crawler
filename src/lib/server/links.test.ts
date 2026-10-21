import { beforeEach, describe, expect, it, vi } from "vitest";

const safeFetch = vi.fn();
vi.mock("./safe-fetch", () => ({ safeFetch, BlockedUrlError: class extends Error {} }));

const { checkLink } = await import("./links");

const response = (status: number) => ({ status, headers: new Headers(), sizeBytes: 0 });

describe("checkLink", () => {
  beforeEach(() => safeFetch.mockReset());

  it("confirms a HEAD 404 with GET before calling a link broken", async () => {
    safeFetch.mockResolvedValueOnce(response(404)).mockResolvedValueOnce(response(200));
    const result = await checkLink("https://bsky.app/profile/example.com");
    expect(result.state).toBe("ok");
    expect(safeFetch).toHaveBeenCalledTimes(2);
    expect(safeFetch.mock.calls[1][1].method).toBeUndefined();
  });

  it("reports broken when GET agrees", async () => {
    safeFetch.mockResolvedValue(response(404));
    expect((await checkLink("https://example.com/gone")).state).toBe("broken");
  });

  it("trusts a successful HEAD without a second request", async () => {
    safeFetch.mockResolvedValueOnce(response(200));
    expect((await checkLink("https://example.com/")).state).toBe("ok");
    expect(safeFetch).toHaveBeenCalledTimes(1);
  });
});

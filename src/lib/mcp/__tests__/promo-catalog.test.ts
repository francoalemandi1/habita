import { afterEach, describe, expect, it, vi } from "vitest";

const { cacheGetMock, cacheSetMock, cacheSetIfAbsentMock, fetchAllStorePromosMock, afterMock } = vi.hoisted(() => ({
  cacheGetMock: vi.fn(),
  cacheSetMock: vi.fn(),
  cacheSetIfAbsentMock: vi.fn(),
  fetchAllStorePromosMock: vi.fn(),
  afterMock: vi.fn(),
}));

vi.mock("../cache", async () => {
  const actual = await vi.importActual<typeof import("../cache")>("../cache");
  return { ...actual, cacheGet: cacheGetMock, cacheSet: cacheSetMock, cacheSetIfAbsent: cacheSetIfAbsentMock };
});

vi.mock("@/lib/promos/promoarg-client", () => ({ fetchAllStorePromos: fetchAllStorePromosMock }));

vi.mock("next/server", () => ({ after: afterMock }));

import { loadPromoCatalog } from "../promo-catalog";

import type { PromoCatalog } from "../promo-catalog";

const NOW = new Date("2026-11-07T15:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

function catalogFetchedHoursAgo(hours: number): PromoCatalog {
  return { fetchedAt: new Date(NOW.getTime() - hours * HOUR_MS).toISOString(), promos: [] };
}

/** Runs whatever loadPromoCatalog handed to after(), like Next does once the response is sent. */
async function runScheduledAfterWork(): Promise<void> {
  for (const [work] of afterMock.mock.calls) {
    if (typeof work === "function") await work();
  }
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadPromoCatalog", () => {
  it("serves a fresh cached catalog without refreshing", async () => {
    const cached = catalogFetchedHoursAgo(1);
    cacheGetMock.mockResolvedValue(cached);

    await expect(loadPromoCatalog(NOW)).resolves.toEqual(cached);
    expect(afterMock).not.toHaveBeenCalled();
    expect(fetchAllStorePromosMock).not.toHaveBeenCalled();
  });

  it("serves a stale catalog immediately and refreshes it after the response", async () => {
    const stale = catalogFetchedHoursAgo(30);
    cacheGetMock.mockResolvedValue(stale);
    cacheSetIfAbsentMock.mockResolvedValue(true);
    fetchAllStorePromosMock.mockResolvedValue([]);

    await expect(loadPromoCatalog(NOW)).resolves.toEqual(stale);
    expect(fetchAllStorePromosMock).not.toHaveBeenCalled();

    await runScheduledAfterWork();
    expect(fetchAllStorePromosMock).toHaveBeenCalledTimes(1);
    expect(cacheSetMock).toHaveBeenCalledTimes(1);
  });

  it("skips the background refresh when another instance holds the refresh lock", async () => {
    cacheGetMock.mockResolvedValue(catalogFetchedHoursAgo(30));
    cacheSetIfAbsentMock.mockResolvedValue(false);

    await loadPromoCatalog(NOW);
    await runScheduledAfterWork();

    expect(fetchAllStorePromosMock).not.toHaveBeenCalled();
  });

  it("keeps the stale catalog when the background refresh fails", async () => {
    cacheGetMock.mockResolvedValue(catalogFetchedHoursAgo(30));
    cacheSetIfAbsentMock.mockResolvedValue(true);
    fetchAllStorePromosMock.mockRejectedValue(new Error("promoarg.com is down"));

    await loadPromoCatalog(NOW);
    await expect(runScheduledAfterWork()).resolves.toBeUndefined();

    expect(cacheSetMock).not.toHaveBeenCalled();
  });

  it("fetches and stores the catalog when the cache is empty", async () => {
    cacheGetMock.mockResolvedValue(null);
    fetchAllStorePromosMock.mockResolvedValue([]);

    const catalog = await loadPromoCatalog(NOW);

    expect(catalog.promos).toEqual([]);
    expect(cacheSetMock).toHaveBeenCalledWith("mcp:promos:v2", catalog, 14 * 24 * 60 * 60);
  });

  it("refetches when the cached value has the old array shape", async () => {
    cacheGetMock.mockResolvedValue([]);
    fetchAllStorePromosMock.mockResolvedValue([]);

    await loadPromoCatalog(NOW);

    expect(fetchAllStorePromosMock).toHaveBeenCalledTimes(1);
  });
});

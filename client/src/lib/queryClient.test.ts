import { afterEach, describe, expect, it } from "vitest";
import { QueryObserver } from "@tanstack/react-query";
import { invalidateEntityQueries, queryClient } from "./queryClient";

describe("entity collection cache invalidation", () => {
  afterEach(() => queryClient.clear());

  it("refreshes product searches, filters, and by-ID lists after catalog changes", async () => {
    const endpoints = [
      "/api/products",
      "/api/products?limit=150",
      "/api/products?q=filter&limit=150",
      "/api/products?categoryId=equipment&limit=150",
      "/api/products?ids=product-one,product-two",
    ];
    for (const endpoint of endpoints) {
      queryClient.setQueryData([endpoint], [{ listPrice: "100", taxRate: "16" }]);
    }
    queryClient.setQueryData(["/api/products", "additional-key"], []);

    await invalidateEntityQueries("/api/products");

    for (const endpoint of endpoints) {
      expect(queryClient.getQueryState([endpoint])?.isInvalidated).toBe(true);
    }
    expect(queryClient.getQueryState(["/api/products", "additional-key"])?.isInvalidated).toBe(true);
  });

  it("does not invalidate saved quotations or similarly named endpoints", async () => {
    const unrelated = ["/api/quotations", "/api/product-categories", "/api/products-other", "/api/products/product-one"];
    for (const endpoint of unrelated) queryClient.setQueryData([endpoint], []);
    queryClient.setQueryData(["/api/products?limit=150"], []);

    await invalidateEntityQueries("/api/products");

    for (const endpoint of unrelated) {
      expect(queryClient.getQueryState([endpoint])?.isInvalidated).toBe(false);
    }
  });

  it("fetches the updated catalog values for an open filtered product selector", async () => {
    let product = { listPrice: "100", taxRate: "16", maxDiscount: "47" };
    const observer = new QueryObserver(queryClient, {
      queryKey: ["/api/products?q=filter&limit=150"],
      queryFn: async () => [{ ...product }],
    });
    const unsubscribe = observer.subscribe(() => {});
    try {
      await observer.refetch();
      expect(observer.getCurrentResult().data?.[0].listPrice).toBe("100");

      product = { listPrice: "250", taxRate: "8", maxDiscount: "20" };
      await invalidateEntityQueries("/api/products");

      expect(observer.getCurrentResult().data).toEqual([product]);
    } finally {
      unsubscribe();
    }
  });
});
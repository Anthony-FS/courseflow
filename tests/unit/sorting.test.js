import { describe, expect, it } from "vitest";

import { sortItems } from "@/lib/sorting";

describe("sortItems", () => {
  it("sorts text naturally in both directions without mutating the source", () => {
    const items = [{ code: "A10" }, { code: "A2" }, { code: "a1" }];

    expect(sortItems(items, { field: "code" }).map((item) => item.code)).toEqual([
      "a1",
      "A2",
      "A10",
    ]);
    expect(sortItems(items, { field: "code", direction: "desc" }).map((item) => item.code)).toEqual([
      "A10",
      "A2",
      "a1",
    ]);
    expect(items.map((item) => item.code)).toEqual(["A10", "A2", "a1"]);
  });

  it("sorts numeric values and keeps empty values at the end", () => {
    const items = [{ price: 20 }, { price: null }, { price: 3 }, { price: 10 }];

    expect(sortItems(items, { field: "price", type: "number" }).map((item) => item.price)).toEqual([
      3,
      10,
      20,
      null,
    ]);
    expect(sortItems(items, { field: "price", type: "number", direction: "desc" }).map((item) => item.price)).toEqual([
      20,
      10,
      3,
      null,
    ]);
  });

  it("sorts dates and preserves original order for equal values", () => {
    const items = [
      { id: "first", createdAt: "2026-01-01" },
      { id: "second", createdAt: "2026-01-01" },
      { id: "third", createdAt: "2025-12-31" },
    ];

    expect(sortItems(items, { field: "createdAt", type: "date" }).map((item) => item.id)).toEqual([
      "third",
      "first",
      "second",
    ]);
  });
});

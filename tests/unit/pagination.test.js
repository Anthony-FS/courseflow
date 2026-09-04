import { describe, expect, it } from "vitest";

import {
  ITEMS_PER_PAGE,
  getTotalPages,
  paginateItems,
} from "@/lib/pagination";

const items = Array.from({ length: 11 }, (_, index) => index + 1);

describe("getTotalPages", () => {
  it("uses 10 items per page by default", () => {
    expect(ITEMS_PER_PAGE).toBe(10);
    expect(getTotalPages(10)).toBe(1);
    expect(getTotalPages(11)).toBe(2);
  });

  it("returns 1 page when there are no items", () => {
    expect(getTotalPages(0)).toBe(1);
  });

  it("respects a custom page size", () => {
    expect(getTotalPages(10, 5)).toBe(2);
    expect(getTotalPages(9, 5)).toBe(2);
  });
});

describe("paginateItems", () => {
  it("returns the first page of 10 items", () => {
    expect(paginateItems(items, 1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("returns only the remaining item on page 2 of 11 items", () => {
    expect(paginateItems(items, 2)).toEqual([11]);
  });

  it("respects a custom page size", () => {
    expect(paginateItems(items, 2, 5)).toEqual([6, 7, 8, 9, 10]);
  });
});

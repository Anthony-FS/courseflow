const SORT_DIRECTIONS = new Set(["asc", "desc"]);

function isEmpty(value) {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function toComparable(value, type) {
  if (isEmpty(value)) return null;

  if (type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  if (type === "date") {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  return String(value).trim();
}

function compareValues(left, right, type) {
  const leftValue = toComparable(left, type);
  const rightValue = toComparable(right, type);

  // Keep missing values at the end in either direction.
  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;

  if (type === "text") {
    return leftValue.localeCompare(rightValue, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

/**
 * Return a sorted copy of items without mutating the source array.
 * @param {Array} items
 * @param {{ field?: string, direction?: "asc" | "desc", type?: "text" | "number" | "date", getValue?: (item: unknown) => unknown }} config
 */
export function sortItems(
  items,
  { field, direction = "asc", type = "text", getValue } = {},
) {
  if (!Array.isArray(items) || items.length < 2) return items ?? [];

  const resolvedDirection = SORT_DIRECTIONS.has(direction) ? direction : "asc";
  const valueFor = getValue ?? ((item) => item?.[field]);
  const multiplier = resolvedDirection === "desc" ? -1 : 1;

  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftComparable = toComparable(valueFor(left.item), type);
      const rightComparable = toComparable(valueFor(right.item), type);

      // Keep missing values at the end even when sorting descending.
      if (leftComparable === null && rightComparable !== null) return 1;
      if (leftComparable !== null && rightComparable === null) return -1;

      const result = compareValues(
        valueFor(left.item),
        valueFor(right.item),
        type,
      );
      return result === 0 ? left.index - right.index : result * multiplier;
    })
    .map(({ item }) => item);
}

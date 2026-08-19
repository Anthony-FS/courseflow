export const ITEMS_PER_PAGE = 10;

export function getTotalPages(totalItems, pageSize = ITEMS_PER_PAGE) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function paginateItems(items, currentPage, pageSize = ITEMS_PER_PAGE) {
  const startIndex = (currentPage - 1) * pageSize;

  return items.slice(startIndex, startIndex + pageSize);
}

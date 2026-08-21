/**
 * Minimal Supabase mock that records inserts/updates for integration assertions.
 */
export function createMockSupabase({
  courseId = "course-test-id",
  lessonsSelect = null,
  courseSelect = null,
  promoSelect = null,
  materialsSelect = null,
  insertErrors = {},
  updateErrors = {},
} = {}) {
  const inserts = [];
  const updates = [];
  const deletes = [];
  const uploads = [];

  function selectRows(table) {
    if (table === "courses" && courseSelect) {
      return Array.isArray(courseSelect) ? courseSelect : [courseSelect];
    }
    if (table === "promo_codes" && promoSelect) {
      return Array.isArray(promoSelect) ? promoSelect : [promoSelect];
    }
    if (table === "materials") {
      return materialsSelect ?? [];
    }
    if (table === "lessons") {
      return lessonsSelect ?? [];
    }
    return [];
  }

  function matchesFilter(row, filter) {
    // Fixtures often omit join/filter columns; only enforce when present.
    if (!Object.prototype.hasOwnProperty.call(row ?? {}, filter.column)) {
      return true;
    }

    const value = row[filter.column];
    if (filter.op === "eq") return value === filter.value;
    if (filter.op === "neq") return value !== filter.value;
    if (filter.op === "ilike") {
      return (
        String(value ?? "").toLowerCase() ===
        String(filter.value ?? "").toLowerCase()
      );
    }
    if (filter.op === "is") {
      return filter.value === null ? value == null : value === filter.value;
    }
    return true;
  }

  function applyFilters(rows, filters) {
    return rows.filter((row) =>
      filters.every((filter) => matchesFilter(row, filter)),
    );
  }

  function from(table) {
    function selectChain() {
      const filters = [];
      const chain = {
        eq(column, value) {
          filters.push({ op: "eq", column, value });
          return chain;
        },
        neq(column, value) {
          filters.push({ op: "neq", column, value });
          return chain;
        },
        ilike(column, value) {
          filters.push({ op: "ilike", column, value });
          return chain;
        },
        is(column, value) {
          filters.push({ op: "is", column, value });
          return chain;
        },
        limit() {
          return chain;
        },
        order() {
          return Promise.resolve({
            data: applyFilters(selectRows(table), filters),
            error: null,
          });
        },
        maybeSingle: async () => ({
          data: applyFilters(selectRows(table), filters)[0] ?? null,
          error: null,
        }),
        single: async () => ({
          data:
            applyFilters(selectRows(table), filters)[0] ?? { id: courseId },
          error: null,
        }),
        then(onFulfilled, onRejected) {
          return Promise.resolve({
            data: applyFilters(selectRows(table), filters),
            error: null,
          }).then(onFulfilled, onRejected);
        },
      };
      return chain;
    }

    function updateChain(entry) {
      const chain = {
        eq(column, value) {
          entry.filters.push({ column, value });
          return chain;
        },
        select() {
          return {
            single: async () => ({
              data: { id: courseId },
              error: updateErrors[table] ?? null,
            }),
          };
        },
        then(onFulfilled, onRejected) {
          const error = updateErrors[table] ?? null;
          return Promise.resolve({ data: null, error }).then(
            onFulfilled,
            onRejected,
          );
        },
      };
      return chain;
    }

    function deleteChain(entry) {
      const chain = {
        eq(column, value) {
          entry.filters.push({ column, value });
          return chain;
        },
        then(onFulfilled, onRejected) {
          return Promise.resolve({ error: null }).then(onFulfilled, onRejected);
        },
      };
      return chain;
    }

    return {
      insert(payload) {
        const rows = Array.isArray(payload) ? payload : [payload];
        inserts.push({ table, rows });

        const error = insertErrors[table] ?? null;
        const result = {
          data: error ? null : table === "courses" ? { id: courseId } : rows,
          error,
        };

        const chain = {
          select() {
            return {
              single: async () => ({
                data: error ? null : { id: courseId },
                error,
              }),
            };
          },
          then(onFulfilled, onRejected) {
            return Promise.resolve(result).then(onFulfilled, onRejected);
          },
        };

        return chain;
      },
      select() {
        return selectChain();
      },
      update(payload) {
        const entry = { table, payload, filters: [] };
        updates.push(entry);
        return updateChain(entry);
      },
      delete() {
        const entry = { table, filters: [] };
        deletes.push(entry);
        return deleteChain(entry);
      },
    };
  }

  return {
    inserts,
    updates,
    deletes,
    uploads,
    from,
    storage: {
      from(bucket) {
        return {
          async upload(path, file, options) {
            uploads.push({ bucket, path, file, options });
            return { error: null };
          },
        };
      },
    },
  };
}

export function insertsFor(mock, table) {
  return mock.inserts.filter((entry) => entry.table === table);
}

export function updatesFor(mock, table) {
  return mock.updates.filter((entry) => entry.table === table);
}

export function deletesFor(mock, table) {
  return mock.deletes.filter((entry) => entry.table === table);
}

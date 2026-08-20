/**
 * Minimal Supabase mock that records inserts/updates for integration assertions.
 */
export function createMockSupabase({
  courseId = "course-test-id",
  lessonsSelect = null,
  courseSelect = null,
  promoSelect = null,
  materialsSelect = null,
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

  function from(table) {
    const selectChain = {
      eq() {
        return selectChain;
      },
      is() {
        return selectChain;
      },
      limit() {
        return selectChain;
      },
      order() {
        return Promise.resolve({ data: selectRows(table), error: null });
      },
      maybeSingle: async () => ({
        data: selectRows(table)[0] ?? null,
        error: null,
      }),
      single: async () => ({
        data: selectRows(table)[0] ?? { id: courseId },
        error: null,
      }),
      then(onFulfilled, onRejected) {
        return Promise.resolve({
          data: selectRows(table),
          error: null,
        }).then(onFulfilled, onRejected);
      },
    };

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
              error: null,
            }),
          };
        },
        then(onFulfilled, onRejected) {
          return Promise.resolve({ data: null, error: null }).then(
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

        const result = {
          data: table === "courses" ? { id: courseId } : rows,
          error: null,
        };

        const chain = {
          select() {
            return {
              single: async () => ({
                data: { id: courseId },
                error: null,
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
        return selectChain;
      },
      update(payload) {
        const entry = { table, payload, filters: [] };
        updates.push(entry);
        return updateChain(entry);
      },
      update() {
        return {
          eq: async () => ({ error: null }),
        };
      },
      update() {
        return {
          eq: async () => ({ error: null }),
        };
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

/**
 * Minimal Supabase mock that records inserts for integration assertions.
 */
export function createMockSupabase({
  courseId = "course-test-id",
  lessonsSelect = null,
} = {}) {
  const inserts = [];
  const uploads = [];

  function from(table) {
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
        const result = {
          data: table === "lessons" ? (lessonsSelect ?? []) : [],
          error: null,
        };

        const chain = {
          eq() {
            return chain;
          },
          order() {
            return Promise.resolve(result);
          },
          then(onFulfilled, onRejected) {
            return Promise.resolve(result).then(onFulfilled, onRejected);
          },
        };

        return chain;
      },
      delete() {
        return {
          eq: async () => ({ error: null }),
        };
      },
    };
  }

  return {
    inserts,
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

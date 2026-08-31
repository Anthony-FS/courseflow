/**
 * Minimal Supabase mock that records inserts/updates for integration assertions.
 */
export function createMockSupabase({
  courseId = "course-test-id",
  lessonsSelect = null,
  assignmentsSelect = null,
  enrollmentsSelect = null,
  submissionsSelect = null,
  courseSelect = null,
  promoSelect = null,
  materialsSelect = null,
  wishlistsSelect = null,
  progressSelect = null,
  subLessonsSelect = null,
  insertErrors = {},
  updateErrors = {},
} = {}) {
  const inserts = [];
  const updates = [];
  const deletes = [];
  const uploads = [];
  const storageRemoves = [];

  function selectRows(table) {
    let rows = [];
    if (table === "wishlists" && wishlistsSelect) {
      rows = Array.isArray(wishlistsSelect) ? wishlistsSelect : [wishlistsSelect];
    } else if (table === "courses" && courseSelect) {
      rows = Array.isArray(courseSelect) ? courseSelect : [courseSelect];
    } else if (table === "promo_codes" && promoSelect) {
      rows = Array.isArray(promoSelect) ? promoSelect : [promoSelect];
    } else if (table === "materials") {
      rows = materialsSelect ?? [];
      rows = Array.isArray(rows) ? rows : [rows];
    } else if (table === "lessons") {
      rows = lessonsSelect ?? [];
      rows = Array.isArray(rows) ? rows : [rows];
    } else if (table === "assignments" && assignmentsSelect !== null) {
      rows = Array.isArray(assignmentsSelect)
        ? assignmentsSelect
        : [assignmentsSelect];
    } else if (table === "submissions" && submissionsSelect !== null) {
      rows = Array.isArray(submissionsSelect)
        ? submissionsSelect
        : [submissionsSelect];
    } else if (table === "enrollments" && enrollmentsSelect !== null) {
      rows = Array.isArray(enrollmentsSelect)
        ? enrollmentsSelect
        : [enrollmentsSelect];
    } else if (table === "sub_lesson_progress" && progressSelect !== null) {
      rows = Array.isArray(progressSelect) ? progressSelect : [progressSelect];
    } else if (table === "sub_lessons" && subLessonsSelect !== null) {
      rows = Array.isArray(subLessonsSelect)
        ? subLessonsSelect
        : [subLessonsSelect];
    }

    if (table === "materials") {
      const subLessonDeletes = deletes.filter((d) => d.table === "sub_lessons");
      const rawSubLessons = Array.isArray(subLessonsSelect)
        ? subLessonsSelect
        : subLessonsSelect
          ? [subLessonsSelect]
          : [];
      const deletedSubIds = new Set();
      for (const del of subLessonDeletes) {
        for (const sub of rawSubLessons) {
          if (
            del.filters.length > 0 &&
            del.filters.every((f) =>
              matchesFilter(sub, { op: "eq", column: f.column, value: f.value }),
            )
          ) {
            if (sub.id) deletedSubIds.add(sub.id);
          }
        }
      }
      rows = rows.filter((r) => !deletedSubIds.has(r.sub_lesson_id));
    }

    const tableDeletes = deletes.filter((d) => d.table === table);
    if (tableDeletes.length === 0) return rows;

    return rows.filter((row) => {
      for (const del of tableDeletes) {
        if (
          del.filters.length > 0 &&
          del.filters.every((f) =>
            matchesFilter(row, { op: "eq", column: f.column, value: f.value }),
          )
        ) {
          return false;
        }
      }
      return true;
    });
  }

  function matchesFilter(row, filter) {
    // Fixtures often omit join/filter columns (e.g. course_id, lesson_id, sub_lesson_id)
    if (!Object.prototype.hasOwnProperty.call(row ?? {}, filter.column)) {
      if (
        ["course_id", "lesson_id", "sub_lesson_id", "user_id"].includes(
          filter.column,
        )
      ) {
        if (filter.op === "neq" || filter.op === "not") {
          return false;
        }
        return true;
      }
      return false;
    }

    const value = row[filter.column];
    if (filter.op === "eq") return value === filter.value;
    if (filter.op === "neq") return value !== filter.value;
    if (filter.op === "ilike") {
      const pattern = String(filter.value ?? "").toLowerCase();
      const haystack = String(value ?? "").toLowerCase();
      if (pattern.startsWith("%") && pattern.endsWith("%") && pattern.length >= 2) {
        return haystack.includes(pattern.slice(1, -1));
      }
      return haystack === pattern;
    }
    if (filter.op === "is") {
      return filter.value === null ? value == null : value === filter.value;
    }
    if (filter.op === "in") {
      return Array.isArray(filter.value) && filter.value.includes(value);
    }
    if (filter.op === "not") {
      if (filter.subOp === "in") {
        const raw = String(filter.value ?? "").replace(/^\(|\)$/g, "");
        const excluded = raw.split(",").map((s) => s.trim());
        return !excluded.includes(String(value ?? ""));
      }
      return value !== filter.value;
    }
    return true;
  }

  function applyFilters(rows, filters) {
    return rows.filter((row) =>
      filters.every((filter) => matchesFilter(row, filter)),
    );
  }

  function from(table) {
    function selectChain(options = {}) {
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
        not(column, subOp, value) {
          filters.push({ op: "not", column, subOp, value });
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
        in(column, value) {
          filters.push({ op: "in", column, value });
          return chain;
        },
        limit() {
          return chain;
        },
        order() {
          return chain;
        },
        maybeSingle: async () => ({
          data: applyFilters(selectRows(table), filters)[0] ?? null,
          error: null,
        }),
        single: async () => {
          const row = applyFilters(selectRows(table), filters)[0];

          return {
            data:
              row ??
              (table === "assignments" && assignmentsSelect !== null
                ? null
                : { id: courseId }),
            error: null,
          };
        },
        then(onFulfilled, onRejected) {
          const filtered = applyFilters(selectRows(table), filters);
          return Promise.resolve({
            data: options?.head ? null : filtered,
            error: null,
            count: filtered.length,
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
        in(column, value) {
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
                data: error
                  ? null
                  : rows[0]?.id
                    ? rows[0]
                    : { id: courseId, ...rows[0] },
                error,
              }),
              then(onFulfilled, onRejected) {
                return Promise.resolve({
                  data: error
                    ? null
                    : rows.map((r, i) => ({
                        id: r.id || `mock-id-${i}`,
                        ...r,
                      })),
                  error,
                }).then(onFulfilled, onRejected);
              },
            };
          },
          then(onFulfilled, onRejected) {
            return Promise.resolve(result).then(onFulfilled, onRejected);
          },
        };

        return chain;
      },
      select(_columns, options = {}) {
        return selectChain(options);
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
    storageRemoves,
    from,
    storage: {
      from(bucket) {
        return {
          async upload(path, file, options) {
            uploads.push({ bucket, path, file, options });
            return { error: null };
          },
          async remove(paths) {
            storageRemoves.push({ bucket, paths });
            return { data: paths, error: null };
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

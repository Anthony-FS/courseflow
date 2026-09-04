"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { PromoCodeTable } from "@/components/admin/promo-code-table";
import { CourseStatusFilter } from "@/components/admin/course-status-filter";
import { AdminPagination } from "@/components/admin/pagination";
import { SortFilterBar } from "@/components/admin/sort-filter-bar";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { filterPromoCodesByStatus, getPromoCodes, searchPromoCodes, updatePromoCodeStatus } from "@/lib/promo-codes";
import { getTotalPages, paginateItems } from "@/lib/pagination";
import { sortItems } from "@/lib/sorting";

const PROMO_SORT_OPTIONS = [
  {
    value: "code",
    label: "Promo code",
    ascendingLabel: "A-Z",
    descendingLabel: "Z-A",
  },
  {
    value: "minPurchase",
    label: "Minimum purchase",
    ascendingLabel: "Low to high",
    descendingLabel: "High to low",
  },
  {
    value: "discountValue",
    label: "Discount value",
    ascendingLabel: "Low to high",
    descendingLabel: "High to low",
  },
  {
    value: "createdAt",
    label: "Created date",
    ascendingLabel: "Oldest first",
    descendingLabel: "Newest first",
  },
  {
    value: "updatedAt",
    label: "Updated date",
    ascendingLabel: "Oldest first",
    descendingLabel: "Newest first",
  },
];

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("code");
  const [sortDirection, setSortDirection] = useState("asc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusToggle, setStatusToggle] = useState(null);
  const [isToggling, setIsToggling] = useState(false);
  const [togglingPromoId, setTogglingPromoId] = useState("");

  useEffect(() => {
    let cancelled = false;

    getPromoCodes()
      .then((data) => {
        if (!cancelled) {
          setPromoCodes(data);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(error.message ?? "Failed to load promo codes.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statusFilteredPromoCodes = useMemo(
    () => filterPromoCodesByStatus(promoCodes, statusFilter),
    [promoCodes, statusFilter],
  );

  const filteredPromoCodes = useMemo(
    () => searchPromoCodes(statusFilteredPromoCodes, query),
    [statusFilteredPromoCodes, query],
  );

  const sortedPromoCodes = useMemo(() => {
    const sortConfig = {
      code: { type: "text", getValue: (promo) => promo.code },
      minPurchase: { type: "number", getValue: (promo) => promo.min_purchase_amount },
      discountValue: { type: "number", getValue: (promo) => promo.discount_value },
      createdAt: { type: "date", getValue: (promo) => promo.starts_at },
      updatedAt: { type: "date", getValue: (promo) => promo.updated_at },
    }[sortBy] ?? { type: "text", getValue: (promo) => promo.code };

    return sortItems(filteredPromoCodes, {
      ...sortConfig,
      direction: sortDirection,
    });
  }, [filteredPromoCodes, sortBy, sortDirection]);

  const totalPages = getTotalPages(sortedPromoCodes.length);

  const paginatedPromoCodes = useMemo(
    () => paginateItems(sortedPromoCodes, currentPage),
    [sortedPromoCodes, currentPage],
  );

  useEffect(() => {
    const maxPage = getTotalPages(sortedPromoCodes.length);
    setCurrentPage((page) => Math.min(page, Math.max(1, maxPage)));
  }, [sortedPromoCodes.length]);

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setCurrentPage(1);
  }

  function handleSortChange({ sortBy: nextSortBy, sortDirection: nextDirection }) {
    setSortBy(nextSortBy);
    setSortDirection(nextDirection);
    setCurrentPage(1);
  }

  function handleStatusFilterChange(nextStatus) {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
  }

  function handleToggleStatus(promo) {
    const nextActive = promo.is_active === false;
    setStatusToggle({ promo, nextActive });
  }

  async function handleConfirmStatusToggle() {
    if (!statusToggle || isToggling) {
      return;
    }

    const { promo, nextActive } = statusToggle;
    setIsToggling(true);
    setTogglingPromoId(promo.id);

    try {
      await updatePromoCodeStatus(promo.id, nextActive);
      setPromoCodes((current) =>
        current.map((row) =>
          row.id === promo.id ? { ...row, is_active: nextActive } : row,
        ),
      );
      setStatusToggle(null);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message ?? "Failed to update promo code status.");
    } finally {
      setIsToggling(false);
      setTogglingPromoId("");
    }
  }

  const activating = statusToggle?.nextActive === true;

  return (
    <main className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 bg-white px-10 py-4">
        <h1 className="text-headline3">Promo code</h1>
        <div className="flex flex-wrap items-center gap-4">
          <label className="relative block">
            <span className="sr-only">Search promo codes</span>
            <input
              data-slot="input"
              type="search"
              value={query}
              onChange={handleSearchChange}
              placeholder="Search..."
              className="h-12 min-h-12 w-80 rounded-lg border border-gray-400 bg-white px-4 pr-11 text-body2"
            />
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-gray-600" />
          </label>
          <CourseStatusFilter
            value={statusFilter}
            onChange={handleStatusFilterChange}
            ariaLabel="Filter promo codes by status"
          />
          <SortFilterBar
            options={PROMO_SORT_OPTIONS}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
          <Button asChild className="min-h-12 gap-2 px-6 py-3">
            <Link href="/admin/promo-codes/add-code">
            <Plus aria-hidden="true" className="size-5" />
            Add Promo code
            </Link>
          </Button>
        </div>
      </header>

      <section className="p-10">
        {errorMessage ? <p className="mb-4 text-body2 text-orange-500" role="alert">{errorMessage}</p> : null}
        <div className="overflow-hidden rounded-lg bg-white shadow-card">
          <PromoCodeTable
            promoCodes={paginatedPromoCodes}
            isLoading={status === "loading"}
            onToggleStatus={handleToggleStatus}
            togglingPromoId={togglingPromoId}
          />
        </div>

        {status === "ready" && sortedPromoCodes.length > 0 ? (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            label="Promo code pagination"
          />
        ) : null}
      </section>
      <ConfirmationDialog
        open={Boolean(statusToggle)}
        isConfirming={isToggling}
        confirmFirst={!activating}
        onOpenChange={(open) => {
          if (!open && !isToggling) {
            setStatusToggle(null);
          }
        }}
        onConfirm={handleConfirmStatusToggle}
        title="Confirmation"
        message={
          activating
            ? `Activate promo code "${statusToggle?.promo?.code}"? Customers will be able to use it again.`
            : `Deactivate promo code "${statusToggle?.promo?.code}"? Customers will no longer be able to use it.`
        }
        confirmText={activating ? "Yes, activate" : "Yes, deactivate"}
        confirmVariant={activating ? "default" : "danger"}
        cancelText="Cancel"
        confirmingText="Updating..."
      />
    </main>
  );
}

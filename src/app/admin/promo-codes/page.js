"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { PromoCodeTable } from "@/components/admin/promo-code-table";
import { DeletePromoCodeDialog } from "@/components/admin/delete-promo-code-dialog";
import { AdminPagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { getPromoCodes, searchPromoCodes } from "@/lib/promo-codes";
import { getTotalPages, paginateItems } from "@/lib/pagination";

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [promoToDelete, setPromoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const visiblePromoCodes = useMemo(
    () => searchPromoCodes(promoCodes, query),
    [promoCodes, query],
  );

  const totalPages = getTotalPages(visiblePromoCodes.length);

  const paginatedPromoCodes = useMemo(
    () => paginateItems(visiblePromoCodes, currentPage),
    [visiblePromoCodes, currentPage],
  );

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setCurrentPage(1);
  }

  async function handleDelete() {
    if (!promoToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/promo-codes/${promoToDelete.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete promo code.");

      const remaining = promoCodes.filter((promo) => promo.id !== promoToDelete.id);

      setPromoCodes(remaining);
      setCurrentPage((page) =>
        Math.min(page, getTotalPages(searchPromoCodes(remaining, query).length)),
      );
      setPromoToDelete(null);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsDeleting(false);
    }
  }

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
          <PromoCodeTable promoCodes={paginatedPromoCodes} isLoading={status === "loading"} onDelete={setPromoToDelete} />
        </div>

        {status === "ready" && visiblePromoCodes.length > 0 ? (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            label="Promo code pagination"
          />
        ) : null}
      </section>
      <DeletePromoCodeDialog open={Boolean(promoToDelete)} code={promoToDelete?.code} isDeleting={isDeleting} onOpenChange={(open) => !open && !isDeleting && setPromoToDelete(null)} onConfirm={handleDelete} />
    </main>
  );
}

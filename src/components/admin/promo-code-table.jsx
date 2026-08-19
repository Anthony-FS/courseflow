import { SquarePen, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

function formatAmount(value) {
  return new Intl.NumberFormat("en-US").format(Number(value ?? 0));
}

function formatCreatedDate(promo) {
  if (!promo.starts_at) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(promo.starts_at));
}

export function PromoCodeTable({ promoCodes, isLoading = false, onDelete }) {
  const emptyMessage = isLoading ? "Loading promo codes..." : "No promo codes found.";

  return (
    <section className="overflow-x-auto bg-white">
      <table className="w-full min-w-[1000px] border-collapse text-left">
        <thead className="bg-gray-300/70 text-body3 text-gray-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Promo code</th>
            <th scope="col" className="px-4 py-3 font-medium">Minimum purchase (THB)</th>
            <th scope="col" className="px-4 py-3 font-medium">Discount type</th>
            <th scope="col" className="px-4 py-3 font-medium">Courses included</th>
            <th scope="col" className="px-4 py-3 font-medium">Created date</th>
            <th scope="col" className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="text-body2 text-gray-900">
          {promoCodes.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-gray-600">{emptyMessage}</td>
            </tr>
          ) : (
            promoCodes.map((promo) => (
              <tr key={promo.id} className="h-[88px] border-t border-gray-200">
                <td className="px-4 py-4">{promo.code}</td>
                <td className="px-4 py-4">{formatAmount(promo.min_purchase_amount)}</td>
                <td className="px-4 py-4">
                  {promo.discount_type === "percent" ? "Percent" : "Fixed amount"}
                </td>
                <td className="max-w-[200px] truncate px-4 py-4" title={promo.courses?.title ?? "All"}>
                  {promo.courses?.title ?? "All"}
                </td>
                <td className="whitespace-nowrap px-4 py-4">{formatCreatedDate(promo)}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3 text-blue-300">
                    <Button type="button" variant="ghost" size="icon-sm" className="cursor-pointer" aria-label={`Delete ${promo.code}`} onClick={() => onDelete?.(promo)}>
                      <Trash2 aria-hidden="true" className="size-5" />
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={`/admin/promo-codes/${promo.id}/edit`} aria-label={`Edit ${promo.code}`}>
                      <SquarePen aria-hidden="true" className="size-5" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

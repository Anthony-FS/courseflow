"use client";

import Link from "next/link";
import { Loader2, Power, PowerOff, SquarePen } from "lucide-react";

import { formatCourseDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatAmount(value) {
  return new Intl.NumberFormat("en-US").format(Number(value ?? 0));
}

function PromoStatusBadge({ isActive }) {
  return (
    <span
      className={cn(
        "ds-status",
        isActive ? "bg-status-submitted text-green" : "bg-gray-100 text-gray-700",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          isActive ? "bg-green" : "bg-gray-600",
        )}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function ActionIconButton({
  label,
  disabled = false,
  className,
  onClick,
  children,
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          onClick={onClick}
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function PromoCodeTable({
  promoCodes,
  isLoading = false,
  onToggleStatus,
  togglingPromoId = "",
}) {
  const emptyMessage = isLoading
    ? "Loading promo codes..."
    : "No promo codes found.";

  return (
    <TooltipProvider>
      <section className="overflow-x-auto bg-white">
        <table className="w-full min-w-250 border-collapse text-left">
          <thead className="bg-gray-300/70 text-body3 text-gray-700">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Promo code
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Minimum purchase (THB)
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Discount type
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Courses included
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Created date
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Updated date
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="text-body2 text-gray-900">
            {promoCodes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-600">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              promoCodes.map((promo) => {
                const isActive = promo.is_active !== false;
                const isToggling = togglingPromoId === promo.id;
                const toggleLabel = isActive
                  ? `Deactivate ${promo.code}`
                  : `Activate ${promo.code}`;

                return (
                  <tr key={promo.id} className="h-22 border-t border-gray-200">
                    <td className="px-4 py-4">{promo.code}</td>
                    <td className="px-4 py-4">
                      {formatAmount(promo.min_purchase_amount)}
                    </td>
                    <td className="px-4 py-4">
                      {promo.discount_type === "percent"
                        ? "Percent"
                        : "Fixed amount"}
                    </td>
                    <td
                      className="max-w-60 truncate px-4 py-4"
                      title={
                        promo.appliesToAllCourses
                          ? "All"
                          : promo.courseCodes?.join(", ") || "All"
                      }
                    >
                      {promo.appliesToAllCourses
                        ? "All"
                        : promo.courseCodes?.join(", ") || "All"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {formatCourseDate(promo.starts_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {formatCourseDate(promo.updated_at ?? promo.starts_at)}
                    </td>
                    <td className="px-4 py-4">
                      <PromoStatusBadge isActive={isActive} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/admin/promo-codes/${promo.id}/edit`}
                              aria-label={`Edit ${promo.code}`}
                              className="inline-flex size-10 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-100"
                            >
                              <SquarePen aria-hidden="true" className="size-5" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Edit promo code</TooltipContent>
                        </Tooltip>

                        <ActionIconButton
                          label={toggleLabel}
                          disabled={isToggling}
                          onClick={() => onToggleStatus?.(promo)}
                          className={
                            isActive
                              ? "text-red-500 hover:bg-red-100"
                              : "text-green hover:bg-status-submitted"
                          }
                        >
                          {isToggling ? (
                            <Loader2
                              aria-hidden="true"
                              className="size-5 animate-spin"
                            />
                          ) : isActive ? (
                            <PowerOff aria-hidden="true" className="size-5" />
                          ) : (
                            <Power aria-hidden="true" className="size-5" />
                          )}
                        </ActionIconButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </TooltipProvider>
  );
}

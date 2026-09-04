"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { StartLearningButton } from "@/components/course-detail/subscribed-actions";
import { SubscribeButton } from "@/components/course-detail/subscribe-button";
import { WishlistButton } from "@/components/course-detail/wishlist-button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

function PurchaseActions({
  compact = false,
  courseCode,
  courseId,
  courseTitle,
  initiallySaved,
  isSubscribed,
  isPurchasable = true,
  loginHref,
  requiresLogin = false,
}) {
  const buttonClassName = compact
    ? "min-h-12 rounded-full px-3 py-3 text-body3 whitespace-normal"
    : undefined;

  if (isSubscribed) {
    return (
      <div className={cn("grid gap-4", compact && "grid-cols-1 gap-3")}>
        <StartLearningButton
          courseCode={courseCode}
          className={buttonClassName}
        />
      </div>
    );
  }

  if (!isPurchasable) {
    return (
      <p
        className={cn(
          "rounded-lg bg-gray-100 px-4 py-3 text-body3 text-gray-700",
          compact && "text-center",
        )}
        role="status"
      >
        This course is not available for purchase right now.
      </p>
    );
  }

  return (
    <div className={cn("grid gap-4", compact && "grid-cols-2 gap-3")}>
      <WishlistButton
        courseId={courseId}
        initiallySaved={initiallySaved}
        className={buttonClassName}
        loginHref={loginHref}
        requiresLogin={requiresLogin}
      />
      <SubscribeButton
        courseId={courseId}
        courseTitle={courseTitle}
        className={buttonClassName}
        label={compact ? "Subscribe" : undefined}
        loginHref={loginHref}
        requiresLogin={requiresLogin}
      />
    </div>
  );
}

function CoursePurchaseSidebar({
  courseCode,
  courseId,
  initiallySaved,
  isSubscribed,
  isPurchasable = true,
  loginHref,
  price,
  requiresLogin = false,
  summary,
  title,
}) {
  return (
    <aside className="hidden rounded-lg bg-white p-6 shadow-card lg:block">
      <p className="text-body3 font-medium text-orange-500">Course</p>
      <h1 className="mt-2 text-headline2 font-medium tracking-[-0.02em] text-black">
        {title}
      </h1>
      {summary ? (
        <p className="mt-3 text-body2 leading-normal text-gray-700">{summary}</p>
      ) : null}
      <p className="mt-6 text-headline3 font-medium text-gray-900">
        THB {formatPrice(price)}
      </p>
      <div className="mt-6 h-px bg-gray-300" />
      <div className="mt-6">
        <PurchaseActions
          courseCode={courseCode}
          courseId={courseId}
          courseTitle={title}
          initiallySaved={initiallySaved}
          isSubscribed={isSubscribed}
          isPurchasable={isPurchasable}
          loginHref={loginHref}
          requiresLogin={requiresLogin}
        />
      </div>
    </aside>
  );
}

function CoursePurchaseMobileBar({
  courseCode,
  courseId,
  initiallySaved,
  isSubscribed,
  isPurchasable = true,
  loginHref,
  price,
  requiresLogin = false,
  summary,
  title,
}) {
  const summaryId = useId();
  const [expanded, setExpanded] = useState(false);
  const canExpand = Boolean(summary);

  return (
    <div
      data-course-purchase-bar
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-300 bg-white px-4 pt-4 shadow-[0_-4px_16px_rgb(0_0_0/8%)] pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {canExpand ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={summaryId}
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <h1 className="text-headline3 font-medium tracking-[-0.02em] text-black">
            {title}
          </h1>
          <ChevronDown
            className={cn(
              "mt-0.5 size-5 shrink-0 text-gray-500 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      ) : (
        <h1 className="text-headline3 font-medium tracking-[-0.02em] text-black">
          {title}
        </h1>
      )}

      {canExpand ? (
        <div
          id={summaryId}
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <p className="mt-2 text-body2 leading-normal text-gray-700">
              {summary}
            </p>
          </div>
        </div>
      ) : null}

      <p className="mt-1 text-body2 font-medium text-gray-700">
        THB {formatPrice(price)}
      </p>

      <div className="mt-4">
        <PurchaseActions
          compact
          courseCode={courseCode}
          courseId={courseId}
          courseTitle={title}
          initiallySaved={initiallySaved}
          isSubscribed={isSubscribed}
          isPurchasable={isPurchasable}
          loginHref={loginHref}
          requiresLogin={requiresLogin}
        />
      </div>
    </div>
  );
}

export { CoursePurchaseMobileBar, CoursePurchaseSidebar };

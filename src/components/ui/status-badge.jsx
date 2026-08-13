import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva("ds-status", {
  variants: {
    status: {
      submitted: "ds-status--submitted",
      overdue: "ds-status--overdue",
      pending: "ds-status--pending",
      "in-progress": "ds-status--in-progress",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

const STATUS_LABELS = {
  submitted: "Submitted",
  overdue: "Overdue",
  pending: "Pending",
  "in-progress": "In progress",
};

function StatusBadge({
  className,
  status = "pending",
  children,
  ...props
}) {
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {children ?? STATUS_LABELS[status]}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants, STATUS_LABELS };

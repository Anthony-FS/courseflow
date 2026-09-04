"use client";

import { Toaster as Sonner } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

function Toaster({ ...props }) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)",
        "--error-bg": "var(--status-overdue-bg)",
        "--error-text": "var(--status-overdue-fg)",
        "--error-border": "var(--status-overdue-bg)",
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          error:
            "!bg-status-overdue !text-status-overdue-foreground !border-status-overdue",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";

function SubscribeButton({
  courseId,
  courseTitle,
  className,
  label = "Subscribe To This Course",
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    router.push(`/payment?courseId=${encodeURIComponent(courseId)}`);
  }

  return (
    <>
      <Button
        type="button"
        className={cn("w-full", className)}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        message={`Are you sure you want to subscribe to ${courseTitle} Course?`}
        confirmText="Yes, I want to subscribe"
        cancelText="No, I don't"
      />
    </>
  );
}

export { SubscribeButton };

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { enrollInCourse } from "@/lib/enrollments";

function SubscribeButton({ courseId, courseTitle }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleConfirm() {
    setIsConfirming(true);
    setErrorMessage("");

    try {
      await enrollInCourse(courseId);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error.message || "Failed to subscribe to this course.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <div className="grid gap-2">
        <Button type="button" className="w-full" onClick={() => setOpen(true)}>
          Subscribe To This Course
        </Button>
        {errorMessage ? (
          <p className="text-body3 text-orange-500" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <ConfirmationDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!isConfirming) {
            setOpen(nextOpen);
          }
        }}
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
        confirmingText="Subscribing..."
        message={`Do you sure to subscribe ${courseTitle} Course?`}
        confirmText="Yes, I want to subscribe"
        cancelText="No, I don't"
      />
    </>
  );
}

export { SubscribeButton };

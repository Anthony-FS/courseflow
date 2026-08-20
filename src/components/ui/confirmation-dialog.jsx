"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirmation",
  message,
  confirmText,
  cancelText,
  isConfirming = false,
  confirmFirst = false,
  confirmingText = "Deleting...",
}) {
  function handleOpenChange(nextOpen) {
    if (isConfirming && !nextOpen) {
      return;
    }
    onOpenChange(nextOpen);
  }

  const confirmButton = (
    <Button
      type="button"
      variant={confirmFirst ? "secondary" : "default"}
      disabled={isConfirming}
      onClick={onConfirm}
    >
      {isConfirming ? confirmingText : confirmText}
    </Button>
  );

  const cancelButton = (
    <Button
      type="button"
      variant={confirmFirst ? "default" : "secondary"}
      disabled={isConfirming}
      onClick={() => handleOpenChange(false)}
    >
      {cancelText}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby="confirmation-dialog-description">
        <header className="flex items-center justify-between border-b border-gray-300 px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose
            aria-label="Close"
            disabled={isConfirming}
            className="rounded-md p-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          >
            <X aria-hidden="true" className="size-6" />
          </DialogClose>
        </header>

        <DialogDescription
          id="confirmation-dialog-description"
          className="px-6 py-6"
        >
          {message}
        </DialogDescription>

        <footer className="flex flex-wrap items-center justify-end gap-4 px-6 pb-6">
          {confirmFirst ? (
            <>
              {confirmButton}
              {cancelButton}
            </>
          ) : (
            <>
              {cancelButton}
              {confirmButton}
            </>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}

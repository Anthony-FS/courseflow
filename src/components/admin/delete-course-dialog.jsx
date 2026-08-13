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

export function DeleteCourseDialog({
  open,
  isDeleting = false,
  onOpenChange,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="delete-course-description">
        <header className="flex items-center justify-between border-b border-gray-300 px-6 py-4">
          <DialogTitle>Confirmation</DialogTitle>
          <DialogClose
            aria-label="Close"
            disabled={isDeleting}
            className="rounded-md p-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
          >
            <X aria-hidden="true" className="size-6" />
          </DialogClose>
        </header>

        <DialogDescription id="delete-course-description" className="px-6 py-6">
          Are you sure you want to delete this course?
        </DialogDescription>

        <footer className="flex flex-wrap items-center justify-end gap-4 px-6 pb-6">
          <Button
            type="button"
            variant="secondary"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            Yes, I want to delete this course
          </Button>
          <Button
            type="button"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            No, keep it
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

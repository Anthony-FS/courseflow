"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function DeletePromoCodeDialog({ open, code, isDeleting, onOpenChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="delete-promo-code-description">
        <header className="flex items-center justify-between border-b border-gray-300 px-6 py-4">
          <DialogTitle>Confirmation</DialogTitle>
          <DialogClose aria-label="Close" disabled={isDeleting} className="rounded-md p-1 text-gray-600 hover:bg-gray-100">
            <X aria-hidden="true" className="size-6" />
          </DialogClose>
        </header>
        <DialogDescription id="delete-promo-code-description" className="px-6 py-6">
          Are you sure you want to delete this code{code ? ` (${code})` : ""}?
        </DialogDescription>
        <footer className="flex flex-wrap items-center justify-end gap-4 px-6 pb-6">
          <Button type="button" variant="secondary" disabled={isDeleting} onClick={onConfirm}>Yes, I want to delete the code</Button>
          <Button type="button" disabled={isDeleting} onClick={() => onOpenChange(false)}>No, keep it</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

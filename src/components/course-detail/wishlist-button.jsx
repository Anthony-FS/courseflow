"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { addCourseToWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

function WishlistButton({ courseId, initiallySaved = false, className }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick() {
    if (saved || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      await addCourseToWishlist(courseId);
      setSaved(true);
    } catch (error) {
      setErrorMessage(error.message || "Failed to add this course to your wishlist.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        variant="secondary"
        type="button"
        className={cn("w-full", className)}
        onClick={handleClick}
        disabled={saved || isSaving}
      >
        {saved ? "Added to Wishlist" : isSaving ? "Adding..." : "Add to Wishlist"}
      </Button>
      {errorMessage ? (
        <p className="text-body3 text-orange-500" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export { WishlistButton };

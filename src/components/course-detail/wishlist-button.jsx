"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addCourseToWishlist, removeCourseFromWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

function WishlistButton({ courseId, initiallySaved = false, className }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick() {
    if (isPending) {
      return;
    }

    setIsPending(true);
    setErrorMessage("");

    try {
      if (saved) {
        await removeCourseFromWishlist(courseId);
        setSaved(false);
        toast.success("Removed course from your wishlist");
      } else {
        await addCourseToWishlist(courseId);
        setSaved(true);
        toast.success("Added course to your wishlist", {
          action: {
            label: "View Wishlist",
            onClick: () => router.push("/wishlist"),
          },
        });
      }
    } catch (error) {
      const msg =
        error.message ||
        (saved
          ? "Failed to remove this course from your wishlist."
          : "Failed to add this course to your wishlist.");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        variant="secondary"
        type="button"
        className={cn("w-full gap-2 transition-all duration-200", className)}
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={saved}
      >
        {saved ? (
          <BookmarkCheck className="size-5 text-orange-500 fill-orange-500/20" aria-hidden />
        ) : (
          <Bookmark className="size-5 text-orange-500" aria-hidden />
        )}
        <span>
          {isPending
            ? saved
              ? "Removing..."
              : "Adding..."
            : saved
              ? "Remove from Wishlist"
              : "Add to Wishlist"}
        </span>
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



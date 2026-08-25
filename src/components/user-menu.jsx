"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bookmark,
  ChevronDown,
  ClipboardCheck,
  LogOut,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const MENU_ITEMS = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/my-courses", label: "My Courses", icon: BookOpen },
  { href: "/assignments", label: "My Assignments", icon: ClipboardCheck },
  { href: "/wishlist", label: "My Wishlist", icon: Bookmark, hasBadge: true },
];

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function UserMenu({
  displayName,
  email,
  avatarUrl,
  wishlistCount = 0,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsConfirmOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setIsLoggingOut(false);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Open account menu for ${displayName}`}
        onClick={() => setIsOpen((open) => !open)}
        className={compact ? "grid size-10 place-items-center rounded-full text-gray-700" : "flex items-center gap-3 text-gray-700"}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-500">
            {getInitials(displayName)}
          </span>
        )}
        {!compact ? <span className="max-w-36 truncate text-body2">{displayName}</span> : null}
        {!compact ? (
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute top-[calc(100%+1rem)] right-0 z-30 w-56 overflow-hidden rounded-xl bg-white py-2 shadow-[0_4px_18px_rgba(34,38,158,0.12)]"
        >
          {MENU_ITEMS.map(({ href, label, icon: Icon, hasBadge }) => (
            <Link
              key={label}
              href={href}
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-4 px-4 py-3 text-body2 text-gray-700 transition-colors hover:bg-blue-50"
            >
              <Icon aria-hidden="true" className="size-5 text-blue-300" strokeWidth={1.5} />
              <span className="flex-1">{label}</span>
              {hasBadge && wishlistCount > 0 ? (
                <span className="grid min-w-5 h-5 place-items-center rounded-full bg-orange-100 px-1.5 text-[11px] font-semibold text-orange-600">
                  {wishlistCount}
                </span>
              ) : null}
            </Link>
          ))}
          <div className="my-1 border-t border-gray-200" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              setIsConfirmOpen(true);
            }}
            className="flex w-full items-center gap-4 px-4 py-3 text-left text-body2 text-gray-700 transition-colors hover:bg-blue-50"
          >
            <LogOut aria-hidden="true" className="size-5 text-blue-300" strokeWidth={1.5} />
            Log out
          </button>
        </div>
      ) : null}

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/30 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirmation-title"
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 id="logout-confirmation-title" className="text-headline4 font-semibold text-blue-700">
              Log out?
            </h2>
            <p className="mt-2 text-body2 text-gray-600">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isLoggingOut}
                className="rounded-lg px-4 py-2 text-body2 font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-lg bg-blue-500 px-4 py-2 text-body2 font-medium text-white hover:bg-blue-400 disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

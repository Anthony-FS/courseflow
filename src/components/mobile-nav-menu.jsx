"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function MobileNavMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative hidden max-[760px]:block">
      <button
        type="button"
        className="grid size-12 place-items-center rounded-lg bg-blue-100 text-blue-500"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X aria-hidden="true" size={24} /> : <Menu aria-hidden="true" size={24} />}
      </button>

      {isOpen ? (
        <nav
          className="absolute top-[calc(100%+0.75rem)] right-0 z-30 grid min-w-52 gap-2 rounded-xl bg-white p-3 shadow-[0_4px_18px_rgba(34,38,158,0.12)]"
          aria-label="Mobile navigation"
        >
          <Link className="rounded-lg bg-blue-500 px-4 py-3 text-center text-body2 font-medium text-white" href="/login" onClick={() => setIsOpen(false)}>Log in</Link>
          <Link className="rounded-lg bg-blue-100 px-4 py-3 text-center text-body2 font-medium text-blue-500" href="/register" onClick={() => setIsOpen(false)}>Register</Link>
        </nav>
      ) : null}
    </div>
  );
}

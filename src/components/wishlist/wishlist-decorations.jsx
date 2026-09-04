export function WishlistDecorations() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Top-left small blue ring */}
      <svg
        className="absolute top-12 left-6 size-4 text-blue-500 sm:top-16 sm:left-12 sm:size-5"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <circle cx="10" cy="10" r="7" />
      </svg>

      {/* Top-left soft blue filled circle */}
      <div className="absolute top-24 left-2 size-6 rounded-full bg-blue-200 sm:top-32 sm:left-6 sm:size-8" />

      {/* Top-right orange outline triangle */}
      <svg
        className="absolute top-16 right-8 size-6 text-orange-500 sm:top-20 sm:right-16 sm:size-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 3 22 21 2 21" />
      </svg>

      {/* Far-right soft blue curved shape */}
      <div className="absolute top-28 -right-6 size-20 rounded-full bg-blue-200/80 sm:top-36 sm:-right-8 sm:size-28 lg:top-40" />
    </div>
  );
}

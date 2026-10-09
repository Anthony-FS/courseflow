import Footer from "@/components/footer";
import { WishlistDecorations } from "@/components/wishlist/wishlist-decorations";

export default function WishlistLoading() {
  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col bg-white">
      <main
        className="relative flex-1 overflow-hidden"
        aria-busy="true"
        aria-live="polite"
        aria-label="My Wishlist"
      >
        <WishlistDecorations />
        <div className="relative z-1 mx-auto w-[calc(100%-3rem)] max-w-280 py-10 sm:py-16">
          <h1 className="text-center text-headline2 font-medium tracking-[-0.02em] text-black">
            My Wishlist
          </h1>
          <p className="sr-only">Loading wishlist</p>
          <div
            className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-hidden="true"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="aspect-16/10 animate-pulse rounded-2xl bg-gray-200"
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

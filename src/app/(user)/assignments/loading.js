import Footer from "@/components/footer";

export default function AssignmentsLoading() {
  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col bg-white">
      <main className="flex-1" aria-busy="true" aria-live="polite" aria-label="My Assignments">
        <div className="mx-auto w-[calc(100%-3rem)] max-w-280 py-10 sm:py-16">
          <h1 className="text-center text-headline2 font-medium tracking-[-0.02em] text-black">
            My Assignments
          </h1>
          <p className="sr-only">Loading assignments</p>
          <div
            className="mt-10 overflow-hidden rounded-lg border border-gray-300 bg-white shadow-card"
            aria-hidden="true"
          >
            <div className="h-12 bg-gray-100" />
            <div className="grid gap-4 px-6 py-5">
              <div className="h-4 w-full animate-pulse rounded-md bg-gray-200" />
              <div className="h-4 w-5/6 animate-pulse rounded-md bg-gray-200" />
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-gray-200" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

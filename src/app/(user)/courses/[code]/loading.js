import Footer from "@/components/footer";

export default function CourseDetailLoading() {
  return (
    <>
      <main
        className="mx-auto w-[calc(100%-3rem)] max-w-280 pb-16 pt-8"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="sr-only">Loading course</p>
        <div className="h-5 w-16 animate-pulse rounded-md bg-gray-200" aria-hidden="true" />
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-x-10">
          <div
            className="aspect-16/10 w-full animate-pulse rounded-lg bg-gray-200"
            aria-hidden="true"
          />
          <div className="h-64 animate-pulse rounded-lg bg-gray-200" aria-hidden="true" />
          <div className="space-y-4 lg:col-start-1" aria-hidden="true">
            <div className="h-8 w-48 animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-5/6 animate-pulse rounded-md bg-gray-200" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-gray-200" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

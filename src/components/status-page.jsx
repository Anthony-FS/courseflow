import Image from "next/image";

/**
 * Shared presentational shell for the 404 and error pages so the two read as a
 * pair. Deliberately has no "use client" directive: it adopts the environment
 * of whichever file imports it, so the server not-found page and the client
 * error boundary can both render it.
 */
export default function StatusPage({ heading, body, children }) {
  return (
    <main className="flex flex-1 items-center bg-white">
      <div className="mx-auto flex w-[calc(100%-3rem)] max-w-280 items-center justify-between gap-16 py-16 max-[900px]:flex-col-reverse max-[900px]:gap-10 max-[900px]:py-12 max-[900px]:text-center">
        <div className="max-w-[34rem] shrink-0 max-[900px]:max-w-full">
          <h1 className="text-headline2 font-medium tracking-[-0.02em] text-black">
            {heading}
          </h1>
          <p className="mt-4 text-body1 leading-normal text-gray-700 max-[760px]:text-body2">
            {body}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 max-[900px]:justify-center max-[760px]:mt-8">
            {children}
          </div>
        </div>

        <div
          className="pointer-events-none w-[26rem] shrink max-[900px]:w-[20rem] max-[760px]:w-[15rem]"
          aria-hidden="true"
        >
          <Image
            className="block h-auto w-full"
            src="/status-illustration.svg"
            alt=""
            width={520}
            height={420}
            priority
          />
        </div>
      </div>
    </main>
  );
}

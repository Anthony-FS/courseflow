import Image from "next/image";
import Link from "next/link";

export default function LearningCta() {
  return (
    <section className="relative min-h-125 overflow-hidden bg-linear1" aria-labelledby="learning-cta-title">
      <div className="relative z-1 mx-auto flex min-h-125 w-[calc(100%-3rem)] max-w-280 items-center max-[760px]:flex-col max-[760px]:justify-start max-[760px]:py-12">
        <div className="relative z-2 max-[760px]:text-center">
          <h2 id="learning-cta-title" className="text-[36px] font-normal leading-tight text-white max-[760px]:text-[30px]">
            Want to start learning?
          </h2>
          <Link
            href="/register"
            className="mt-6 inline-flex min-h-15 min-w-42.25 items-center justify-center rounded-[10px] border border-orange-500 bg-white px-8 text-body2 font-medium text-orange-500 transition-colors hover:bg-orange-500 hover:text-white max-[760px]:mt-5"
          >
            Register here
          </Link>
        </div>

        <div className="absolute bottom-0 right-[8%] w-130 max-[760px]:right-1/2 max-[760px]:w-100 max-[760px]:translate-x-1/2" aria-hidden="true">
          <Image
            src="/landing/start-learning.svg"
            alt="Online learning illustration"
            width={452}
            height={448}
            className="h-auto w-full"
          />
        </div>
      </div>

      <div className="absolute right-[13%] top-14 size-5 rounded-full bg-blue-300/30" aria-hidden="true" />
      <div className="absolute right-[12%] top-17 size-5 rounded-full bg-blue-300/30" aria-hidden="true" />
      <div className="absolute bottom-[15%] left-[40%] size-6 rounded-full border-3 border-green" aria-hidden="true" />
      <div className="absolute right-[5%] top-[28%] size-7 rotate-45 border-2 border-white" aria-hidden="true" />
    </section>
  );
}

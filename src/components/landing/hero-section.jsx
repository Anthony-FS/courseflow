import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
  return (
    <main className="relative min-h-[calc(100vh-88px)] overflow-hidden bg-blue-100 before:absolute before:bottom-[-42%] before:right-[-13%] before:h-[78%] before:w-[82%] before:rotate-[-11deg] before:rounded-[50%_0_0] before:bg-linear2 before:content-[''] after:absolute after:-left-7.5 after:top-19 after:h-25 after:w-25 after:rounded-full after:bg-blue-200 after:content-['']" id="courses">
      <div className="relative z-1 mx-auto flex min-h-[calc(100vh-88px)] w-[calc(100%-3rem)] max-w-280 items-center max-[760px]:items-start">
        <div className="relative z-10 py-9 pb-22.5 max-[760px]:pt-17.5">
          <h1 className="text-headline1 font-medium leading-tight tracking-[-0.02em] text-black">Best Virtual<br />Classroom Software</h1>
          <p className="my-6 mb-12 text-body1 leading-normal text-gray-700 max-[760px]:text-body2">Welcome to Courseflow! The one-stop online class management<br className="max-[760px]:hidden" /> system that caters to all your educational needs!</p>
          <Link className="inline-flex min-h-15 min-w-48.25 items-center justify-center rounded-lg bg-blue-500 font-medium text-white shadow-button transition duration-200 hover:-translate-y-px hover:bg-blue-400" href="/courses">Explore Courses</Link>
        </div>
        <div className="pointer-events-none absolute z-0 bottom-[18%] right-0 w-113 max-[760px]:bottom-[3%] max-[760px]:-right-25 max-[760px]:w-90" aria-hidden="true">
          <Image
            className="block h-auto w-full"
            src="/landing/hero-books.svg"
            alt="books and a laptop"
            width={452}
            height={448}
            priority
          />
        </div>
      </div>
    </main>
  );
}

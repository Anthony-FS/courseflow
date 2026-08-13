"use client";

import { Quote } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const reviews = [
  { name: "Saiful Islam", image: "/review1.jpg", text: "Start with something simple and small, then expand over time. If people call it a ‘toy’, you’re definitely onto something. If you’re waiting for encouragement from others, you’re doing it wrong. By the time people think an idea is good, it’s probably too late.", position: "-348px -249px" },
  { name: "Jane Cooper", image: "/review2.jpg", text: "CourseFlow makes learning feel clear and collaborative. Everything our students need is in one place, and the experience stays simple even as our classes grow.", position: "-1166px -249px" },
  { name: "Brooklyn Simmons", image: "/review3.jpg", text: "The platform gives our team the structure to teach better while still leaving room for creativity. It is easy to use, fast to navigate, and genuinely enjoyable.", position: "-1166px -249px" },
];

function ReviewCard({ review, onPauseChange }) {
  return (
    <article
      className="relative flex h-77.5 w-145 shrink-0 rounded-[10px] bg-blue-100 text-gray-700 max-[680px]:block max-[680px]:h-auto max-[680px]:w-[calc(100vw-3rem)]"
      onMouseEnter={() => onPauseChange(true)}
      onMouseLeave={() => onPauseChange(false)}
    >
      <div className="absolute -left-39.75 top-8.5 z-1 h-60 w-50.5 overflow-hidden rounded-md max-[680px]:relative max-[680px]:left-auto max-[680px]:top-auto max-[680px]:h-52.5 max-[680px]:w-full">
        <Image src={review.image.replace("/review", "/landing/review")} alt={review.name} fill sizes="(max-width: 680px) 100vw, 202px" className="object-cover" />
      </div>
      <div className="px-7 pb-9 pl-18 pt-17 max-[680px]:p-7 max-[680px]:pb-9">
        <h3 className="text-[24px] font-medium leading-tight text-blue-500">{review.name}</h3>
        <p className="mt-5.5 max-w-117.5 text-[16px] leading-normal max-[680px]:mt-4">{review.text}</p>
      </div>
      <Quote className="absolute -left-40 -top-0.5 h-11 w-11 text-blue-300 stroke-[1.4]" aria-hidden="true" />
      <Quote className="absolute bottom-5 right-6 h-11 w-11 text-blue-300 stroke-[1.4]" aria-hidden="true" />
    </article>
  );
}

export default function ReviewSection() {
  const [api, setApi] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!api || isPaused) return undefined;
    const timer = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [api, isPaused]);

  return (
    <section className="relative min-h-184.5 overflow-hidden bg-white text-black" aria-labelledby="review-title">
      <div className="absolute -right-1 top-2 z-0 h-18.5 w-18.5 rounded-full bg-linear2" aria-hidden="true" />
      <div className="absolute right-20 top-21 z-0 h-7 w-7 rounded-full bg-blue-200" aria-hidden="true" />
      <div className="absolute bottom-26 left-21 z-0 rotate-12 text-[34px] leading-none text-green" aria-hidden="true">+</div>

      <div className="relative z-1 pt-27.5 max-[680px]:pt-18">
        <div className="mb-15 text-center max-[680px]:mb-12">
          <h2 id="review-title" className="text-[36px] font-medium leading-tight text-black max-[680px]:text-[30px]">Our Graduates</h2>
        </div>

        {isMounted ? (
          <Carousel
            setApi={setApi}
            opts={{ loop: false, align: "center", containScroll: false, duration: 55 }}
            className="group relative min-h-78 w-full"
          >
            <CarouselContent className="ml-0! gap-59.5 max-[900px]:gap-12 max-[680px]:gap-6">
              {reviews.map((review) => (
                <CarouselItem key={review.name} className="basis-145! pl-0! max-[900px]:basis-145! max-[680px]:basis-[calc(100vw-3rem)]!">
                  <ReviewCard review={review} onPauseChange={setIsPaused} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              className="left-6 top-1/2 z-4 grid size-10.5 -translate-y-1/2 rounded-full border border-blue-300 bg-white text-blue-500 opacity-0 transition-opacity hover:bg-blue-400 hover:text-white group-hover:opacity-100 max-[680px]:left-2"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
            />
            <CarouselNext
              className="right-6 top-1/2 z-4 grid size-10.5 -translate-y-1/2 rounded-full border border-blue-300 bg-white text-blue-500 opacity-0 transition-opacity hover:bg-blue-400 hover:text-white group-hover:opacity-100 max-[680px]:right-2"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
            />
          </Carousel>
        ) : (
          <div className="min-h-78 w-full" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}

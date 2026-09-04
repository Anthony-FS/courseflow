"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

const CarouselContext = React.createContext(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used within a <Carousel />");
  return context;
}

function Carousel({ orientation = "horizontal", opts, setApi, plugins, className, children, ...props }) {
  const [carouselRef, api] = useEmblaCarousel({ ...opts, axis: orientation === "horizontal" ? "x" : "y" }, plugins);
  React.useEffect(() => {
    if (!api || !setApi) return undefined;
    setApi(api);
    return () => setApi(null);
  }, [api, setApi]);

  const scrollPrev = React.useCallback(() => {
    if (!api) return;
    if (api.canScrollPrev()) api.scrollPrev();
    else api.scrollTo(api.scrollSnapList().length - 1);
  }, [api]);
  const scrollNext = React.useCallback(() => {
    if (!api) return;
    if (api.canScrollNext()) api.scrollNext();
    else api.scrollTo(0);
  }, [api]);

  return (
    <CarouselContext.Provider value={{ carouselRef, api, orientation, scrollPrev, scrollNext }}>
      <div role="region" aria-roledescription="carousel" className={cn("relative", className)} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }) {
  const { carouselRef, orientation } = useCarousel();
  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)} {...props} />
    </div>
  );
}

function CarouselItem({ className, ...props }) {
  const { orientation } = useCarousel();
  return <div role="group" aria-roledescription="slide" className={cn("min-w-0 shrink-0 grow-0", orientation === "horizontal" ? "pl-4" : "pt-4", className)} {...props} />;
}

function CarouselPrevious({ className, ...props }) {
  const { orientation, scrollPrev } = useCarousel();
  return <button type="button" aria-label="Previous review" onClick={scrollPrev} className={cn("absolute grid size-10 place-items-center rounded-full border bg-white text-blue-500", orientation === "horizontal" ? "-left-12 top-1/2 -translate-y-1/2" : "-top-12 left-1/2 -translate-x-1/2 rotate-90", className)} {...props}><ArrowLeft size={18} /></button>;
}

function CarouselNext({ className, ...props }) {
  const { orientation, scrollNext } = useCarousel();
  return <button type="button" aria-label="Next review" onClick={scrollNext} className={cn("absolute grid size-10 place-items-center rounded-full border bg-white text-blue-500", orientation === "horizontal" ? "-right-12 top-1/2 -translate-y-1/2" : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90", className)} {...props}><ArrowRight size={18} /></button>;
}

export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, useCarousel };

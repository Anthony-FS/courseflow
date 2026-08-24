import { Heart, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";

const description = "Duis aute irure dolor in reprehenderit in voluptate velit es se cillum dolore eu fugiat nulla pariatur. Excepteur sint.";

function FeatureItem({ icon: Icon, title }) {
  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)] items-start gap-4.5">
      <div className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-blue-400 text-blue-400" aria-hidden="true">
        <Icon size={20} strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="mt-px text-headline3 font-normal leading-tight text-black max-[900px]:text-body1">{title}</h3>
        <p className="mt-2 max-w-117.5 text-body2 leading-normal text-gray-700 max-[900px]:text-body3">{description}</p>
      </div>
    </div>
  );
}

function FeatureImage({ image, alt }) {
  return (
    <div className="relative aspect-454/330 w-full overflow-hidden rounded-md">
      <Image src={`/landing/${image}`} alt={alt} fill sizes="(max-width: 680px) 100vw, 50vw" className="object-cover" />
    </div>
  );
}

export default function Feature() {
  return (
    <section className="relative overflow-hidden bg-white" aria-labelledby="feature-title">
      <div className="feature-decoration feature-decoration--top" aria-hidden="true" />
      <div className="feature-decoration feature-decoration--dot" aria-hidden="true" />
      <div className="feature-decoration feature-decoration--plus" aria-hidden="true">+</div>

      <div className="relative z-1 mx-auto w-[calc(100%-3rem)] max-w-280 py-18 pb-28 max-[680px]:py-12 max-[680px]:pb-16">
        <div className="grid grid-cols-2 items-center gap-29.5 max-[900px]:gap-8 max-[680px]:mt-0 max-[680px]:flex max-[680px]:flex-col max-[680px]:gap-8">
          <FeatureImage image="feature1.jpg" alt="Technology-assisted learning" />
          <div>
            <h2 id="feature-title" className="max-w-140 text-headline2 font-medium leading-tight tracking-[-0.02em] text-black max-[900px]:text-headline3">Learning experience has been enhanced with new technologies</h2>
            <div className="mt-10 grid gap-6">
              <FeatureItem icon={ShieldCheck} title="Secure & Easy" />
              <FeatureItem icon={Heart} title="Supports All Students" />
            </div>
          </div>
        </div>

        <div className="mt-29.5 grid grid-cols-2 items-center gap-29.5 max-[900px]:gap-8 max-[680px]:mt-12 max-[680px]:flex max-[680px]:flex-col">
          <div className="w-full max-[680px]:order-2">
            <h2 className="max-w-140 text-headline2 font-medium leading-tight tracking-[-0.02em] text-black max-[900px]:text-headline3">Interactions between the tutor and the learners</h2>
            <div className="mt-10 grid gap-6">
              <FeatureItem icon={Users} title="Purely Collaborative" />
              <FeatureItem icon={Heart} title="Supports All Students" />
            </div>
          </div>
          <div className="w-full max-[680px]:order-1"><FeatureImage image="feature2.jpg" alt="Collaborative learning" /></div>
        </div>
      </div>

      <div className="feature-decoration feature-decoration--bottom" aria-hidden="true" />
    </section>
  );
}

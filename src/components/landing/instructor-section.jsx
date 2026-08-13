import Image from "next/image";

const instructors = [
  { name: "Jane Cooper", role: "UX/UI Designer", image: "instructor1.jpg" },
  { name: "Esther Howard", role: "Program Manager", image: "instructor2.jpg" },
  { name: "Brooklyn Simmons", role: "Software Engineer", image: "instructor3.jpg" },
];

function InstructorCard({ name, role, image }) {
  return (
    <article className="text-center">
      <div className="relative aspect-357/420 w-full overflow-hidden rounded-md max-[680px]:mx-auto">
        <Image src={`/landing/${image}`} alt={`${name}, ${role}`} fill sizes="(max-width: 680px) 100vw, 33vw" className="object-cover" />
      </div>
      <h3 className="mt-5 text-headline3 font-normal leading-tight text-black">{name}</h3>
      <p className="mt-2 text-body2 leading-normal text-blue-400">{role}</p>
    </article>
  );
}

export default function InstructorSection() {
  return (
    <section className="relative overflow-hidden bg-white" aria-labelledby="instructor-title">
      <div className="relative z-1 mx-auto w-[calc(100%-3rem)] max-w-280 py-18 pb-23.5 max-[680px]:py-12">
        <h2 id="instructor-title" className="text-center text-headline2 font-medium leading-tight tracking-[-0.02em] text-black max-[680px]:text-headline3">Our Professional Instructors</h2>
        <div className="mt-15.5 grid grid-cols-3 gap-6 max-[680px]:mt-8 max-[680px]:grid-cols-1 max-[680px]:gap-10">
          {instructors.map((instructor) => (
            <InstructorCard key={instructor.name} {...instructor} />
          ))}
        </div>
      </div>
      <div className="instructor-decoration" aria-hidden="true" />
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4.5 fill-current"><path d="M14.5 8.5h2V5.1c-.35-.05-1.56-.15-2.96-.15-2.93 0-4.94 1.79-4.94 5.08v2.83H5.36v3.8H8.6V24h3.97v-7.34h3.1l.49-3.8h-3.59v-2.62c0-1.1.3-1.85 1.93-1.85Z" /></svg>;
}

function InstagramIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4.5 fill-none stroke-current" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" /></svg>;
}

function TwitterIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4.5 fill-current"><path d="M18.9 2.25h3.68l-8.04 9.19L24 21.75h-7.4l-5.8-7.58-6.63 7.58H.48l8.6-9.84L0 2.25h7.59l5.24 6.93 6.07-6.93Zm-1.29 17.61h2.04L6.48 4.02H4.29L17.61 19.86Z" /></svg>;
}

const socialLinks = [
  { label: "Facebook", href: "#facebook", icon: FacebookIcon },
  { label: "Instagram", href: "#instagram", icon: InstagramIcon },
  { label: "Twitter", href: "#twitter", icon: TwitterIcon },
];

export default function Footer() {
  return (
    <footer className="bg-blue-700 text-white">
      <div className="mx-auto flex min-h-60 w-[calc(100%-3rem)] max-w-280 items-center justify-between gap-10 max-[760px]:flex-col max-[760px]:justify-center max-[760px]:py-10">
        <Link href="/" aria-label="CourseFlow home">
          <Image src="/courseflow-logo.svg" alt="CourseFlow" width={140} height={16} />
        </Link>

        <nav className="flex items-center gap-22 text-body2 text-gray-300 max-[760px]:gap-8" aria-label="Footer navigation">
          {/*Add navigation links here*/}
          <Link className="transition-colors hover:text-white" href="/">All Courses</Link>
          <Link className="transition-colors hover:text-white" href="/">Bundle Package</Link>
        </nav>

        <nav className="flex items-center gap-4" aria-label="Social media links">
          {socialLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              className="grid size-12 place-items-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-400"
              href={href}
              aria-label={label}
            >
              <Icon size={18} strokeWidth={2.5} />
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

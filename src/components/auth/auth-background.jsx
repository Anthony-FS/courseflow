import { Plus } from "lucide-react";

export function LoginDecorations() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <svg
        className="absolute bottom-[-8%] left-[-10%] h-[28vh] w-[18vw] max-h-[220px] max-w-[72px] md:bottom-auto md:left-[-20px] md:top-[421px] md:h-[418px] md:max-h-none md:w-[113px] md:max-w-none"
        viewBox="0 0 113 418"
        fill="#FBAA1C"
        aria-hidden
      >
        <circle cx="-137" cy="209" r="250" />
      </svg>

      <svg
        className="absolute top-0 right-0 h-[32vh] w-[12vw] max-h-[280px] max-w-[64px] text-blue-500 md:h-[617px] md:max-h-none md:w-[172.64px] md:max-w-none"
        viewBox="0 0 173 617"
        fill="currentColor"
        aria-hidden
      >
        <path d="M173 0C95 35 8 95 6 200C4 310 70 490 173 617V0Z" />
      </svg>

      <div className="absolute top-[12%] left-[3%] size-[10vw] max-w-12 rounded-full bg-blue-200 md:top-36 md:left-16 md:size-[130px] md:max-w-none" />

      <Plus
        className="absolute top-[16%] left-[12%] size-[4vw] max-w-5 text-green md:top-64 md:left-52 md:size-10 md:max-w-none"
        strokeWidth={2.75}
      />

      <svg
        className="absolute right-[3%] bottom-[10%] z-[1] size-[5vw] max-w-6 md:top-[589px] md:right-[59px] md:bottom-auto md:size-[35px] md:max-w-none"
        viewBox="0 0 35 35"
        aria-hidden
      >
        <circle cx="17.5" cy="17.5" fill="#FFFFFF" r="17.5" />
        <circle
          cx="17.5"
          cy="17.5"
          r="16"
          fill="none"
          stroke="#F47E20"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

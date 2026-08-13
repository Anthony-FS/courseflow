import Image from "next/image";

export function AuthShapes() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] w-full overflow-hidden"
    >
      <svg className="absolute size-0">
        <filter id="auth-knock-black" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1 1 1 0 0"
          />
        </filter>
      </svg>
      <div
        className="absolute inset-0"
        style={{ filter: "url(#auth-knock-black)" }}
      >
        <Image
          src="/auth-shapes.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
        />
      </div>
    </div>
  );
}

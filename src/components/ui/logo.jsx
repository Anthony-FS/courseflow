import Image from "next/image";
import Link from "next/link";

export default function Logo({
  showSubtext = true,
  subtext = "Admin Panel Control",
  href = "/admin/courses",
  className = "",
  width = 160,
  height = 20,
}) {
  return (
    <Link href={href} className={`block group ${className}`}>
      <div className="flex items-center justify-center">
        <Image
          src="/courseflow-logo.svg"
          alt="CourseFlow Logo"
          width={width}
          height={height}
          priority
          style={{ width, height: "auto" }}
        />
      </div>
      {showSubtext && (
        <p className="text-[15px] text-[#646D89] font-normal tracking-tight mt-3">
          {subtext}
        </p>
      )}
    </Link>
  );
}

import Image from "next/image";

export function memberInitials(displayName) {
  return String(displayName || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function MyCoursesProfileCard({ member, inProgress, completed }) {
  const displayName = member?.displayName || "User";
  const avatarUrl = member?.avatarUrl || "";

  return (
    <aside
      className="h-fit min-w-0 rounded-2xl bg-white p-6 text-center shadow-card"
      aria-label="Member course summary"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`${displayName} profile photo`}
          width={112}
          height={112}
          className="mx-auto size-28 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div
          className="mx-auto grid size-28 place-items-center rounded-full bg-blue-100 text-headline2 font-semibold text-blue-500"
          aria-label={`${displayName} profile initials`}
        >
          {memberInitials(displayName)}
        </div>
      )}

      <h2 className="mt-4 truncate text-headline3 font-medium text-black">
        {displayName}
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-xl bg-blue-50 px-2 py-4">
          <p className="text-headline3 font-medium text-blue-500">{inProgress}</p>
          <p className="mt-1 text-body4 leading-snug text-gray-700">
            Course In Progress
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-orange-50 px-2 py-4">
          <p className="text-headline3 font-medium text-orange-500">{completed}</p>
          <p className="mt-1 text-body4 leading-snug text-gray-700">
            Course Complete
          </p>
        </div>
      </div>
    </aside>
  );
}

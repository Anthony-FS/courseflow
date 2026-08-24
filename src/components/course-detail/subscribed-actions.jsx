import Link from "next/link";
import { File } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) {
    return null;
  }

  const megabytes = size / (1024 * 1024);
  if (megabytes >= 1) {
    return `${Math.round(megabytes)} mb`;
  }

  const kilobytes = size / 1024;
  if (kilobytes >= 1) {
    return `${Math.round(kilobytes)} kb`;
  }

  return `${Math.round(size)} b`;
}

function CourseAttachmentSection({ attachment }) {
  const fileSizeLabel = formatFileSize(attachment?.fileSize);

  return (
    <section aria-labelledby="attach-file-heading">
      <h2
        id="attach-file-heading"
        className="text-headline3 font-medium text-black"
      >
        Documents
      </h2>
      {attachment?.fileUrl ? (
        <a
          href={attachment.fileUrl}
          download={attachment.name}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex max-w-full items-center gap-4 rounded-lg bg-blue-100 p-4 transition-colors hover:bg-blue-200"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-md bg-white">
            <File className="size-6 text-blue-400" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body2 font-medium text-black">
              {attachment.name}
            </span>
            {fileSizeLabel ? (
              <span className="mt-0.5 block text-body3 text-blue-400">
                {fileSizeLabel}
              </span>
            ) : null}
          </span>
        </a>
      ) : (
        <p className="mt-4 text-body2 text-gray-700">No files attached yet.</p>
      )}
    </section>
  );
}

function StartLearningButton({ courseCode, className }) {
  return (
    <Button asChild className={cn("w-full", className)}>
      <Link href={`/courses/${encodeURIComponent(courseCode)}/learn`}>
        Start Learning
      </Link>
    </Button>
  );
}

export { CourseAttachmentSection, StartLearningButton };

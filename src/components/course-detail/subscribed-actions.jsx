import Link from "next/link";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

function CourseAttachmentSection({ attachment }) {
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
          className="mt-4 inline-flex items-center gap-3 text-body2 text-blue-500 hover:text-blue-400"
        >
          <FileText className="size-5 shrink-0" aria-hidden />
          <span>{attachment.name}</span>
        </a>
      ) : (
        <p className="mt-4 text-body2 text-gray-700">No files attached yet.</p>
      )}
    </section>
  );
}

function StartLearningButton({ courseCode }) {
  return (
    <Button asChild className="w-full">
      <Link href={`/courses/${encodeURIComponent(courseCode)}/learn`}>
        Start Learning
      </Link>
    </Button>
  );
}

export { CourseAttachmentSection, StartLearningButton };

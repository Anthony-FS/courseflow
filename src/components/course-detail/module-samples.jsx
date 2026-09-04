"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function formatModuleNumber(index) {
  return String(index + 1).padStart(2, "0");
}

function ModuleSamples({ lessons }) {
  const [openId, setOpenId] = useState(lessons[0]?.id ?? null);

  if (!lessons.length) {
    return (
      <section aria-labelledby="module-samples-heading">
        <h2
          id="module-samples-heading"
          className="text-headline3 font-medium text-black"
        >
          Module Samples
        </h2>
        <p className="mt-6 text-body2 text-gray-700">
          Module samples will appear here once lessons are added.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="module-samples-heading">
      <h2
        id="module-samples-heading"
        className="text-headline3 font-medium text-black"
      >
        Module Samples
      </h2>

      <ul className="mt-6 divide-y divide-gray-300 border-y border-gray-300">
        {lessons.map((lesson, index) => {
          const isOpen = openId === lesson.id;
          const panelId = `module-${lesson.id}`;

          return (
            <li key={lesson.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : lesson.id)}
                className="flex w-full items-center gap-4 py-5 text-left"
              >
                <span className="text-headline3 font-medium text-gray-700">
                  {formatModuleNumber(index)}
                </span>
                <span className="flex-1 text-headline3 font-medium text-black">
                  {lesson.title}
                </span>
                <ChevronDown
                  className={cn(
                    "size-6 shrink-0 text-gray-700 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {isOpen ? (
                <div id={panelId} className="pb-6 pl-14">
                  {lesson.subLessons.length ? (
                    <ul className="list-disc space-y-2 pl-5 text-body2 text-gray-700">
                      {lesson.subLessons.map((subLesson) => (
                        <li key={subLesson.id}>{subLesson.title}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-body2 text-gray-700">
                      Sub-lessons will appear here soon.
                    </p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export { ModuleSamples };

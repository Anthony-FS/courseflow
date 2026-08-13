"use client";

import { useState } from "react";
import Image from "next/image";
import { GripVertical, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INITIAL_LESSONS = [
  {
    id: 1,
    name: "Introduction",
    subLessons: 10,
  },
  {
    id: 2,
    name: "Service Design Theories and Principles",
    subLessons: 10,
  },
  {
    id: 3,
    name: "Understanding Users and Finding Opportunities",
    subLessons: 10,
  },
  {
    id: 4,
    name: "Turning Problems into Opportunities",
    subLessons: 10,
  },
  {
    id: 5,
    name: "Prototyping and Testing Concepts",
    subLessons: 10,
  },
  {
    id: 6,
    name: "Final Project",
    subLessons: 10,
  },
];

function CourseLessonsSection({ className }) {
  const [lessons, setLessons] = useState(INITIAL_LESSONS);
  const [dragIndex, setDragIndex] = useState(null);
  const isDragging = dragIndex !== null;

  function handleAddLesson() {
    setLessons((current) => [
      ...current,
      {
        id: Date.now(),
        name: `Lesson ${current.length + 1}`,
        subLessons: 0,
      },
    ]);
  }

  function handleDeleteLesson(id) {
    setLessons((current) => current.filter((lesson) => lesson.id !== id));
  }

  function handleDragStart(event, index) {
    const row = event.currentTarget;
    row.classList.add("lesson-row--dragging");
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));

    // Hide the browser's default drag ghost; the lifted row is the only preview.
    const ghost = document.createElement("div");
    ghost.style.cssText =
      "position:fixed;top:-1000px;left:-1000px;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => ghost.remove());
  }

  function handleDragOver(event, index) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragIndex === null || dragIndex === index) return;

    setLessons((current) => {
      const next = [...current];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  }

  function handleDragEnd(event) {
    event.currentTarget.classList.remove("lesson-row--dragging");
    setDragIndex(null);
  }

  return (
    <section className={cn("mx-auto max-w-5xl", className)}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-headline3 text-gray-900">Lesson</h2>
        <Button type="button" size="sm" onClick={handleAddLesson}>
          <Plus className="size-4" aria-hidden />
          Add Lesson
        </Button>
      </div>

      <div
        className={cn(
          "rounded-xl border border-gray-300 bg-white shadow-card",
          isDragging ? "overflow-visible" : "overflow-hidden"
        )}
      >
        <div className={cn(isDragging ? "overflow-visible" : "overflow-x-auto")}>
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="bg-gray-100 text-body3 font-medium text-gray-700">
                <th className="w-16 rounded-tl-xl px-4 py-3" aria-label="Order" />
                <th className="px-4 py-3 font-medium">Lesson name</th>
                <th className="w-32 px-4 py-3 text-center font-medium">
                  Sub-lesson
                </th>
                <th className="w-28 rounded-tr-xl px-4 py-3 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {lessons.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-body3 text-gray-700"
                  >
                    No lessons yet. Click &quot;Add Lesson&quot; to create one.
                  </td>
                </tr>
              ) : (
                lessons.map((lesson, index) => {
                  const isLifted = dragIndex === index;

                  return (
                    <tr
                      key={lesson.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, index)}
                      onDragOver={(event) => handleDragOver(event, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "lesson-row text-body3 text-gray-900 transition-[transform,box-shadow,background-color,opacity] duration-200 ease-out",
                        "[&>td]:border-t [&>td]:border-gray-300",
                        isDragging && !isLifted && "opacity-70",
                        isLifted && "lesson-row--dragging relative z-20"
                      )}
                    >
                      <td
                        className={cn(
                          "px-4 py-4 first:rounded-l-xl",
                          isLifted && "border-t-transparent bg-white"
                        )}
                      >
                        <div className="flex items-center gap-2 text-gray-600">
                          <button
                            type="button"
                            aria-label={`Reorder ${lesson.name}`}
                            className="cursor-grab text-gray-500 active:cursor-grabbing"
                          >
                            <GripVertical className="size-4" aria-hidden />
                          </button>
                          <span>{index + 1}</span>
                        </div>
                      </td>
                      <td
                        className={cn(
                          "px-4 py-4 font-medium",
                          isLifted && "border-t-transparent bg-white"
                        )}
                      >
                        {lesson.name}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-4 text-center text-gray-800",
                          isLifted && "border-t-transparent bg-white"
                        )}
                      >
                        {lesson.subLessons}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-4 last:rounded-r-xl",
                          isLifted && "border-t-transparent bg-white"
                        )}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            aria-label={`Delete ${lesson.name}`}
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="rounded-md p-1.5 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:shadow-focus"
                          >
                            <Image
                              src="/delete.svg"
                              alt=""
                              width={18}
                              height={21}
                              className="h-5 w-[18px]"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label={`Edit ${lesson.name}`}
                            className="rounded-md p-1.5 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:shadow-focus"
                          >
                            <Image
                              src="/edit.svg"
                              alt=""
                              width={24}
                              height={24}
                              className="size-5"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export { CourseLessonsSection };

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPromoCourseOptions } from "@/lib/promo-codes";

const INITIAL_FORM = {
  code: "",
  minPurchaseAmount: "",
  discountType: "thb",
  discountValue: "",
  courseIds: [],
};

function digitsOnly(value) {
  return value.replace(/[^0-9]/g, "");
}

export default function AddPromoCodePage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);
  const courseMenuRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getPromoCourseOptions()
      .then((data) => {
        if (!cancelled) setCourses(data);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!courseMenuRef.current?.contains(event.target)) {
        setIsCourseMenuOpen(false);
        setForm((current) =>
          current.courseIds.length === 0 ? { ...current, courseIds: [] } : current,
        );
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handlePercentBlur() {
    if (form.discountType !== "percent" || form.discountValue === "") return;
    setField("discountValue", String(Math.min(Number(form.discountValue), 100)));
  }

  function handleTypeChange(type) {
    setForm((current) => ({ ...current, discountType: type, discountValue: "" }));
  }

  function toggleCourse(courseId) {
    setForm((current) => {
      const courseIds = current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId];
      return { ...current, courseIds };
    });
  }

  function toggleAllCourses() {
    setForm((current) => ({ ...current, courseIds: [] }));
  }

  const selectedCourses = courses.filter((course) => form.courseIds.includes(course.id));

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!form.code || !form.minPurchaseAmount || !form.discountValue) {
      setErrorMessage("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create promo code.");
      router.push("/admin/promo-codes");
      router.refresh();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-300 bg-white px-10 py-4">
        <h1 className="text-headline3">Add Promo code</h1>
        <div className="flex items-center gap-4">
          <Button asChild variant="secondary" className="min-h-12 px-8 py-3">
            <Link href="/admin/promo-codes">Cancel</Link>
          </Button>
          <Button type="submit" form="promo-code-form" disabled={isSubmitting} className="min-h-12 px-8 py-3">
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </header>

      <form id="promo-code-form" onSubmit={handleSubmit} className="m-10 rounded-2xl border border-gray-300 bg-white p-10 shadow-card">
        <div className="grid grid-cols-2 gap-x-10 gap-y-8">
          <label className="block">
            <span className="mb-1.5 block text-body2">Set promo code*</span>
            <input
              required
              value={form.code}
              onChange={(event) => setField("code", event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())}
              className="h-12 w-full rounded-lg border border-gray-400 px-3 text-body2 outline-none focus:border-orange-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-body2">Minimum purchase amount (THB)*</span>
            <input
              required
              inputMode="numeric"
              value={form.minPurchaseAmount}
              onChange={(event) => setField("minPurchaseAmount", digitsOnly(event.target.value))}
              className="h-12 w-full rounded-lg border border-gray-400 px-3 text-body2 outline-none focus:border-orange-100"
            />
          </label>

          <fieldset className="col-span-2">
            <legend className="mb-3 text-body2">Select discount type*</legend>
            <div className="grid grid-cols-2 gap-10">
              <label className="flex items-center gap-3">
                <input type="radio" name="discountType" checked={form.discountType === "thb"} onChange={() => handleTypeChange("thb")} className="size-5 accent-blue-500" />
                <span className="whitespace-nowrap text-gray-800">Fixed amount (THB)</span>
                <input required={form.discountType === "thb"} inputMode="numeric" placeholder="THB" value={form.discountType === "thb" ? form.discountValue : ""} onChange={(event) => setField("discountValue", digitsOnly(event.target.value))} className="h-12 w-32 rounded-lg border border-gray-400 px-3 text-body2" />
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="discountType" checked={form.discountType === "percent"} onChange={() => handleTypeChange("percent")} className="size-5 accent-blue-500" />
                <span className="whitespace-nowrap text-gray-800">Percent (%)</span>
                <input required={form.discountType === "percent"} inputMode="numeric" placeholder="Percent" value={form.discountType === "percent" ? form.discountValue : ""} onChange={(event) => setField("discountValue", digitsOnly(event.target.value))} onBlur={handlePercentBlur} className="h-12 w-48 rounded-lg border border-gray-400 px-3 text-body2 placeholder:text-gray-500" />
              </label>
            </div>
          </fieldset>

          <div className="relative col-span-2" ref={courseMenuRef}>
            <span className="mb-1.5 block text-body2">Courses Included</span>
            <button
              type="button"
              aria-expanded={isCourseMenuOpen}
              onClick={() => setIsCourseMenuOpen((open) => !open)}
              className={`relative flex min-h-12 w-full items-center rounded-lg border bg-white px-3 pr-12 text-left text-body2 outline-none focus:border-orange-100 ${isCourseMenuOpen ? "border-orange-100" : "border-gray-400"}`}
            >
              {form.courseIds.length === 0 ? (
                <span>All courses</span>
              ) : (
                <span className="flex flex-wrap gap-2 pr-2">
                  {selectedCourses.map((course) => (
                    <span key={course.id} onClick={(event) => { event.stopPropagation(); toggleCourse(course.id); }} className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-100 px-3 py-1 text-body4 font-medium text-gray-900">
                      {course.title}
                      <X aria-hidden="true" className="size-4 text-blue-500" />
                    </span>
                  ))}
                </span>
              )}
              {isCourseMenuOpen ? (
                <ChevronUp aria-hidden="true" className="pointer-events-none absolute right-4 size-4 text-gray-500" />
              ) : (
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 size-4 text-gray-500" />
              )}
            </button>

            {isCourseMenuOpen ? (
              <div className="absolute z-20 mt-3 max-h-80 w-full overflow-y-auto rounded-lg bg-white p-3 shadow-card">
                <label className="flex cursor-pointer items-center gap-3 px-2 py-2 text-gray-700">
                  <input type="checkbox" checked={form.courseIds.length === 0} onChange={toggleAllCourses} className="size-5 accent-blue-500" />
                  <span>All courses</span>
                </label>
                {courses.map((course) => (
                  <label key={course.id} className="flex cursor-pointer items-center gap-3 px-2 py-2 text-gray-700">
                    <input type="checkbox" checked={form.courseIds.includes(course.id)} onChange={() => toggleCourse(course.id)} className="size-5 accent-blue-500" />
                    <span>{course.title}</span>
                  </label>
                ))}
                {courses.length === 0 ? <p className="px-2 py-2 text-body3 text-gray-600">No courses found.</p> : null}
              </div>
            ) : null}
          </div>
        </div>
        {errorMessage ? <p role="alert" className="mt-6 text-body2 text-orange-500">{errorMessage}</p> : null}
      </form>
    </main>
  );
}

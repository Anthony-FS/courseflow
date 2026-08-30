"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getRequiredMinimumPurchase } from "@/lib/promo-code-validation";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { digitsOnly, getPromoCourseOptions, normalizePromoCode } from "@/lib/promo-codes";

export default function EditPromoCodePage() {
  const { id } = useParams();
  const router = useRouter();
  const [promo, setPromo] = useState(null);
  const [form, setForm] = useState({ code: "", minPurchaseAmount: "", discountType: "thb", discountValue: "", courseIds: [] });
  const [errorMessage, setErrorMessage] = useState("");
  const [notices, setNotices] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [courses, setCourses] = useState([]);
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);
  const courseMenuRef = useRef(null);

  useEffect(() => {
    fetch(`/api/admin/promo-codes/${id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load promo code.");
        return response.json();
      })
      .then((data) => {
        setPromo(data);
        setForm({
          code: data.code,
          minPurchaseAmount: String(data.min_purchase_amount ?? 0),
          discountType: data.discount_type === "percent" ? "percent" : "thb",
          discountValue: String(data.discount_value ?? 0),
          courseIds: data.courseIds ?? (data.course_id ? [data.course_id] : []),
        });
      })
      .catch((error) => setErrorMessage(error.message));
  }, [id]);

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
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setNotice(field, message) {
    setNotices((current) => ({ ...current, [field]: message }));
  }

  function toggleCourse(courseId) {
    setForm((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId],
    }));
  }

  function toggleAllCourses() {
    setForm((current) => ({ ...current, courseIds: [] }));
  }

  function handleFixedDiscountChange(value) {
    const requiredMinimumPurchase = getRequiredMinimumPurchase("fixed", value);
    setForm((current) => ({
      ...current,
      discountValue: value,
      minPurchaseAmount:
        requiredMinimumPurchase !== null && Number(current.minPurchaseAmount || 0) < requiredMinimumPurchase
          ? String(requiredMinimumPurchase)
          : current.minPurchaseAmount,
    }));
    if (requiredMinimumPurchase !== null && Number(form.minPurchaseAmount || 0) < requiredMinimumPurchase) {
      setNotice("minPurchaseAmount", `Minimum purchase was adjusted to ${requiredMinimumPurchase} THB so the customer pays at least 100 THB.`);
    }
  }

  function handleMinPurchaseBlur() {
    const requiredMinimumPurchase = getRequiredMinimumPurchase("fixed", form.discountValue);
    if (requiredMinimumPurchase !== null && Number(form.minPurchaseAmount || 0) < requiredMinimumPurchase) {
      setField("minPurchaseAmount", String(requiredMinimumPurchase));
      setNotice("minPurchaseAmount", `Minimum purchase was adjusted to ${requiredMinimumPurchase} THB so the customer pays at least 100 THB.`);
      return;
    }
    setNotice("minPurchaseAmount", "");
  }

  function handlePercentBlur() {
    if (form.discountType !== "percent" || form.discountValue === "") return;
    if (Number(form.discountValue) > 100) {
      setField("discountValue", "100");
      setNotice("discountValue", "Percentage discount cannot exceed 100%. The value was adjusted to 100%.");
      return;
    }
    setNotice("discountValue", "");
  }

  function handleTypeChange(type) {
    setForm((current) => {
      const requiredMinimumPurchase = getRequiredMinimumPurchase(
        type,
        current.discountValue,
      );
      return {
        ...current,
        discountType: type,
        minPurchaseAmount:
          requiredMinimumPurchase !== null &&
          Number(current.minPurchaseAmount || 0) < requiredMinimumPurchase
            ? String(requiredMinimumPurchase)
            : current.minPurchaseAmount,
      };
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/admin/promo-codes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update promo code.");
      router.push("/admin/promo-codes");
      router.refresh();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const selectedCourses = courses.filter((course) => form.courseIds.includes(course.id));

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete promo code.");
      router.push("/admin/promo-codes");
      router.refresh();
    } catch (error) {
      setErrorMessage(error.message);
      setIsDeleting(false);
    }
  }

  return (
    <main className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-300 bg-white px-10 py-4">
        <h1 className="flex items-center gap-4 text-headline3">
          <Link href="/admin/promo-codes" aria-label="Back to promo codes" className="text-gray-600"><ArrowLeft aria-hidden="true" className="size-6" /></Link>
          <span className="text-gray-600">Promo code</span>
          <span>{promo?.code ?? ""}</span>
        </h1>
        <div className="flex items-center gap-4">
          <Button asChild variant="secondary" className="min-h-12 px-8 py-3"><Link href="/admin/promo-codes">Cancel</Link></Button>
          <Button type="submit" form="edit-promo-code-form" disabled={isSaving || !promo} className="min-h-12 px-8 py-3">{isSaving ? "Saving..." : "Save"}</Button>
        </div>
      </header>

      <form id="edit-promo-code-form" onSubmit={handleSave} className="m-10 rounded-2xl border border-gray-300 bg-white p-10 shadow-card">
        <div className="grid grid-cols-2 gap-x-10 gap-y-8">
          <label className="block"><span className="mb-1.5 block text-body2">Set promo code*</span><input required value={form.code} onChange={(event) => setField("code", normalizePromoCode(event.target.value))} className="h-12 w-full rounded-lg border border-gray-400 px-3 text-body2" /></label>
          <label className="block"><span className="mb-1.5 block text-body2">Minimum purchase amount (THB)*</span><input required inputMode="numeric" value={form.minPurchaseAmount} onChange={(event) => setField("minPurchaseAmount", digitsOnly(event.target.value))} onBlur={handleMinPurchaseBlur} className="h-12 w-full rounded-lg border border-gray-400 px-3 text-body2" />{notices.minPurchaseAmount ? <p className="mt-1.5 text-sm text-blue-600">{notices.minPurchaseAmount}</p> : null}</label>
          <fieldset className="col-span-2"><legend className="mb-3 text-body2">Select discount type*</legend><div className="grid grid-cols-2 gap-10">
            <label className="flex items-center gap-3"><input type="radio" checked={form.discountType === "thb"} onChange={() => handleTypeChange("thb")} className="size-5 accent-blue-500" /><span className="whitespace-nowrap text-gray-800">Discount (THB)</span><input required={form.discountType === "thb"} inputMode="numeric" value={form.discountType === "thb" ? form.discountValue : ""} onChange={(event) => handleFixedDiscountChange(digitsOnly(event.target.value))} className="h-12 w-32 rounded-lg border border-gray-400 px-3 text-body2" /></label>
            <label className="flex items-center gap-3"><input type="radio" checked={form.discountType === "percent"} onChange={() => handleTypeChange("percent")} className="size-5 accent-blue-500" /><span className="whitespace-nowrap text-gray-800">Discount (%)</span><input required={form.discountType === "percent"} inputMode="numeric" placeholder="Percent" value={form.discountType === "percent" ? form.discountValue : ""} onChange={(event) => setField("discountValue", digitsOnly(event.target.value))} onBlur={handlePercentBlur} className="h-12 w-48 rounded-lg border border-gray-400 px-3 text-body2 placeholder:text-gray-500" />{notices.discountValue ? <span className="text-sm text-blue-600">{notices.discountValue}</span> : null}</label>
          </div></fieldset>
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
                      {course.course_code}
                      <X aria-hidden="true" className="size-4 text-blue-500" />
                    </span>
                  ))}
                </span>
              )}
              {isCourseMenuOpen ? <ChevronUp aria-hidden="true" className="pointer-events-none absolute right-4 size-4 text-gray-500" /> : <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 size-4 text-gray-500" />}
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
                  <span>{course.course_code}</span>
                  </label>
                ))}
                {courses.length === 0 ? <p className="px-2 py-2 text-body3 text-gray-600">No courses found.</p> : null}
              </div>
            ) : null}
            {form.courseIds.length >= 2 ? (
              <button
                type="button"
                onClick={toggleAllCourses}
                className="ml-auto mt-2 block rounded px-2 py-1 text-body3 font-medium text-blue-500 hover:bg-blue-50 hover:text-blue-600"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>
        {errorMessage ? <p role="alert" className="mt-6 text-body2 text-orange-500">{errorMessage}</p> : null}
      </form>
      <button type="button" onClick={() => setShowDelete(true)} className="self-end px-10 text-body2 font-medium text-blue-500 hover:text-blue-400">Delete Promo code</button>
      <ConfirmationDialog
        open={showDelete}
        isConfirming={isDeleting}
        confirmFirst
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        message={
          promo?.code
            ? `Are you sure you want to delete this code (${promo.code})?`
            : "Are you sure you want to delete this code?"
        }
        confirmText="Yes, I want to delete the code"
        cancelText="No, keep it"
      />
    </main>
  );
}

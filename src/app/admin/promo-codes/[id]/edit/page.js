"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DeletePromoCodeDialog } from "@/components/admin/delete-promo-code-dialog";
import { Button } from "@/components/ui/button";
import { digitsOnly, normalizePromoCode, clampPercentDiscount } from "@/lib/promo-codes";

export default function EditPromoCodePage() {
  const { id } = useParams();
  const router = useRouter();
  const [promo, setPromo] = useState(null);
  const [form, setForm] = useState({ code: "", minPurchaseAmount: "", discountType: "thb", discountValue: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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
        });
      })
      .catch((error) => setErrorMessage(error.message));
  }, [id]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
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
          <label className="block"><span className="mb-1.5 block text-body2">Minimum purchase amount (THB)*</span><input required inputMode="numeric" value={form.minPurchaseAmount} onChange={(event) => setField("minPurchaseAmount", digitsOnly(event.target.value))} className="h-12 w-full rounded-lg border border-gray-400 px-3 text-body2" /></label>
          <fieldset className="col-span-2"><legend className="mb-3 text-body2">Select discount type*</legend><div className="grid grid-cols-2 gap-10">
            <label className="flex items-center gap-3"><input type="radio" checked={form.discountType === "thb"} onChange={() => setField("discountType", "thb")} className="size-5 accent-blue-500" /><span className="whitespace-nowrap text-gray-800">Discount (THB)</span><input required={form.discountType === "thb"} inputMode="numeric" value={form.discountType === "thb" ? form.discountValue : ""} onChange={(event) => setField("discountValue", digitsOnly(event.target.value))} className="h-12 w-32 rounded-lg border border-gray-400 px-3 text-body2" /></label>
            <label className="flex items-center gap-3"><input type="radio" checked={form.discountType === "percent"} onChange={() => setField("discountType", "percent")} className="size-5 accent-blue-500" /><span className="whitespace-nowrap text-gray-800">Discount (%)</span><input required={form.discountType === "percent"} inputMode="numeric" placeholder="Percent" value={form.discountType === "percent" ? form.discountValue : ""} onChange={(event) => setField("discountValue", digitsOnly(event.target.value))} onBlur={() => form.discountType === "percent" && setField("discountValue", clampPercentDiscount(form.discountValue))} className="h-12 w-48 rounded-lg border border-gray-400 px-3 text-body2 placeholder:text-gray-500" /></label>
          </div></fieldset>
          <label className="col-span-2 block"><span className="mb-1.5 block text-body2">Courses Included</span><select disabled defaultValue="all" className="h-12 w-full rounded-lg border border-gray-400 bg-white px-3 text-body2"><option value="all">All courses</option></select></label>
        </div>
        {errorMessage ? <p role="alert" className="mt-6 text-body2 text-orange-500">{errorMessage}</p> : null}
      </form>
      <button type="button" onClick={() => setShowDelete(true)} className="self-end px-10 text-body2 font-medium text-blue-500 hover:text-blue-400">Delete Promo code</button>
      <DeletePromoCodeDialog open={showDelete} code={promo?.code} isDeleting={isDeleting} onOpenChange={setShowDelete} onConfirm={handleDelete} />
    </main>
  );
}

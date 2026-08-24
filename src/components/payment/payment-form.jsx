"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { formatPrice } from "@/lib/format";
import { toSatang } from "@/lib/mock-checkout";
import { createCardToken, createPromptPaySource, loadOmise } from "@/lib/omise-client";
import { normalizePromoCode } from "@/lib/promo-codes";
import { cn } from "@/lib/utils";

const METHOD_LABEL = {
  card: "Credit card / Debit card",
  qr: "QR Payment",
};

function VisaMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 24"
      className="h-5 w-8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="24" rx="3" fill="#1A1F71" />
      <path
        d="M17.2 15.8h-2.2l1.4-8.4h2.2l-1.4 8.4Zm8.6-8.2c-.4-.2-1.1-.4-2-.4-2.2 0-3.7 1.2-3.7 2.9 0 1.2 1.1 1.9 2 2.3.9.4 1.2.7 1.2 1.1 0 .6-.7.9-1.3.9-.9 0-1.4-.1-2.1-.5l-.3-.1-.3 1.8c.5.2 1.5.4 2.5.4 2.3 0 3.8-1.2 3.8-3 0-1-.6-1.8-2-2.4-.8-.4-1.3-.7-1.3-1.1 0-.4.4-.8 1.3-.8.8 0 1.3.2 1.7.3l.2.1.3-1.7Zm5.7 8.2h1.9l-1.7-8.4h-1.8c-.4 0-.8.2-1 .6l-3.1 7.8h2.2l.4-1.2h2.7l.4 1.2Zm-2.3-2.8.9-2.5.1-.3.5 2.8h-1.5Zm-11.5-5.6-1.8 6.4-.2-1c-.3-1.1-1.4-2.4-2.5-3l1.7 6.6h2.2l3.3-8.4h-2.2Z"
        fill="#fff"
      />
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 24"
      className="h-5 w-8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="24" rx="3" fill="#F5F5F5" />
      <circle cx="16" cy="12" r="7" fill="#EB001B" />
      <circle cx="24" cy="12" r="7" fill="#F79E1B" />
      <path
        d="M20 6.7a7 7 0 0 1 0 10.6 7 7 0 0 1 0-10.6Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function PaymentField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  className,
  endAddon,
}) {
  return (
    <Field className={cn("gap-0", className)}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <InputGroup
        className={cn(
          "h-12 min-h-12 rounded-lg border-gray-400 bg-white shadow-none",
          "has-[[data-slot=input-group-control]:focus-visible]:border-orange-100 has-[[data-slot=input-group-control]:focus-visible]:ring-0",
        )}
      >
        <InputGroupInput
          id={id}
          name={id}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-label={label}
          className="h-12 min-h-12 px-4 text-body2 text-gray-900 placeholder:text-gray-600"
          onChange={onChange}
        />
        {endAddon ? (
          <InputGroupAddon align="inline-end" className="gap-1.5 pr-3">
            {endAddon}
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </Field>
  );
}

function MethodOption({ id, value, method, label, children, onSelect }) {
  const selected = method === value;

  return (
    <div
      className={cn(
        "rounded-2xl border border-transparent",
        selected ? "bg-gray-100 p-5 sm:p-6" : "bg-transparent py-1",
      )}
    >
      <label className="flex cursor-pointer items-center gap-3">
        <input
          id={id}
          type="radio"
          name="paymentMethod"
          value={value}
          checked={selected}
          onChange={() => onSelect(value)}
          className="size-5 shrink-0 accent-blue-500"
        />
        <span className="text-body2 font-medium text-gray-900">{label}</span>
      </label>
      {selected && children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

function digitsOnly(value, maxLength) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function lettersOnly(value) {
  return value.replace(/[^\p{L}\s]/gu, "");
}

function formatExpiry(value) {
  const digits = digitsOnly(value, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function parseExpiry(value) {
  const [monthPart, yearPart] = String(value).split("/");
  if (!monthPart || !yearPart || yearPart.length < 2) return null;

  const expirationMonth = Number(monthPart);
  const year = Number(yearPart);
  if (!Number.isInteger(expirationMonth) || expirationMonth < 1 || expirationMonth > 12) {
    return null;
  }
  if (!Number.isInteger(year)) return null;

  return {
    expirationMonth,
    expirationYear: year < 100 ? 2000 + year : year,
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function PaymentForm({ course }) {
  const router = useRouter();
  const checkout = {
    courseId: course.id,
    title: course.title,
    subtotal: Number(course.price) || 0,
    coursePath: `/courses/${encodeURIComponent(course.courseCode || course.id)}`,
  };
  const [method, setMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [pendingChargeId, setPendingChargeId] = useState("");

  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const total = appliedPromo?.total ?? checkout.subtotal;

  useEffect(() => {
    loadOmise().catch(() => {});
  }, []);

  useEffect(() => {
    if (!pendingChargeId) return undefined;

    let cancelled = false;

    async function pollCharge() {
      const response = await fetch(`/api/payments/charges/${pendingChargeId}`);
      const data = await readJson(response);
      if (cancelled || !response.ok) return;

      if (data?.paid) {
        router.push(checkout.coursePath);
        router.refresh();
      }
    }

    const timer = setInterval(pollCharge, 3000);
    pollCharge();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pendingChargeId, checkout.coursePath, router]);

  async function handleApplyPromo(event) {
    event.preventDefault();
    setPromoError("");

    const code = normalizePromoCode(promoCode);
    if (!code) {
      setAppliedPromo(null);
      setPromoError("Enter a promo code.");
      return;
    }

    setIsApplyingPromo(true);

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          courseId: checkout.courseId,
          subtotal: checkout.subtotal,
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        setAppliedPromo(null);
        setPromoError(data?.error || "Failed to apply promo code.");
        return;
      }

      setAppliedPromo({
        code: data.code,
        discountAmount: data.discountAmount,
        total: data.total,
      });
      setPromoCode(data.code);
      setPromoError("");
    } catch {
      setAppliedPromo(null);
      setPromoError("Failed to apply promo code.");
    } finally {
      setIsApplyingPromo(false);
    }
  }

  function handlePromoInputChange(event) {
    setPromoCode(event.target.value);
    if (appliedPromo || promoError) {
      setAppliedPromo(null);
      setPromoError("");
    }
  }

  function selectMethod(nextMethod) {
    setMethod(nextMethod);
    setCheckoutError("");
    setCheckoutMessage("");
    if (nextMethod !== "qr") {
      setQrImage("");
      setPendingChargeId("");
    }
  }

  async function handlePlaceOrder(event) {
    event.preventDefault();
    setCheckoutError("");
    setCheckoutMessage("");

    setIsPlacingOrder(true);

    try {
      let omiseToken = "";
      let omiseSourceId = "";

      if (method === "card") {
        const parsedExpiry = parseExpiry(expiry);
        if (cardNumber.length < 13) {
          throw new Error("Enter a valid card number.");
        }
        if (!nameOnCard.trim()) {
          throw new Error("Enter the name on card.");
        }
        if (!parsedExpiry) {
          throw new Error("Enter expiry as MM/YY.");
        }
        if (cvv.length < 3) {
          throw new Error("Enter a valid CVV.");
        }

        const token = await createCardToken({
          number: cardNumber,
          name: nameOnCard.trim(),
          expirationMonth: parsedExpiry.expirationMonth,
          expirationYear: parsedExpiry.expirationYear,
          securityCode: cvv,
        });
        omiseToken = token.id;
      } else {
        const source = await createPromptPaySource({
          amountSatang: toSatang(total),
        });
        omiseSourceId = source.id;
      }

      const response = await fetch("/api/payments/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: method,
          courseId: checkout.courseId,
          promoCode: appliedPromo?.code || "",
          omiseToken,
          sourceId: omiseSourceId,
          omiseSourceId,
        }),
      });

      const data = await readJson(response);
      if (!response.ok) {
        if (response.status === 401) {
          router.push(
            `/login?next=${encodeURIComponent(`/payment?courseId=${checkout.courseId}`)}`,
          );
          return;
        }
        throw new Error(data?.error || "Payment failed.");
      }

      if (method === "qr") {
        setQrImage(data.qrImage || "");
        setPendingChargeId(data.chargeId || "");
        setCheckoutMessage("Scan the QR code with your banking app to pay.");
        return;
      }

      if (data.paid) {
        router.push(checkout.coursePath);
        router.refresh();
        return;
      }

      throw new Error("Payment was not completed.");
    } catch (error) {
      setCheckoutError(error.message || "Payment failed.");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-x-10">
      <section aria-labelledby="payment-methods-heading" className="min-w-0">
        <h2
          id="payment-methods-heading"
          className="text-body2 text-gray-700"
        >
          Select payment method
        </h2>

        <div className="mt-6 flex flex-col gap-4">
          <MethodOption
            id="method-card"
            value="card"
            method={method}
            label={METHOD_LABEL.card}
            onSelect={selectMethod}
          >
            <div className="flex flex-col gap-4">
              <PaymentField
                id="cardNumber"
                label="Card number"
                value={cardNumber}
                placeholder="Card number"
                autoComplete="cc-number"
                endAddon={
                  <>
                    <VisaMark />
                    <MastercardMark />
                  </>
                }
                inputMode="numeric"
                onChange={(event) =>
                  setCardNumber(digitsOnly(event.target.value, 19))
                }
              />
              <PaymentField
                id="nameOnCard"
                label="Name on card"
                value={nameOnCard}
                placeholder="Name on card"
                autoComplete="cc-name"
                onChange={(event) =>
                  setNameOnCard(lettersOnly(event.target.value))
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <PaymentField
                  id="expiry"
                  label="Expiry date"
                  value={expiry}
                  placeholder="MM/YY"
                  autoComplete="cc-exp"
                  inputMode="numeric"
                  onChange={(event) =>
                    setExpiry(formatExpiry(event.target.value))
                  }
                />
                <PaymentField
                  id="cvv"
                  label="CVV"
                  value={cvv}
                  placeholder="CVV"
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  onChange={(event) =>
                    setCvv(digitsOnly(event.target.value, 4))
                  }
                />
              </div>
            </div>
          </MethodOption>

          <MethodOption
            id="method-qr"
            value="qr"
            method={method}
            label={METHOD_LABEL.qr}
            onSelect={selectMethod}
          >
            <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-4 py-8">
              {qrImage ? (
                <img
                  src={qrImage}
                  alt="PromptPay QR code"
                  className="size-44 rounded-md border border-gray-300 bg-white object-contain p-2"
                />
              ) : (
                <div
                  role="img"
                  aria-label="QR code placeholder"
                  className="grid size-44 place-items-center rounded-md border border-gray-300 bg-white p-3"
                >
                  <div className="grid size-full grid-cols-5 grid-rows-5 gap-1">
                    {Array.from({ length: 25 }, (_, index) => (
                      <span
                        key={index}
                        className={cn(
                          "rounded-[1px] bg-gray-900",
                          [1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].includes(
                            index,
                          ) && "bg-white",
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
              <p className="text-center text-body3 text-gray-700">
                {qrImage
                  ? "Scan this QR code with your banking app to pay."
                  : "Place order to generate a PromptPay QR code."}
              </p>
            </div>
          </MethodOption>
        </div>
      </section>

      <aside className="rounded-lg bg-white p-6 shadow-card lg:sticky lg:top-8">
        <p className="text-body3 font-medium text-orange-500">Summary</p>

        <div className="mt-6">
          <p className="text-body3 text-gray-700">Subscription</p>
          <p className="mt-2 text-headline3 font-medium tracking-[-0.02em] text-black">
            {checkout.title}
          </p>
        </div>

        <form
          className="mt-6 flex gap-2"
          onSubmit={handleApplyPromo}
          noValidate
        >
          <InputGroup
            className={cn(
              "h-12 min-h-12 flex-1 rounded-lg border-gray-400 bg-white shadow-none",
              "has-[[data-slot=input-group-control]:focus-visible]:border-orange-100 has-[[data-slot=input-group-control]:focus-visible]:ring-0",
            )}
          >
            <InputGroupInput
              id="promoCode"
              name="promoCode"
              value={promoCode}
              placeholder="Promo code"
              aria-label="Promo code"
              disabled={isApplyingPromo || isPlacingOrder}
              className="h-12 min-h-12 px-4 text-body2 text-gray-900 placeholder:text-gray-600"
              onChange={handlePromoInputChange}
            />
          </InputGroup>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={isApplyingPromo || isPlacingOrder}
            className="h-12 min-h-12 shrink-0 rounded-lg border-transparent bg-gray-200 px-5 text-body2 text-gray-700 shadow-none hover:bg-gray-300"
          >
            {isApplyingPromo ? "Applying..." : "Apply"}
          </Button>
        </form>
        {promoError ? (
          <p className="mt-2 text-body4 text-orange-500" role="alert">
            {promoError}
          </p>
        ) : appliedPromo ? (
          <p className="mt-2 text-body4 text-gray-700" aria-live="polite">
            Applied:{" "}
            <span className="font-medium text-gray-900">{appliedPromo.code}</span>
          </p>
        ) : null}

        <div className="mt-6 h-px bg-gray-300" />

        <dl className="mt-6 flex flex-col gap-4 text-body2">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-700">Subtotal</dt>
            <dd className="text-gray-900">{formatPrice(checkout.subtotal)}</dd>
          </div>
          {discountAmount > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-gray-700">Discount</dt>
              <dd className="text-gray-900">-{formatPrice(discountAmount)}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-700">Payment method</dt>
            <dd className="text-right text-gray-900">{METHOD_LABEL[method]}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1">
            <dt className="text-headline3 font-medium text-gray-900">Total</dt>
            <dd className="text-headline3 font-medium text-gray-900">
              THB {formatPrice(total)}
            </dd>
          </div>
        </dl>

        {checkoutError ? (
          <p className="mt-4 text-body4 text-orange-500" role="alert">
            {checkoutError}
          </p>
        ) : checkoutMessage ? (
          <p className="mt-4 text-body4 text-gray-700" aria-live="polite">
            {checkoutMessage}
          </p>
        ) : null}

        <Button
          type="button"
          className="mt-8 w-full"
          disabled={isPlacingOrder}
          onClick={handlePlaceOrder}
        >
          {isPlacingOrder ? "Processing..." : "Place order"}
        </Button>
      </aside>
    </div>
  );
}

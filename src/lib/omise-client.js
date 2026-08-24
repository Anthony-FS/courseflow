const OMISE_SCRIPT_SRC = "https://cdn.omise.co/omise.js";

let omiseLoadPromise = null;

function getOmise() {
  if (typeof window === "undefined") return null;
  return window.Omise || null;
}

export function loadOmise() {
  const existing = getOmise();
  if (existing) {
    const publicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;
    if (!publicKey) {
      return Promise.reject(new Error("Missing Omise public key."));
    }
    existing.setPublicKey(publicKey);
    return Promise.resolve(existing);
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("Omise.js can only run in the browser."));
  }

  if (omiseLoadPromise) {
    return omiseLoadPromise;
  }

  omiseLoadPromise = new Promise((resolve, reject) => {
    const publicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;
    if (!publicKey) {
      reject(new Error("Missing Omise public key."));
      return;
    }

    const script = document.createElement("script");
    script.src = OMISE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const Omise = getOmise();
      if (!Omise) {
        reject(new Error("Omise.js loaded without Omise global."));
        return;
      }
      Omise.setPublicKey(publicKey);
      resolve(Omise);
    };
    script.onerror = () => {
      omiseLoadPromise = null;
      reject(new Error("Failed to load Omise.js."));
    };
    document.head.appendChild(script);
  });

  return omiseLoadPromise;
}

export async function createCardToken({
  number,
  name,
  expirationMonth,
  expirationYear,
  securityCode,
}) {
  const Omise = await loadOmise();

  return new Promise((resolve, reject) => {
    Omise.createToken(
      "card",
      {
        number,
        name,
        expiration_month: expirationMonth,
        expiration_year: expirationYear,
        security_code: securityCode,
      },
      (statusCode, response) => {
        if (statusCode === 200 && response?.id) {
          resolve(response);
          return;
        }
        reject(
          new Error(response?.message || "Could not tokenize this card."),
        );
      },
    );
  });
}

export async function createPromptPaySource({ amountSatang, currency = "THB" }) {
  const Omise = await loadOmise();

  return new Promise((resolve, reject) => {
    Omise.createSource(
      "promptpay",
      {
        amount: amountSatang,
        currency,
      },
      (statusCode, response) => {
        if (statusCode === 200 && response?.id) {
          resolve(response);
          return;
        }
        reject(
          new Error(response?.message || "Could not create PromptPay source."),
        );
      },
    );
  });
}

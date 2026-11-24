export const PAYMENT_STATUSES = Object.freeze([
  "created",
  "pending",
  "verification_required",
  "succeeded",
  "failed",
  "cancelled",
  "expired"
]);

const TRANSITIONS = Object.freeze({
  created: new Set(["pending", "failed", "cancelled"]),
  pending: new Set(["verification_required", "succeeded", "failed", "cancelled", "expired"]),
  verification_required: new Set(["pending", "succeeded", "failed", "cancelled", "expired"]),
  succeeded: new Set(),
  failed: new Set(),
  cancelled: new Set(),
  expired: new Set()
});

/**
 * Convert a decimal BDT amount to integer poisha without floating-point math.
 * Accepts strings only so browser numbers cannot introduce rounding surprises.
 */
export function bdtToPoisha(amount) {
  if (typeof amount !== "string" || !/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(amount)) {
    throw new TypeError("Amount must be a decimal BDT string with at most 2 fractional digits.");
  }

  const [taka, fraction = ""] = amount.split(".");
  const poisha = Number(taka) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(poisha) || poisha <= 0) {
    throw new RangeError("Amount must be greater than zero and within the supported range.");
  }
  return poisha;
}

export function poishaToBdt(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RangeError("Amount must be a positive integer number of poisha.");
  }
  const taka = Math.floor(amount / 100);
  const poisha = String(amount % 100).padStart(2, "0");
  return `${taka}.${poisha}`;
}

export function canTransitionPayment(from, to) {
  return Boolean(TRANSITIONS[from]?.has(to));
}

export function assertPaymentTransition(from, to) {
  if (!canTransitionPayment(from, to)) {
    const error = new Error(`Invalid payment status transition: ${from} -> ${to}`);
    error.code = "INVALID_PAYMENT_TRANSITION";
    throw error;
  }
  return to;
}

export function mapBkashStatus(response) {
  const status = String(response?.transactionStatus || "").toLowerCase();
  if (status === "completed" || status === "success") return "succeeded";
  if (status === "failed") return "failed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "expired") return "expired";
  return "verification_required";
}

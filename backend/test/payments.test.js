import test from "node:test";
import assert from "node:assert/strict";
import {
  assertPaymentTransition,
  bdtToPoisha,
  canTransitionPayment,
  mapBkashStatus,
  poishaToBdt
} from "../src/payments/domain.js";
import { getBkashSandboxConfig, isBkashSandboxConfigured } from "../src/payments/config.js";

test("converts BDT decimal strings to integer poisha exactly", () => {
  assert.equal(bdtToPoisha("1"), 100);
  assert.equal(bdtToPoisha("1.2"), 120);
  assert.equal(bdtToPoisha("125.09"), 12509);
  assert.equal(poishaToBdt(12509), "125.09");
});

test("rejects unsafe or malformed BDT amounts", () => {
  for (const value of [1, 0, "0", "-1", "1.001", "01.00", "1e2", " 1.00", ""]) {
    assert.throws(() => bdtToPoisha(value));
  }
});

test("allows only forward payment status transitions", () => {
  assert.equal(canTransitionPayment("created", "pending"), true);
  assert.equal(canTransitionPayment("pending", "succeeded"), true);
  assert.equal(canTransitionPayment("succeeded", "pending"), false);
  assert.equal(canTransitionPayment("failed", "succeeded"), false);
  assert.throws(() => assertPaymentTransition("succeeded", "pending"), {
    code: "INVALID_PAYMENT_TRANSITION"
  });
});

test("unknown provider outcomes require verification rather than success", () => {
  assert.equal(mapBkashStatus({ transactionStatus: "Completed" }), "succeeded");
  assert.equal(mapBkashStatus({ transactionStatus: "Failed" }), "failed");
  assert.equal(mapBkashStatus({ transactionStatus: "processing" }), "verification_required");
  assert.equal(mapBkashStatus({}), "verification_required");
});

test("bKash configuration is Sandbox-only and secrets stay server-side", () => {
  const env = {
    BKASH_ENV: "sandbox",
    BKASH_USERNAME: "sandbox-user",
    BKASH_PASSWORD: "sandbox-password",
    BKASH_APP_KEY: "sandbox-app-key",
    BKASH_APP_SECRET: "sandbox-app-secret"
  };
  const config = getBkashSandboxConfig(env);
  assert.equal(config.environment, "sandbox");
  assert.equal(config.currency, "BDT");
  assert.equal(isBkashSandboxConfigured(env), true);
  assert.throws(() => getBkashSandboxConfig({ ...env, BKASH_ENV: "live" }), {
    code: "BKASH_LIVE_DISABLED"
  });
  assert.throws(() => getBkashSandboxConfig({ BKASH_ENV: "sandbox" }), {
    code: "BKASH_NOT_CONFIGURED"
  });
});

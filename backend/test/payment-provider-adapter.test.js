import test from "node:test";
import assert from "node:assert/strict";
import {
  createBkashSandboxAdapter,
  BKASH_PROVIDER_CONTRACT_REQUIRED
} from "../src/payments/provider-adapter.js";

test("bKash adapter exposes the planned provider operations", () => {
  const adapter = createBkashSandboxAdapter();
  for (const operation of [
    "grantToken",
    "refreshToken",
    "createPayment",
    "executePayment",
    "queryPayment",
    "searchTransaction",
    "refund"
  ]) {
    assert.equal(typeof adapter[operation], "function");
  }
});

test("all provider operations fail closed without a verified merchant contract", async () => {
  const adapter = createBkashSandboxAdapter();
  for (const operation of [
    "grantToken",
    "refreshToken",
    "createPayment",
    "executePayment",
    "queryPayment",
    "searchTransaction",
    "refund"
  ]) {
    await assert.rejects(adapter[operation](), (error) => {
      assert.equal(error.code, BKASH_PROVIDER_CONTRACT_REQUIRED);
      assert.equal(error.operation, operation);
      return true;
    });
  }
});

test("adapter is immutable", () => {
  const adapter = createBkashSandboxAdapter();
  assert.equal(Object.isFrozen(adapter), true);
});

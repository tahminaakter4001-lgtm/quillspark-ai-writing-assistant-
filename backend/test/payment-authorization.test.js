import test from "node:test";
import assert from "node:assert/strict";
import {
  isPaymentOwner,
  requireAdminPrincipal,
  requireCustomerPrincipal
} from "../src/payments/authorization.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("customer guard rejects requests without a verified principal", () => {
  const res = responseRecorder();
  let called = false;
  requireCustomerPrincipal({}, res, () => { called = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, "CUSTOMER_AUTH_REQUIRED");
  assert.equal(called, false);
});

test("customer guard derives customer ID only from verified request principal", () => {
  const req = { auth: { userId: "customer-123", roles: [] } };
  const res = responseRecorder();
  let called = false;
  requireCustomerPrincipal(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.customerId, "customer-123");
});

test("admin guard rejects missing principal and non-admin role", () => {
  const missing = responseRecorder();
  requireAdminPrincipal({}, missing, () => assert.fail("next must not run"));
  assert.equal(missing.statusCode, 401);

  const customer = responseRecorder();
  requireAdminPrincipal({ auth: { userId: "customer-123", roles: ["customer"] } }, customer, () => assert.fail("next must not run"));
  assert.equal(customer.statusCode, 403);
  assert.equal(customer.body.error.code, "ADMIN_ROLE_REQUIRED");
});

test("admin guard allows only a principal with the admin role", () => {
  const req = { auth: { userId: "admin-1", roles: ["admin"] } };
  const res = responseRecorder();
  let called = false;
  requireAdminPrincipal(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.adminId, "admin-1");
});

test("payment ownership compares stored customer ID to verified principal", () => {
  const payment = { customer_id: "customer-123" };
  assert.equal(isPaymentOwner(payment, { userId: "customer-123" }), true);
  assert.equal(isPaymentOwner(payment, { userId: "customer-456" }), false);
  assert.equal(isPaymentOwner(payment, null), false);
  assert.equal(isPaymentOwner(null, { userId: "customer-123" }), false);
});

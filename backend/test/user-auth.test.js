import test from "node:test";
import assert from "node:assert/strict";
import {
  getSessionCookieName,
  hashOpaqueToken,
  hashPassword,
  isCsrfTokenValid,
  normalizeEmail,
  verifyPassword
} from "../src/user-auth.js";

test("normalizes email addresses consistently", () => {
  assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
  assert.equal(normalizeEmail(null), "");
});

test("passwords are stored as salted scrypt hashes and verified", async () => {
  const encoded = await hashPassword("a-long-test-password");
  assert.match(encoded, /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal(await verifyPassword("a-long-test-password", encoded), true);
  assert.equal(await verifyPassword("different-password", encoded), false);
  assert.notEqual(await hashPassword("a-long-test-password"), encoded);
});

test("rejects passwords outside the configured policy", async () => {
  await assert.rejects(hashPassword("short"), { code: "PASSWORD_POLICY" });
});

test("opaque tokens are one-way hashed and CSRF validation is exact", () => {
  const token = "random-csrf-token";
  const hash = hashOpaqueToken(token);
  assert.notEqual(hash, token);
  assert.equal(isCsrfTokenValid(token, hash), true);
  assert.equal(isCsrfTokenValid("other-token", hash), false);
});

test("production uses a Secure-compatible host cookie name", () => {
  assert.equal(getSessionCookieName({ NODE_ENV: "production" }), "__Host-qs_session");
  assert.equal(getSessionCookieName({ NODE_ENV: "development" }), "qs_session");
});

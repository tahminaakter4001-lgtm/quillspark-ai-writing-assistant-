import test from "node:test";
import assert from "node:assert/strict";
import { createSessionAuthMiddleware } from "../src/user-auth-middleware.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function request(headers = {}) {
  return {
    get(name) { return headers[name.toLowerCase()] || ""; }
  };
}

test("session middleware rejects requests without a session cookie", async () => {
  const middleware = createSessionAuthMiddleware({ findSession: async () => null, cookieName: "qs_session" });
  const res = responseRecorder();
  let called = false;
  await middleware.requireUserSession(request(), res, () => { called = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, "LOGIN_REQUIRED");
  assert.equal(called, false);
});

test("session middleware maps a verified customer session to req.auth", async () => {
  const middleware = createSessionAuthMiddleware({
    findSession: async (token) => token === "valid-session"
      ? { id: "user-1", role: "customer", csrf_hash: "csrf-hash" }
      : null,
    cookieName: "qs_session"
  });
  const req = request({ cookie: "qs_session=valid-session" });
  const res = responseRecorder();
  let called = false;
  await middleware.requireUserSession(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.deepEqual(req.auth, { userId: "user-1", roles: ["customer"] });
  assert.equal(req.userSession.id, "user-1");
});

test("session middleware rejects unknown roles", async () => {
  const middleware = createSessionAuthMiddleware({
    findSession: async () => ({ id: "user-1", role: "owner" }),
    cookieName: "qs_session"
  });
  const res = responseRecorder();
  await middleware.requireUserSession(request({ cookie: "qs_session=valid" }), res, () => assert.fail());
  assert.equal(res.statusCode, 401);
});

test("CSRF middleware requires matching cookie, header and verified stored hash", async () => {
  const middleware = createSessionAuthMiddleware({
    findSession: async () => null,
    cookieName: "qs_session",
    validateCsrf: (candidate, hash) => candidate === "csrf-good" && hash === "stored-hash"
  });
  const req = request({ cookie: "qs_csrf=csrf-good", "x-csrf-token": "csrf-good" });
  req.userSession = { csrf_hash: "stored-hash" };
  const res = responseRecorder();
  let called = false;
  middleware.requireCsrf(req, res, () => { called = true; });
  assert.equal(called, true);

  const invalid = request({ cookie: "qs_csrf=csrf-good", "x-csrf-token": "csrf-bad" });
  invalid.userSession = { csrf_hash: "stored-hash" };
  const invalidRes = responseRecorder();
  middleware.requireCsrf(invalid, invalidRes, () => assert.fail());
  assert.equal(invalidRes.statusCode, 403);
});

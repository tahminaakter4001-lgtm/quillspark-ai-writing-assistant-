import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyQuillSparkSession } from "../src/manus-auth.js";

function token(claims, secret = "test-secret-that-is-at-least-32-characters") {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(header + "." + payload).digest("base64url");
  return header + "." + payload + "." + signature;
}

const env = {
  QUILLSPARK_SESSION_JWT_SECRET: "test-secret-that-is-at-least-32-characters",
  QUILLSPARK_SESSION_JWT_ISSUER: "quillspark",
  QUILLSPARK_SESSION_JWT_AUDIENCE: "quillspark-dashboard"
};

test("accepts a correctly signed, unexpired QuillSpark session", () => {
  const jwt = token({ sub: "user-123", tenant_id: "tenant-a", exp: 2000, iss: "quillspark", aud: "quillspark-dashboard" });
  assert.deepEqual(verifyQuillSparkSession(jwt, env, 1000), { userId: "user-123", tenantId: "tenant-a" });
});

test("rejects expired, wrong-issuer, and invalid-signature sessions", () => {
  assert.equal(verifyQuillSparkSession(token({ sub: "user-123", exp: 900, iss: "quillspark", aud: "quillspark-dashboard" }), env, 1000), null);
  assert.equal(verifyQuillSparkSession(token({ sub: "user-123", exp: 2000, iss: "other", aud: "quillspark-dashboard" }), env, 1000), null);
  const valid = token({ sub: "user-123", exp: 2000, iss: "quillspark", aud: "quillspark-dashboard" });
  assert.equal(verifyQuillSparkSession(valid.slice(0, -1) + "x", env, 1000), null);
});

test("rejects tokens when the session signing secret is not configured", () => {
  const jwt = token({ sub: "user-123", exp: 2000 });
  assert.equal(verifyQuillSparkSession(jwt, {}, 1000), null);
});

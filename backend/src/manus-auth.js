import { createHmac, timingSafeEqual } from "node:crypto";

function decodePart(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function verifyQuillSparkSession(token, env = process.env, nowSeconds = Math.floor(Date.now() / 1000)) {
  const secret = env.QUILLSPARK_SESSION_JWT_SECRET;
  if (!secret || secret.length < 32 || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(decodePart(parts[0]));
    const claims = JSON.parse(decodePart(parts[1]));
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const expected = createHmac("sha256", secret).update(parts[0] + "." + parts[1]).digest();
    const supplied = Buffer.from(parts[2], "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    if (!claims.sub || typeof claims.sub !== "string") return null;
    if (!Number.isFinite(claims.exp) || claims.exp <= nowSeconds) return null;
    if (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > nowSeconds + 30)) return null;
    if (env.QUILLSPARK_SESSION_JWT_ISSUER && claims.iss !== env.QUILLSPARK_SESSION_JWT_ISSUER) return null;
    if (env.QUILLSPARK_SESSION_JWT_AUDIENCE) {
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!aud.includes(env.QUILLSPARK_SESSION_JWT_AUDIENCE)) return null;
    }
    return { userId: claims.sub, tenantId: typeof claims.tenant_id === "string" ? claims.tenant_id : null };
  } catch { return null; }
}

export function requireQuillSparkSession(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const session = verifyQuillSparkSession(token);
  if (!session) return res.status(401).json({ error: { code: "SESSION_REQUIRED", message: "A valid QuillSpark user session is required." } });
  req.quillsparkUser = session;
  return next();
}

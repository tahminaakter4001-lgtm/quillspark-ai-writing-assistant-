import { getSessionCookieName, isCsrfTokenValid } from "./user-auth.js";

function readCookie(req, name) {
  const header = req.get("cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); }
      catch { return ""; }
    }
  }
  return "";
}

export function createSessionAuthMiddleware({
  findSession,
  cookieName = getSessionCookieName(),
  validateCsrf = isCsrfTokenValid
}) {
  if (typeof findSession !== "function") {
    throw new TypeError("findSession must be a function.");
  }

  async function requireUserSession(req, res, next) {
    try {
      const token = readCookie(req, cookieName);
      if (!token) {
        return res.status(401).json({
          error: { code: "LOGIN_REQUIRED", message: "A verified customer session is required." }
        });
      }
      const session = await findSession(token);
      if (!session || !session.id || !["customer", "admin"].includes(session.role)) {
        return res.status(401).json({
          error: { code: "LOGIN_REQUIRED", message: "A verified customer session is required." }
        });
      }
      req.userSession = session;
      req.auth = {
        userId: session.id,
        roles: [session.role]
      };
      return next();
    } catch (error) {
      return next(error);
    }
  }

  function requireCsrf(req, res, next) {
    const cookieToken = readCookie(req, "qs_csrf");
    const headerToken = req.get("x-csrf-token") || "";
    const expectedHash = req.userSession?.csrf_hash;
    if (!cookieToken || !headerToken || cookieToken !== headerToken ||
        !validateCsrf(headerToken, expectedHash)) {
      return res.status(403).json({
        error: { code: "CSRF_VALIDATION_FAILED", message: "CSRF validation failed." }
      });
    }
    return next();
  }

  return { requireUserSession, requireCsrf };
}

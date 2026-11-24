import { Router } from "express";
import { z } from "zod";
import {
  authenticateCustomer,
  createUserSession,
  findUserSession,
  getSessionCookieName,
  isCsrfTokenValid,
  registerCustomer,
  revokeUserSession
} from "./user-auth.js";

const router = Router();
const credentialsSchema = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(12).max(128)
});
const isProduction = process.env.NODE_ENV === "production";
const cookieName = getSessionCookieName();

function cookieOptions(maxAge) {
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(isProduction ? ["Secure"] : []),
    `Max-Age=${maxAge}`
  ].join("; ");
}

function readCookie(req, name) {
  const header = req.get("cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return "";
}

function setSessionCookies(res, session) {
  res.append("Set-Cookie", `${cookieName}=${encodeURIComponent(session.sessionToken)}; ${cookieOptions(14 * 24 * 60 * 60)}`);
  res.append("Set-Cookie", `qs_csrf=${encodeURIComponent(session.csrfToken)}; Path=/; SameSite=Lax;${isProduction ? " Secure;" : ""} Max-Age=${14 * 24 * 60 * 60}`);
}

function clearSessionCookies(res) {
  res.append("Set-Cookie", `${cookieName}=; ${cookieOptions(0)}`);
  res.append("Set-Cookie", `qs_csrf=; Path=/; SameSite=Lax;${isProduction ? " Secure;" : ""} Max-Age=0`);
}

async function currentSession(req) {
  const token = readCookie(req, cookieName);
  if (!token) return null;
  const session = await findUserSession(token);
  return session ? { token, session } : null;
}

router.post("/register", async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const user = await registerCustomer(input.email, input.password);
    const session = await createUserSession(user.id);
    setSessionCookies(res, session);
    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role },
      csrf_token: session.csrfToken,
      expires_at: session.expiresAt
    });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const user = await authenticateCustomer(input.email, input.password);
    const session = await createUserSession(user.id);
    setSessionCookies(res, session);
    res.json({
      user,
      csrf_token: session.csrfToken,
      expires_at: session.expiresAt
    });
  } catch (error) { next(error); }
});

router.get("/me", async (req, res, next) => {
  try {
    const current = await currentSession(req);
    if (!current) return res.status(401).json({ error: { code: "LOGIN_REQUIRED", message: "Please sign in." } });
    return res.json({
      user: { id: current.session.id, email: current.session.email, role: current.session.role },
      expires_at: current.session.expires_at
    });
  } catch (error) { next(error); }
});

router.post("/logout", async (req, res, next) => {
  try {
    const current = await currentSession(req);
    if (current) {
      const csrfCookie = readCookie(req, "qs_csrf");
      const csrfHeader = req.get("x-csrf-token") || "";
      if (!csrfCookie || csrfCookie !== csrfHeader ||
          !isCsrfTokenValid(csrfHeader, current.session.csrf_hash)) {
        return res.status(403).json({ error: { code: "CSRF_VALIDATION_FAILED", message: "CSRF validation failed." } });
      }
      await revokeUserSession(current.token);
    }
    clearSessionCookies(res);
    return res.status(204).end();
  } catch (error) { next(error); }
});

export default router;

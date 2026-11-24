import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";
import { pool } from "./db.js";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128) {
    const error = new Error("Password must be between 12 and 128 characters.");
    error.code = "PASSWORD_POLICY";
    throw error;
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== "string" || typeof encoded !== "string") return false;
  const [algorithm, saltHex, keyHex] = encoded.split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/i.test(saltHex || "") ||
      !/^[a-f0-9]{128}$/i.test(keyHex || "")) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashOpaqueToken(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function registerCustomer(emailInput, password) {
  if (!pool) {
    const error = new Error("Customer authentication requires DATABASE_URL.");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }
  const email = normalizeEmail(emailInput);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    const error = new Error("Enter a valid email address.");
    error.code = "INVALID_EMAIL";
    throw error;
  }
  const passwordHash = await hashPassword(password);
  const id = randomUUID();
  try {
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, email, role, created_at`,
      [id, email, passwordHash]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      const conflict = new Error("An account with this email already exists.");
      conflict.code = "EMAIL_ALREADY_REGISTERED";
      throw conflict;
    }
    throw error;
  }
}

export async function authenticateCustomer(emailInput, password) {
  if (!pool) {
    const error = new Error("Customer authentication requires DATABASE_URL.");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }
  const email = normalizeEmail(emailInput);
  const result = await pool.query(
    "SELECT id, email, password_hash, role FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  // Perform a password hash even for unknown emails to reduce account enumeration timing.
  const fallback = "scrypt:00000000000000000000000000000000:".concat("0".repeat(128));
  const valid = await verifyPassword(password, user?.password_hash || fallback);
  if (!user || !valid) {
    const error = new Error("Email or password is incorrect.");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }
  return { id: user.id, email: user.email, role: user.role };
}

export async function createUserSession(userId) {
  if (!pool) {
    const error = new Error("Customer authentication requires DATABASE_URL.");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }
  const sessionToken = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    `INSERT INTO user_sessions (id, user_id, token_hash, csrf_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), userId, hashOpaqueToken(sessionToken), hashOpaqueToken(csrfToken), expiresAt]
  );
  return { sessionToken, csrfToken, expiresAt };
}

export async function findUserSession(sessionToken) {
  if (!pool || typeof sessionToken !== "string" || sessionToken.length > 256) return null;
  const result = await pool.query(
    `SELECT u.id, u.email, u.role, s.csrf_hash, s.expires_at
     FROM user_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
    [hashOpaqueToken(sessionToken)]
  );
  return result.rows[0] || null;
}

export async function revokeUserSession(sessionToken) {
  if (!pool || typeof sessionToken !== "string" || sessionToken.length > 256) return;
  await pool.query(
    "UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL",
    [hashOpaqueToken(sessionToken)]
  );
}

export function isCsrfTokenValid(candidate, expectedHash) {
  if (typeof candidate !== "string" || typeof expectedHash !== "string") return false;
  const actual = Buffer.from(hashOpaqueToken(candidate), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getSessionCookieName(env = process.env) {
  return env.NODE_ENV === "production" ? "__Host-qs_session" : "qs_session";
}

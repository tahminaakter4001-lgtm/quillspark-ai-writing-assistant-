import { timingSafeEqual } from "node:crypto";

export function isValidServiceToken(candidate, expected) {
  if (typeof candidate !== "string" || typeof expected !== "string") return false;
  const supplied = Buffer.from(candidate, "utf8");
  const configured = Buffer.from(expected, "utf8");
  if (supplied.length !== configured.length || configured.length < 32) return false;
  return timingSafeEqual(supplied, configured);
}

export function requireServiceAuth(req, res, next) {
  const expected = process.env.QUILLSPARK_API_TOKEN;
  const header = req.get("authorization") || "";
  const candidate = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!expected || !isValidServiceToken(candidate, expected)) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "A valid service token is required." }
    });
  }
  return next();
}

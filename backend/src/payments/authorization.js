/**
 * Authorization primitives for payment routes.
 *
 * IMPORTANT: These guards trust req.auth only when a verified session/authentication
 * adapter has populated it earlier in the Express middleware chain. Never populate
 * req.auth from request body, query parameters, or unverified headers.
 * These guards are intentionally not mounted until QuillSpark's real login provider
 * and its verified principal contract are confirmed.
 */

function getPrincipal(req) {
  const principal = req?.auth;
  if (!principal || typeof principal !== "object") return null;
  const userId = principal.userId;
  if (typeof userId !== "string" || !userId.trim() || userId.length > 128) return null;
  return principal;
}

export function requireCustomerPrincipal(req, res, next) {
  const principal = getPrincipal(req);
  if (!principal) {
    return res.status(401).json({
      error: { code: "CUSTOMER_AUTH_REQUIRED", message: "A verified customer session is required." }
    });
  }
  req.customerId = principal.userId;
  return next();
}

export function requireAdminPrincipal(req, res, next) {
  const principal = getPrincipal(req);
  if (!principal) {
    return res.status(401).json({
      error: { code: "ADMIN_AUTH_REQUIRED", message: "A verified administrator session is required." }
    });
  }
  const roles = Array.isArray(principal.roles) ? principal.roles : [];
  if (!roles.includes("admin")) {
    return res.status(403).json({
      error: { code: "ADMIN_ROLE_REQUIRED", message: "Administrator permission is required." }
    });
  }
  req.adminId = principal.userId;
  return next();
}

export function isPaymentOwner(payment, principal) {
  return Boolean(
    payment &&
    principal &&
    typeof principal.userId === "string" &&
    payment.customer_id === principal.userId
  );
}

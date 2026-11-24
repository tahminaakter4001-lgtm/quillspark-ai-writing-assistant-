import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { findUserSession } from "../user-auth.js";
import { createSessionAuthMiddleware } from "../user-auth-middleware.js";
import { requireCustomerPrincipal } from "./authorization.js";

const router = Router();
const { requireUserSession } = createSessionAuthMiddleware({
  findSession: findUserSession
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0)
});

const paymentIdSchema = z.string().uuid();

function databaseUnavailable(res) {
  return res.status(503).json({
    error: {
      code: "DATABASE_NOT_CONFIGURED",
      message: "Payment history is not available until the database is configured."
    }
  });
}

// Customer payment-history routes use a verified QuillSpark browser session.
// They intentionally do not use the service-to-service API token.
router.use(requireUserSession, requireCustomerPrincipal);

router.get("/", async (req, res, next) => {
  if (!pool) return databaseUnavailable(res);

  try {
    const { limit, offset } = paginationSchema.parse(req.query);
    const result = await pool.query(
      `SELECT id, product_code, amount_poisha, currency, status,
              created_at, updated_at, verified_at
       FROM payments
       WHERE customer_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [req.customerId, limit, offset]
    );
    return res.json({ payments: result.rows, pagination: { limit, offset } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:paymentId", async (req, res, next) => {
  if (!pool) return databaseUnavailable(res);

  try {
    const paymentId = paymentIdSchema.parse(req.params.paymentId);
    const result = await pool.query(
      `SELECT id, product_code, amount_poisha, currency, status,
              created_at, updated_at, verified_at
       FROM payments
       WHERE id = $1 AND customer_id = $2`,
      [paymentId, req.customerId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({
        error: { code: "PAYMENT_NOT_FOUND", message: "The payment was not found." }
      });
    }
    return res.json({ payment: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

export default router;

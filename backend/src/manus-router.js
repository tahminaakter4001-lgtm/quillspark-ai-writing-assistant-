import express from "express";
import { createHash, createVerify } from "node:crypto";
import { z } from "zod";
import { requireQuillSparkSession } from "./manus-auth.js";
import { manusRequest, normalizeManusMessages } from "./manus-service.js";
import { pool } from "./db.js";

export const manusRouter = express.Router();
export const manusWebhookRouter = express.Router();

const createSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  prompt: z.string().trim().min(1).max(12000),
  locale: z.enum(["en", "bn"]).default("en"),
  interactiveMode: z.boolean().default(false)
});
const messageSchema = z.object({ message: z.string().trim().min(1).max(12000) });
const confirmSchema = z.object({
  event_id: z.string().min(1).max(200),
  input: z.record(z.string(), z.unknown()),
  confirmed_by_user: z.literal(true)
});

function requireDatabase(res) {
  if (pool) return true;
  res.status(503).json({ error: { code: "DATABASE_NOT_CONFIGURED", message: "Manus task tracking requires DATABASE_URL." } });
  return false;
}
async function ownedTask(user, taskId) {
  const result = await pool.query(
    "SELECT * FROM manus_tasks WHERE provider_task_id = $1 AND owner_user_id = $2 AND tenant_id IS NOT DISTINCT FROM $3",
    [taskId, user.userId, user.tenantId]
  );
  return result.rows[0] || null;
}

manusRouter.use(requireQuillSparkSession);

manusRouter.post("/tasks", async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const input = createSchema.parse(req.body);
    const provider = await manusRequest("/v2/task.create", {
      method: "POST",
      body: {
        title: input.title,
        message: { content: input.prompt },
        locale: input.locale,
        interactive_mode: input.interactiveMode,
        share_visibility: "private"
      }
    });
    await pool.query(
      `INSERT INTO manus_tasks
       (owner_user_id, tenant_id, provider_task_id, title, task_url, status, prompt_digest)
       VALUES ($1, $2, $3, $4, $5, 'running', $6)`,
      [req.quillsparkUser.userId, req.quillsparkUser.tenantId, provider.task_id,
       provider.task_title || input.title || "Manus task", provider.task_url,
       createHash("sha256").update(input.prompt).digest("hex")]
    );
    return res.status(201).json({
      taskId: provider.task_id,
      title: provider.task_title || input.title || "Manus task",
      taskUrl: provider.task_url,
      status: "running"
    });
  } catch (error) { return next(error); }
});

manusRouter.get("/tasks", async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const result = await pool.query(
      `SELECT provider_task_id AS "taskId", title, task_url AS "taskUrl", status,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM manus_tasks WHERE owner_user_id = $1 AND tenant_id IS NOT DISTINCT FROM $2
       ORDER BY created_at DESC LIMIT $3`,
      [req.quillsparkUser.userId, req.quillsparkUser.tenantId, limit]
    );
    return res.json({ tasks: result.rows });
  } catch (error) { return next(error); }
});

manusRouter.get("/tasks/:taskId", async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const task = await ownedTask(req.quillsparkUser, req.params.taskId);
    if (!task) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
    const provider = await manusRequest("/v2/task.listMessages", {
      query: { task_id: task.provider_task_id, order: "desc", limit: 20 }
    });
    const state = normalizeManusMessages(provider);
    await pool.query(
      "UPDATE manus_tasks SET status = $1, result_summary = $2, updated_at = NOW(), completed_at = CASE WHEN $1 IN ('completed','failed') THEN NOW() ELSE completed_at END WHERE provider_task_id = $3",
      [state.status, state.result || state.failure || state.progress, task.provider_task_id]
    );
    return res.json({ taskId: task.provider_task_id, title: task.title, taskUrl: task.task_url, ...state });
  } catch (error) { return next(error); }
});

manusRouter.post("/tasks/:taskId/messages", async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const task = await ownedTask(req.quillsparkUser, req.params.taskId);
    if (!task) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
    const input = messageSchema.parse(req.body);
    await manusRequest("/v2/task.sendMessage", {
      method: "POST",
      body: { task_id: task.provider_task_id, message: input.message }
    });
    return res.status(202).json({ accepted: true, taskId: task.provider_task_id });
  } catch (error) { return next(error); }
});

manusRouter.post("/tasks/:taskId/confirm", async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const task = await ownedTask(req.quillsparkUser, req.params.taskId);
    if (!task) return res.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
    const input = confirmSchema.parse(req.body);
    await manusRequest("/v2/task.confirmAction", {
      method: "POST",
      body: { task_id: task.provider_task_id, event_id: input.event_id, input: input.input }
    });
    return res.status(202).json({ accepted: true, taskId: task.provider_task_id });
  } catch (error) { return next(error); }
});

let cachedPublicKey = null;
let publicKeyExpiresAt = 0;
async function getManusWebhookPublicKey() {
  if (cachedPublicKey && Date.now() < publicKeyExpiresAt) return cachedPublicKey;
  const response = await manusRequest("/v2/webhook.publicKey");
  if (typeof response.public_key !== "string" || !response.public_key.includes("BEGIN PUBLIC KEY")) {
    throw new Error("Invalid Manus webhook public key response.");
  }
  cachedPublicKey = response.public_key;
  publicKeyExpiresAt = Date.now() + 60 * 60 * 1000;
  return cachedPublicKey;
}

manusWebhookRouter.post("/manus", express.raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
  try {
    const configuredUrl = process.env.MANUS_WEBHOOK_PUBLIC_URL;
    if (!configuredUrl || !configuredUrl.startsWith("https://") ||
        new URL(configuredUrl).pathname !== "/api/webhooks/manus") {
      return res.status(503).json({ error: "Webhook endpoint is not configured." });
    }
    const signature = req.get("x-webhook-signature");
    const timestamp = req.get("x-webhook-timestamp");
    if (!signature || !timestamp || !/^\\d+$/.test(timestamp) ||
        Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300 || !Buffer.isBuffer(req.body)) {
      return res.status(401).json({ error: "Invalid webhook signature." });
    }
    const bodyHash = createHash("sha256").update(req.body).digest("hex");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${timestamp}.${configuredUrl}.${bodyHash}`);
    verifier.end();
    if (!verifier.verify(await getManusWebhookPublicKey(), signature, "base64")) {
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    const event = JSON.parse(req.body.toString("utf8"));
    const eventId = z.string().min(1).max(200).parse(event.event_id);
    const eventType = z.enum(["task_created", "task_stopped"]).parse(event.event_type);
    const taskId = z.string().min(1).max(200).parse(event.task_detail?.task_id);
    const status = eventType === "task_created" ? "running"
      : event.task_detail?.stop_reason === "finish" ? "completed"
      : event.task_detail?.stop_reason === "ask" ? "waiting" : "unknown";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        "INSERT INTO manus_webhook_events (event_id, event_type, provider_task_id) VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING RETURNING event_id",
        [eventId, eventType, taskId]
      );
      if (inserted.rowCount) {
        await client.query(
          "UPDATE manus_tasks SET status = $1, result_summary = $2, updated_at = NOW(), completed_at = CASE WHEN $1 IN ('completed','failed') THEN NOW() ELSE completed_at END WHERE provider_task_id = $3",
          [status, event.task_detail?.message || null, taskId]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
    return res.status(200).json({ received: true });
  } catch {
    return res.status(400).json({ error: "Invalid webhook event." });
  }
});

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { requireServiceAuth } from "./auth.js";
import { loadGlossary, approvedTerms } from "./glossary.js";
import { paraphraseText, semanticAudit } from "./ai.js";
import { buildAuditReport, deterministicGlossaryScan } from "./audit.js";
import { getAudit, listReviews, pool, saveAudit, saveReview } from "./db.js";
import { manusRouter, manusWebhookRouter } from "./manus-router.js";

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed."));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 600
}));
app.use("/api/webhooks", manusWebhookRouter); // Must precede JSON parsing: Manus signatures cover raw bytes.\napp.use(express.json({ limit: "1mb", strict: true }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

app.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    service: "quillspark-api",
    ai_configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
    database_configured: Boolean(pool),
    time: new Date().toISOString()
  });
});

app.use("/api/integrations/manus", apiLimiter, manusRouter);\n\napp.use("/v1", apiLimiter, requireServiceAuth);

app.get("/v1/glossary", async (_req, res, next) => {
  try {
    const glossary = await loadGlossary();
    res.json({
      glossary_id: glossary.glossary_id,
      version: glossary.version,
      approval: glossary.approval,
      terms: approvedTerms(glossary)
    });
  } catch (error) { next(error); }
});

const paraphraseSchema = z.object({
  text: z.string().trim().min(1).max(16000),
  style: z.enum(["natural", "professional", "academic", "simple", "formal", "creative", "concise"]).default("natural"),
  target_language: z.enum(["preserve", "bn", "en"]).default("preserve")
});

app.post("/v1/paraphrase", aiLimiter, async (req, res, next) => {
  try {
    const input = paraphraseSchema.parse(req.body);
    const glossary = await loadGlossary();
    const result = await paraphraseText({
      ...input,
      targetLanguage: input.target_language,
      terms: approvedTerms(glossary)
    });
    res.json({ ...result, glossary_version: glossary.version });
  } catch (error) { next(error); }
});

const auditSchema = z.object({
  document_name: z.string().trim().max(200).optional(),
  source_text: z.string().max(20000).optional(),
  target_text: z.string().max(20000).optional(),
  document_text: z.string().max(20000).optional()
}).refine((value) => Boolean(value.target_text?.trim() || value.document_text?.trim()), {
  message: "target_text or document_text must be provided."
});

app.post("/v1/audit", aiLimiter, async (req, res, next) => {
  try {
    const input = auditSchema.parse(req.body);
    const targetText = input.target_text || input.document_text;
    const glossary = await loadGlossary();
    const deterministic = deterministicGlossaryScan(targetText, glossary);
    let aiFindings = [];
    let aiStatus = "unavailable";
    let aiError = null;

    try {
      const result = await semanticAudit({
        sourceText: input.source_text || "",
        targetText,
        terms: approvedTerms(glossary)
      });
      aiFindings = result.findings || [];
      aiStatus = "complete";
    } catch (error) {
      aiError = error.code === "AI_NOT_CONFIGURED"
        ? "OpenAI is not configured; deterministic checks only."
        : "AI contextual review failed; deterministic checks only.";
      console.error("QuillSpark AI audit failed:", error.code || error.name || "unknown");
    }

    const report = buildAuditReport({
      documentName: input.document_name,
      sourceText: input.source_text,
      targetText,
      glossary,
      deterministic,
      aiFindings,
      aiStatus,
      aiError
    });
    const persisted = await saveAudit(report, input.document_name);
    res.status(201).json({ ...report, persisted });
  } catch (error) { next(error); }
});

const reviewSchema = z.object({
  audit_id: z.string().uuid(),
  finding_id: z.string().min(1).max(80),
  reviewer_id: z.string().trim().min(1).max(128),
  decision: z.enum(["approve", "reject", "revise", "defer"]),
  note: z.string().max(2000).optional()
});

app.post("/v1/reviews", async (req, res, next) => {
  try {
    const input = reviewSchema.parse(req.body);
    const report = await getAudit(input.audit_id);
    if (!report) {
      return res.status(pool ? 404 : 503).json({
        error: {
          code: pool ? "AUDIT_NOT_FOUND" : "DATABASE_NOT_CONFIGURED",
          message: pool ? "The requested audit report was not found." : "Persistent review requires DATABASE_URL."
        }
      });
    }
    if (!report.findings.some((finding) => finding.id === input.finding_id)) {
      return res.status(404).json({
        error: { code: "FINDING_NOT_FOUND", message: "The finding does not exist in this audit." }
      });
    }
    const review = await saveReview(input);
    return res.status(201).json({ review });
  } catch (error) { next(error); }
});

app.get("/v1/audits/:auditId", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.auditId);
    const report = await getAudit(id);
    if (!report) {
      return res.status(pool ? 404 : 503).json({
        error: {
          code: pool ? "AUDIT_NOT_FOUND" : "DATABASE_NOT_CONFIGURED",
          message: pool ? "The requested audit report was not found." : "Report history requires DATABASE_URL."
        }
      });
    }
    return res.json(report);
  } catch (error) { next(error); }
});

app.get("/v1/audits/:auditId/reviews", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.auditId);
    const reviews = await listReviews(id);
    if (reviews === null) {
      return res.status(503).json({
        error: { code: "DATABASE_NOT_CONFIGURED", message: "Review history requires DATABASE_URL." }
      });
    }
    return res.json({ reviews });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Request validation failed.", issues: error.issues }
    });
  }
  if (error?.message === "Origin is not allowed.") {
    return res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "This origin is not permitted." } });
  }
  if (error?.code === "MANUS_NOT_CONFIGURED") {\n    return res.status(503).json({ error: { code: error.code, message: "Manus integration is not configured." } });\n  }\n  if (error?.code?.startsWith("MANUS_")) {\n    const status = error.status === 429 ? 429 : error.status === 404 ? 404 : error.status === 401 || error.status === 403 ? 502 : 502;\n    return res.status(status).json({ error: { code: error.code, message: "The Manus service could not complete the request." } });\n  }\n  if (error?.code === "AI_NOT_CONFIGURED") {
    return res.status(503).json({ error: { code: "AI_NOT_CONFIGURED", message: "OpenAI service is not configured." } });
  }
  if (error?.code === "DATABASE_NOT_CONFIGURED") {
    return res.status(503).json({ error: { code: error.code, message: error.message } });
  }
  if (error?.status === 429) {
    return res.status(429).json({ error: { code: "AI_RATE_LIMIT", message: "The AI provider rate limit was reached. Retry later." } });
  }

  console.error("QuillSpark API request failed:", error?.code || error?.name || "unknown");
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "The request could not be completed." }
  });
});

export default app;

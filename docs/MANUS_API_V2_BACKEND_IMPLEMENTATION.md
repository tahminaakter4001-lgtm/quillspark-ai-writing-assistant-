# QuillSpark + Manus API v2 backend integration

## Target
Extend the existing QuillSpark Express backend. The repository's backend uses Node.js ESM, Express 5, PostgreSQL (pg), Zod, Helmet, CORS, and express-rate-limit. This change adds integration routes to the same server.

## Architecture
Dashboard and ChatGPT plugin call QuillSpark endpoints. The backend verifies a QuillSpark user session, enforces owner and tenant isolation, and calls only the fixed upstream host https://api.manus.ai. The Manus key stays server-side.

## Routes
- POST /api/integrations/manus/tasks — create a private Manus task.
- GET /api/integrations/manus/tasks — list only the signed-in user's tasks.
- GET /api/integrations/manus/tasks/:taskId — refresh status and result.
- POST /api/integrations/manus/tasks/:taskId/messages — send a user follow-up.
- POST /api/integrations/manus/tasks/:taskId/confirm — submit a user-confirmed waiting action.
- POST /api/webhooks/manus — verify and process signed Manus lifecycle events.

The webhook router must be mounted before express.json(), because the signature covers the exact raw request bytes.

## Session contract
The new routes require an HS256 JWT with:
- sub: QuillSpark user ID
- exp: expiration timestamp
- optional tenant_id, iss, aud

Configure QUILLSPARK_SESSION_JWT_SECRET (at least 32 characters) and align issuer/audience with the existing host's token issuer. The existing QUILLSPARK_API_TOKEN is service-to-service authentication and must not be treated as an end-user session. Never accept user IDs from request bodies or unsigned headers.

## Environment
Add the values in backend/.env.manus.example to the existing backend's secret manager:
- MANUS_API_KEY: Manus API key; full account access, server-only.
- MANUS_WEBHOOK_PUBLIC_URL: exact external HTTPS webhook URL.
- QUILLSPARK_SESSION_JWT_SECRET and optional issuer/audience.

Keep DATABASE_URL pointed at the existing PostgreSQL database. Do not store keys in source control, browser bundles, plugin manifests, logs, or chat.

## Provider contract
- Create: POST /v2/task.create with x-manus-api-key, message.content as text, locale, interactive_mode, and share_visibility=private.
- Read status: GET /v2/task.listMessages?task_id=...&order=desc&limit=20.
- Follow-up: POST /v2/task.sendMessage.
- Confirm waiting action: POST /v2/task.confirmAction. UI must display the requested action and require explicit user confirmation; never auto-confirm.
- Webhook public key: GET /v2/webhook.publicKey. Cache for one hour.
- Signature: RSA-SHA256 over timestamp + "." + full configured callback URL + "." + SHA-256 hex digest of raw body. Reject timestamps more than 300 seconds old or in the future. Deduplicate event_id.

## Database
Migration 003_manus_tasks.sql adds owner/tenant-scoped task records and a unique webhook event table. Existing audit data is not modified.

## Remaining host integration
1. Match the JWT verifier to the actual QuillSpark login/session issuer before enabling the routes.
2. Confirm the current backend host and add the environment values using its secret manager.
3. Deploy the existing server, then register the exact webhook URL in Manus developer settings.
4. Add Dashboard task-list/detail UI and plugin/MCP tools that call only these QuillSpark routes. Neither client should call Manus directly.
5. Run migration, build, session/tenant isolation tests, webhook signature/replay tests, and a live Manus API smoke test.

## Deployment boundary
The GitHub repository is available, but the live Manus WebDev project source, its session-token issuer configuration, production host, and secrets are not exposed by the repository connection. This branch prepares the backend integration code; it does not deploy or prove a live Manus connection.

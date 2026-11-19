# QuillSpark Backend API

This service adds a server-side OpenAI Responses API connection to the existing QuillSpark repository. It reuses the canonical JSON glossary at `../glossary/bn-it-glossary.json`.

## Current integration boundary

The Git repository contains the glossary, a deterministic Python audit script, tests, and GitHub Actions. It does not contain the original Manus-hosted frontend source or a verified QuillSpark production API. This backend is therefore a separately deployable service; the Manus website is not changed by this commit.

The API is service-to-service authenticated. Do not call it directly from browser JavaScript with the shared service token. Connect the website through its authenticated server-side route/proxy, or connect an approved MCP adapter after this API has been deployed and its public HTTPS URL verified.

## Features

- `GET /healthz`: non-secret health/configuration status.
- `GET /v1/glossary`: approved glossary entries.
- `POST /v1/paraphrase`: AI paraphrasing with approved terminology constraints.
- `POST /v1/audit`: deterministic forbidden-form scan plus AI contextual review.
- `GET /v1/audits/:auditId`: retrieve a persisted audit report.
- `POST /v1/reviews`: append a human decision (`approve`, `reject`, `revise`, `defer`).
- `GET /v1/audits/:auditId/reviews`: review history.

Suggested fixes are never applied automatically. Human decisions are audit events; approving a suggested fix does not silently edit a document or change the canonical glossary.

## Environment

Copy `.env.example` to `.env` in local development and set:

- `QUILLSPARK_API_TOKEN`: random server-to-server bearer token with at least 32 characters.
- `OPENAI_API_KEY`: OpenAI project API key, stored only in the hosting provider's secret manager.
- `OPENAI_MODEL`: model enabled for the OpenAI project.
- `DATABASE_URL`: PostgreSQL connection string for durable audit/review history.
- `DATABASE_SSL`: set to `true` only when the database provider's trusted TLS configuration is correctly installed.
- `ALLOWED_ORIGINS`: optional comma-separated exact origins. CORS is not authentication.

Never commit `.env`, credentials, or API keys. Never put `QUILLSPARK_API_TOKEN` or `OPENAI_API_KEY` in website JavaScript, HTML, a public GitHub file, or a plugin manifest.

## Run locally

Requires Node.js 20 or newer and PostgreSQL for persistent review history.

```bash
cd backend
npm install
cp .env.example .env
# Add the required values to .env using a local secret manager/editor.
npm test
npm start
```

The service starts on port 8787 by default. Without `DATABASE_URL`, paraphrasing and audit can still run, but reports are not retained and human-review endpoints return a configuration error. Without OpenAI configuration, the audit endpoint can still return deterministic glossary findings; paraphrasing is unavailable.

## API examples

All `/v1/*` routes require:

```http
Authorization: Bearer <QUILLSPARK_API_TOKEN>
Content-Type: application/json
```

Paraphrase:

```json
{
  "text": "আপনার লেখা এখানে দিন",
  "style": "professional",
  "target_language": "preserve"
}
```

Audit an English source and Bengali target:

```json
{
  "document_name": "user-guide.md",
  "source_text": "Authentication is required.",
  "target_text": "অথেনটিকেশন প্রয়োজন।"
}
```

Audit a Bengali-only document by using `document_text` instead of `target_text`.

Record a reviewer decision:

```json
{
  "audit_id": "the-audit-uuid",
  "finding_id": "QS-DET-001",
  "reviewer_id": "host-authenticated-user-id",
  "decision": "approve",
  "note": "Reviewed against the project style guide."
}
```

The caller must derive `reviewer_id` from its own authenticated user session. Do not trust an arbitrary browser-provided reviewer name as an identity assertion.

## Deployment

Build from the repository root (the Dockerfile copies the root glossary into the image):

```bash
docker build -f backend/Dockerfile -t quillspark-api .
docker run --env-file backend/.env -p 8787:8787 quillspark-api
```

For a managed Node/Docker host, deploy this repository with `backend/Dockerfile` and the repository root as the build context. Configure the environment variables in the host's secret manager, attach PostgreSQL, and require HTTPS. Do not enable public browser access until an authenticated same-origin proxy or equivalent user-session integration is implemented.

After deployment, check `https://YOUR_API_HOST/healthz`. A healthy response only confirms the process is running; verify `ai_configured` and `database_configured` before treating the workflow as fully operational.

## OpenAI API

The backend uses the official OpenAI JavaScript SDK and the Responses API. See the [official SDK guide](https://developers.openai.com/api/docs/libraries) and [API Platform quickstart](https://platform.openai.com/overview).

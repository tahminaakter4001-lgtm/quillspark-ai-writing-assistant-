# Sandbox GitHub Environment and PostgreSQL Setup

This guide complements [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).

## GitHub Environment

Create a GitHub Environment named exactly `sandbox` in Settings → Environments. Add required reviewers if available. The workflow `.github/workflows/sandbox-image.yml` is manual-only and binds its publishing job to this environment.

The GitHub Actions workflow uses the built-in `GITHUB_TOKEN` to publish an immutable container image to GitHub Container Registry (GHCR). It does not need a long-lived registry password.

## Runtime secrets

Add these values to the GitHub `sandbox` Environment only if a later deployment workflow or host integration consumes them. Also configure the same values in the actual hosting provider's sandbox secret manager:

| Name | Type | Purpose |
|---|---|---|
| `QUILLSPARK_API_TOKEN` | Secret | Unique random service bearer token, minimum 32 characters |
| `OPENAI_API_KEY` | Secret | OpenAI project API key |
| `DATABASE_URL` | Secret | Sandbox-only PostgreSQL connection string |
| `OPENAI_MODEL` | Variable | Model identifier enabled for the project |
| `DATABASE_SSL` | Variable | `true` when provider TLS is configured |
| `ALLOWED_ORIGINS` | Variable | Exact approved website origins |
| `PORT` | Variable | Usually `8787` |

Never paste secrets into chat, commit them, or add them to workflow YAML. Do not reuse production credentials.

## PostgreSQL

Provision a dedicated PostgreSQL 16+ instance/database for sandbox. Do not use production data. Require encrypted connections from the hosting provider and set `DATABASE_SSL=true` only when the provider's certificate chain is trusted by the Node runtime. Use a least-privilege application role that can create/alter the two application tables during the initial migration and perform normal application reads/writes afterward.

The API runs `backend/migrations/001_init.sql` automatically at startup when `DATABASE_URL` is present. Back up the database and verify restore before production use.

## Publish and deploy

1. Open Actions → QuillSpark Sandbox Image → Run workflow.
2. Run it from the reviewed branch/commit. The job executes backend tests against an ephemeral PostgreSQL service and builds the Docker image.
3. On success, it publishes `ghcr.io/OWNER/quillspark-api:sandbox-COMMIT_SHA`.
4. Configure the hosting provider to pull that exact image and set the runtime secrets/variables above.
5. Expose HTTPS and verify `/healthz`; confirm `ai_configured=true` and `database_configured=true`.
6. Exercise authenticated paraphrase, audit, report retrieval, and human-review flows using sandbox-only test data.

## Important limitation

The workflow builds and publishes the sandbox container image; it does not provision PostgreSQL, create GitHub Environment secrets, or deploy to a hosting provider. Those actions require account-level administration and a selected hosting provider. No hosting provider or deployment credentials are configured in this repository yet. Production publishing/deployment is intentionally not included.

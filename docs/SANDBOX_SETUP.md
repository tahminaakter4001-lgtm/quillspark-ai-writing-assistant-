# Sandbox GitHub Environment and Deployment Setup

This guide complements [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md).

## Portable Docker Compose deployment

A provider has not been selected, so this branch includes a provider-neutral Docker Compose setup suitable for a Docker-compatible Linux VM/VPS. It builds from the repository root, runs PostgreSQL 16 in a persistent volume, waits for the database health check, and starts the API. The API is bound to host loopback only (127.0.0.1:8787); put an HTTPS reverse proxy such as the host's existing Caddy, Nginx, or Traefik in front of it. Do not expose port 8787 directly to the public internet.

On the host:

1. Install Docker Engine and the Docker Compose plugin; clone the repository and check out the reviewed feature branch/commit.
2. Copy `deploy/sandbox/runtime.env.example` to `deploy/sandbox/runtime.env`.
3. Generate unique random values for `POSTGRES_PASSWORD` and `QUILLSPARK_API_TOKEN`. Use a URL-encoded database password in `DATABASE_URL` (the password in the URL must match `POSTGRES_PASSWORD`). Add the OpenAI project key and a model enabled for that project.
4. Restrict the runtime env file: `chmod 600 deploy/sandbox/runtime.env`. Never commit or share it.
5. Start the stack from the repository root:

```bash
docker compose --env-file deploy/sandbox/runtime.env -f deploy/sandbox/compose.yaml up -d --build
```

6. Check status and health:

```bash
docker compose --env-file deploy/sandbox/runtime.env -f deploy/sandbox/compose.yaml ps
curl http://127.0.0.1:8787/healthz
```

7. Configure the host's HTTPS reverse proxy to forward to `http://127.0.0.1:8787`. Keep `QUILLSPARK_API_TOKEN` server-side; do not put it in browser JavaScript. The API's service-to-service authentication is not a substitute for an end-user authenticated website proxy.

The Compose stack uses a named volume for sandbox PostgreSQL data. Back it up regularly. Do not load production data into this environment. The Compose setup uses an internal Docker network for database connectivity and disables database TLS only for that private local container network. For a separately managed database, configure the provider's TLS requirements and set `DATABASE_SSL=true` only when its certificate chain is trusted by Node.

## GitHub Environment and image workflow

Create a GitHub Environment named exactly `sandbox` in Settings → Environments. Add required reviewers if available. The workflow `.github/workflows/sandbox-image.yml` is manual-only and binds its publishing job to this environment.

The GitHub Actions workflow uses the built-in `GITHUB_TOKEN` to publish an immutable container image to GitHub Container Registry (GHCR). It does not need a long-lived registry password.

To publish an image, open Actions → QuillSpark Sandbox Image → Run workflow and run it from the reviewed branch/commit. The job executes backend tests against an ephemeral PostgreSQL service and builds the Docker image. On success, it publishes `ghcr.io/OWNER/quillspark-api:sandbox-COMMIT_SHA`. This image-publish workflow is separate from the Compose VM deployment above; the Compose file currently builds locally from source.

## Runtime configuration

The runtime template contains:

| Name | Purpose |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Sandbox-only PostgreSQL database credentials |
| `DATABASE_URL` | Internal connection URL using hostname `db` |
| `QUILLSPARK_API_TOKEN` | Unique server-to-server bearer token, minimum 32 characters |
| `OPENAI_API_KEY` | OpenAI project API key |
| `OPENAI_MODEL` | Model identifier enabled for the project |
| `ALLOWED_ORIGINS` | Exact approved website origins, if browser CORS is required |

Never paste secrets into chat, commit them, or add them to workflow YAML. Do not reuse production credentials.

## Verify the sandbox

After the API is healthy, verify `ai_configured=true` and `database_configured=true` in `/healthz`. Then test authenticated paraphrase, audit, report retrieval, and human-review flows with sandbox-only test data. A healthy process alone does not prove the full application integration works.

## Important limitations

The repository now contains a portable Docker Compose deployment configuration and a manual GitHub image-publishing workflow. Neither has been run from this chat. No hosting provider, VM, domain, reverse proxy, PostgreSQL backup destination, GitHub Environment secrets, or deployment credentials have been provisioned. The original Manus-hosted frontend is not included in this repository, so frontend integration remains a separate task. Production publishing/deployment is intentionally not included.

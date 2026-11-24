# QuillSpark Environment Strategy

This repository currently contains a separately deployable Node.js backend under `backend/`. The existing root-level project assets, terminology glossary, audit scripts, tests, and workflows are left intact. These templates standardize configuration; they do not create hosting resources or deploy the service.

## Environments

| Environment | Purpose | Runtime | Data and credentials |
|---|---|---|---|
| Development | Local feature work | `NODE_ENV=development` | Local-only token, local/dev database, development origins |
| Testing | Automated and integration tests | `NODE_ENV=test` | Disposable test database; never production data |
| Sandbox | Shared pre-production verification | `NODE_ENV=production` | Separate sandbox API key, token, database and domain |
| Production | Public live service | `NODE_ENV=production` | Production-only secrets, database and approved origin |

Sandbox and production use production runtime mode so the service behaves like a deployed Node process. They remain separate by credentials, database, host and deployment environment.

## Configuration files

- `backend/.env.example` remains the canonical list of backend variables.
- `backend/environments/development.env.example`
- `backend/environments/testing.env.example`
- `backend/environments/sandbox.env.example`
- `backend/environments/production.env.example`

For local work, copy the appropriate template to `backend/.env`, then replace placeholders. Do not commit `backend/.env`. For hosted environments, enter each value in the host's environment/secret settings; do not upload populated env files.

## Required variables

- `NODE_ENV`: development, test, or production.
- `PORT`: HTTP listener port supplied by the host where applicable.
- `QUILLSPARK_API_TOKEN`: unique random server-to-server bearer token (at least 32 characters).
- `OPENAI_API_KEY`: OpenAI API key; server-side secret only.
- `OPENAI_MODEL`: model identifier enabled for the associated OpenAI project.
- `DATABASE_URL`: PostgreSQL connection string. Use a distinct database for every environment.
- `DATABASE_SSL`: enable TLS only when the database provider's trusted TLS configuration is available.
- `ALLOWED_ORIGINS`: exact comma-separated website origins. CORS is not authentication.

## GitHub Actions and deployment separation

1. Pull requests and pushes to feature branches run automated checks only.
2. Sandbox deployment should run only from an approved branch or manually approved workflow and use the GitHub Environment named `sandbox`.
3. Production deployment should run only from a reviewed release/tag or protected `main` after approval and use the GitHub Environment named `production`.
4. Configure separate GitHub Environment secrets. Never reuse sandbox credentials in production.
5. Require manual reviewers for production deployments where the repository plan supports environment protection rules.
6. Do not add secrets to workflow YAML, repository files, build arguments, logs, frontend bundles, or pull-request artifacts from untrusted forks.

Suggested GitHub Environment secrets: `QUILLSPARK_API_TOKEN`, `OPENAI_API_KEY`, `DATABASE_URL`. Suggested non-secret variables: `OPENAI_MODEL`, `DATABASE_SSL`, `ALLOWED_ORIGINS`, and `PORT`.

## Local setup

```bash
cd backend
cp environments/development.env.example .env
# Replace the placeholders in .env using a local secret manager/editor.
npm install
npm test
npm start
```

Use `testing.env.example` only with a disposable test database. Never point tests or sandbox at production data.

## Main-branch safety and rollout

- All changes for this setup are isolated on `chore/environment-setup`; `main` is not modified.
- Open a pull request from `chore/environment-setup` into `main` after reviewing the diff and CI results.
- Keep direct pushes to `main` disabled; require pull requests and passing status checks.
- Require at least one approval (or the available minimum), dismiss stale approvals, require conversation resolution, and block force pushes/deletions.
- Enable branch protection/rulesets for `main` in GitHub repository settings. The connected GitHub workflow used here can create branches and files, but does not expose a branch-protection write action; therefore protection must be enabled by a repository administrator in Settings.
- Merge only after CI passes and the pull request is approved. Do not auto-merge this setup.

## Deployment readiness checklist

- [ ] Create GitHub Environments: `sandbox` and `production`.
- [ ] Add independent secrets and variables to each environment.
- [ ] Provision isolated PostgreSQL databases and HTTPS hostnames.
- [ ] Verify the backend's `/healthz` endpoint and database/AI configuration flags.
- [ ] Verify authenticated paraphrase and audit requests through a server-side proxy.
- [ ] Confirm CORS origins and rate limits.
- [ ] Confirm backups, monitoring, log redaction and rollback procedure.
- [ ] Approve the production deployment only after sandbox acceptance.

## Important integration boundary

The repository's backend README notes that the original Manus-hosted frontend source and a verified production API URL are not present in this repository. These files do not claim that the Manus site is connected or that any environment is deployed. Integrate the frontend through an authenticated server-side proxy only after the backend has been deployed and its HTTPS endpoint verified.

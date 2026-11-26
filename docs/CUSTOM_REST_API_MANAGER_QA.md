# QuillSpark Custom REST API Manager — Repository QA Note

**Review type:** read-only repository inspection and design review  
**Branch:** `feat/custom-rest-api-manager-staging`  
**Base:** `main`  
**Execution status:** no code tests or deployments executed

## Verified repository facts

- `main` contains `backend/src/app.js`, `auth.js`, `db.js`, PostgreSQL migrations, and Node test files.
- The backend service uses a shared bearer token in `backend/src/auth.js`.
- The review endpoint schema in `backend/src/app.js` accepts `reviewer_id` from the request body.
- Audit report retrieval in `backend/src/db.js` selects by audit ID only; no workspace or owner predicate is present in the inspected implementation.
- `docs/MANUS_WEBDEV_BACKEND_INTEGRATION.md` says the repository does not contain the live Manus WebDev source and that the browser must call authenticated same-origin server routes.
- The existing backend README instructs operators to keep service tokens and OpenAI credentials server-side.

## Findings

### High — tenant isolation is not demonstrated for audit records

The current report lookup and review paths are keyed by audit ID and do not show workspace/owner authorization. Do not expose these routes to multiple users or tenants until access is scoped to a verified principal and workspace.

### High — reviewer identity is caller-supplied

The review request accepts `reviewer_id` from the JSON body. The integration contract already says identity must come from the authenticated host session. The server must derive the reviewer ID from a trusted principal and ignore/reject caller-supplied identity assertions.

### Medium — shared service authentication is not end-user authorization

The shared bearer token can authenticate a trusted service but does not identify the individual user, workspace, or role. Keep it behind a private service boundary; do not use it as the only protection for a multi-tenant dashboard.

### Blocker — provider contract absent

No named provider, official API docs/OpenAPI schema, sandbox base URL, auth grant, scopes, or endpoint schemas were supplied. A live integration cannot be implemented or safely tested without these inputs.

### Blocker — Manus host source absent

The GitHub repository does not contain the live Manus WebDev project source or a verified session adapter. Do not claim the Dashboard is connected or patch a guessed framework path.

## Test and release ledger

| Check | Status |
|---|---|
| Public repository metadata and branch list inspected | Complete |
| Main tree and relevant backend files inspected | Complete |
| Existing tests reviewed as source | Complete |
| Automated tests executed | Not run |
| Provider sandbox request | Not run — provider unspecified |
| Tenant isolation integration test | Not run |
| Manus same-origin session integration | Not run — host source unavailable |
| Staging deployment | Not performed |
| Production deployment | Not performed |

## Required next inputs

1. Official provider API documentation or OpenAPI JSON/YAML file.
2. Confirmation of the runtime to host the integration: existing Manus WebDev project or this Express backend.
3. If Manus is the host, provide the project source/export or the actual project editor access and its existing authenticated-session conventions.
4. Provider sandbox credentials must be configured directly in the authorized secret manager, not pasted into source files or chat.

## Release recommendation

Keep this work in the isolated staging branch. Do not merge, publish, or enable outbound execution until the high-severity identity and tenant-isolation findings are addressed and the provider contract has been reviewed.

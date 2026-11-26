# QuillSpark Custom REST API Manager
## Integration design, implementation contract, and quality gates

**Status:** design baseline; implementation is gated on the target API's official documentation and a confirmed tenant identity model.  
**Target repository:** `tahminaakter4001-lgtm/quillspark-ai-writing-assistant-`  
**Release boundary:** isolated staging branch only; no changes to `main`, no production deployment.

## 1. Purpose and scope

Provide a controlled way for an authorized QuillSpark workspace administrator to register a documented external REST API, configure authentication, define and validate endpoints, run bounded test requests, and inspect sanitized results.

This is an integration manager, not an unrestricted URL fetch proxy. Each connection must be bound to an approved API origin, a workspace, a credential reference, and a reviewed endpoint contract. The browser must never receive provider credentials.

### In scope

- API connection metadata and lifecycle: draft, tested, enabled, disabled.
- Authentication profiles: API key, Bearer token, Basic, and OAuth 2.0 where the provider's documented grant and token lifecycle are supported.
- Endpoint definitions with method, relative path, query/header/body schema, response schema, timeout, and idempotency policy.
- Server-side execution, request/response validation, redacted execution history, and connection test.
- Development and staging environments initially. Production is disabled until a separate release approval.

### Out of scope until supplied and verified

- A real provider-specific adapter or live API call.
- OAuth grant selection, token refresh, scopes, and callback URLs for an unnamed provider.
- Production credentials, live writes, destructive operations, or deployment.
- Browser-side storage or transmission of secrets.

## 2. Current repository fit

The repository already contains a standalone Express 5 backend, Zod request validation, Helmet, rate limiting, PostgreSQL persistence, a server-to-server bearer token, and a Docker deployment reference. The backend is not the Manus website source. Its own README explicitly requires a same-origin authenticated server-side proxy before browser use.

The current backend authentication is a shared service token. That proves possession of a service credential; it does **not** identify an end user or workspace. Before enabling saved connections or execution history, QuillSpark must supply a trusted authenticated principal and workspace/tenant context from its actual host application. Never accept `workspace_id`, `owner_id`, or reviewer identity as trusted values from an arbitrary request body.

## 3. Target architecture

```text
QuillSpark Dashboard (same-origin UI)
        |
        | existing signed-in user session
        v
QuillSpark host application's authenticated server route
        |
        | verified user + workspace principal
        v
REST Integration Service
  |-- authorization / workspace isolation
  |-- connection and endpoint registry
  |-- secret reference resolver
  |-- request policy and schema validator
  |-- outbound HTTP executor
  |-- response validator and redactor
  |-- append-only execution audit
        |
        | HTTPS, approved origin, no redirects
        v
Documented external REST API
```

The current static service-token middleware may protect a private service-to-service deployment, but it must not be treated as the end-user authorization layer. If the Manus app is the host, implement the UI-facing route inside the existing Manus project and reuse its session and database conventions; do not assume this GitHub backend can be mounted directly into Manus.

## 4. Proposed API contract

All routes below are proposed and must be adapted to the actual authenticated host framework.

| Method | Route | Purpose |
|---|---|---|
| POST | `/v1/integrations` | Create a draft connection |
| GET | `/v1/integrations` | List connections visible to the current workspace |
| GET | `/v1/integrations/:id` | Read non-secret connection metadata |
| PATCH | `/v1/integrations/:id` | Update metadata or lifecycle state |
| POST | `/v1/integrations/:id/credentials` | Store/rotate a credential in the secret manager |
| POST | `/v1/integrations/:id/endpoints` | Add a validated endpoint contract |
| POST | `/v1/integrations/:id/test` | Execute a safe, bounded connection test |
| POST | `/v1/integrations/:id/execute/:endpointId` | Execute an enabled endpoint |
| GET | `/v1/integrations/:id/runs` | List redacted execution history |

### Connection create payload (metadata only)

```json
{
  "name": "Example CRM",
  "base_url": "https://api.example.com/v1",
  "environment": "staging",
  "auth_type": "bearer",
  "documentation_url": "https://docs.example.com/api"
}
```

No secret value is accepted in the ordinary connection metadata payload. Secret material is submitted through a dedicated server-side secret flow and stored in a hosting secret manager or envelope-encrypted credential store.

### Endpoint contract

Each endpoint definition must specify:

- stable endpoint ID and display name;
- HTTP method from GET, POST, PUT, PATCH, DELETE;
- relative path only (no absolute URL or authority override);
- allowed query parameters and header names;
- request body schema and content type;
- expected response schema and maximum response size;
- timeout and retry policy;
- whether the operation is read-only, idempotent, or a write;
- required permission/scope and approval level.

Do not allow endpoint definitions to override the connection's approved origin, TLS policy, credential binding, or redirect policy.

## 5. Authentication and secret handling

| Mode | Requirements |
|---|---|
| API key | Header or query placement only if explicitly documented; header preferred. Never place in URL logs. |
| Bearer | Server-side Authorization header; never expose token to browser or logs. |
| Basic | Construct the header server-side; require HTTPS. |
| OAuth 2.0 | Use only a provider-documented grant. Validate state/PKCE where applicable; store refresh tokens securely; request minimum scopes; handle expiry and revocation. |

Rules:

1. Require HTTPS for every provider connection. Reject URL user-info, fragments, unsupported ports, IP-literal hosts, localhost, private/link-local/reserved destinations, and unapproved hostnames.
2. Resolve and validate DNS answers at connection time and pin the vetted destination for the request to mitigate DNS rebinding. Revalidate on every request.
3. Disable redirects by default. If a provider explicitly requires redirects, validate every redirect target against the same origin policy and never forward credentials cross-origin.
4. Use an explicit per-connection host allowlist. Do not provide an arbitrary URL parameter to the execution endpoint.
5. Keep secrets out of source control, frontend bundles, browser storage, logs, error messages, traces, and API responses.
6. Apply least-privilege scopes and support rotation/revocation. Never silently reuse one global credential across tenants.
7. Enforce TLS certificate validation. Do not provide an option to disable certificate verification.

## 6. Persistence model (proposed)

| Table | Important fields | Notes |
|---|---|---|
| `api_connections` | id, workspace_id, name, base_url, environment, auth_type, status, created_by, timestamps | No raw secret fields |
| `api_credentials` | id, connection_id, secret_ref, credential_version, expires_at, rotated_at | Store a vault reference, not plaintext |
| `api_endpoints` | id, connection_id, method, relative_path, request_schema, response_schema, policy, enabled | Relative paths only |
| `api_permissions` | workspace_id, principal_id/role, connection_id, allowed_actions | Enforce on every read/write/execute |
| `api_execution_logs` | id, workspace_id, connection_id, endpoint_id, actor_id, status_code, duration_ms, request_id, redacted_summary, created_at | Append-only, bounded retention |
| `api_test_results` | id, connection_id, schema_version, result, created_at | No credential or full sensitive payload |

Add foreign keys, workspace-scoped indexes, uniqueness constraints, and migrations following the repository's existing PostgreSQL migration convention only after the host application's tenant model is confirmed.

## 7. Execution policy

- Accept only a connection ID and endpoint ID from the caller; never accept an arbitrary destination URL.
- Compose the URL from the stored approved base URL plus a validated relative path.
- Validate path segments and query values; reject path traversal, authority changes, CRLF/header injection, and unsupported content types.
- Enforce request and response byte limits, per-connection and per-workspace quotas, concurrency limits, and an overall deadline.
- Use bounded retries only for transient failures and only when the endpoint is safe to retry. Do not automatically retry non-idempotent writes.
- Require explicit user confirmation for write operations; require a stronger approval step for destructive or production operations.
- Validate responses against the saved schema before returning data to the UI.
- Redact secrets, authorization headers, cookies, and configured sensitive JSON fields before logging or displaying.
- Return normalized error codes; do not expose upstream stack traces, raw response headers, credentials, or internal network details.

## 8. Quality and acceptance gates

| Test | Expected result |
|---|---|
| Missing/invalid user session | 401; no connection metadata or execution |
| User from another workspace | 404 or 403; no existence leakage |
| Missing role/permission | 403; no side effect |
| HTTP URL, localhost, private IP, metadata IP, or unapproved host | Rejected before network call |
| DNS resolves to a private/reserved address | Rejected |
| Redirect to a different host | Not followed |
| Credential absent/expired/invalid | Sanitized auth error; secret not logged |
| Invalid method/path/header/query/body | Rejected by schema/policy validation |
| Oversized request/response | Rejected with bounded resource use |
| Timeout or transient upstream failure | Bounded timeout/retry; no unbounded retry |
| Non-idempotent write timeout | No blind retry; outcome marked uncertain |
| Invalid upstream response schema | Safe validation error; raw payload not leaked |
| Secret appears in log/error/response | Test fails |
| Bengali UTF-8 request/response | Round-trips without corruption |
| Connection disable/revoke | Subsequent execution denied |
| Production write without approval | Denied |
| Existing QuillSpark workflows | Regression suite passes |

## 9. Implementation sequence

1. **Source and identity gate:** confirm the actual host application source, its authenticated session/principal, workspace model, database and secret manager.
2. **Provider contract gate:** obtain official API documentation or OpenAPI file, base URLs, auth method/grant, scopes, request/response schemas, rate limits and sandbox details.
3. **Data layer:** add workspace-scoped migrations and vault references; verify migration rollback and tenant constraints.
4. **Policy layer:** implement origin/DNS/redirect protections, request validation, quotas, deadlines and safe error normalization.
5. **Execution layer:** implement the provider-neutral executor plus a provider-specific adapter derived from the supplied OpenAPI contract.
6. **Dashboard:** build connection, credentials, endpoints, tester and run-history views without exposing secrets.
7. **QA:** execute unit, integration, security and regression tests against the provider sandbox.
8. **Staging:** deploy only to staging, verify the health endpoint and end-to-end user journeys, then prepare a report for review.
9. **Production:** separate explicit approval required; not part of this task.

## 10. Current evidence and blockers

Verified from the public repository:

- The default branch is `main`; the inspected tree contains an Express 5 backend, Zod, Helmet, rate limiting, PostgreSQL migrations and backend tests.
- The backend README describes a service-to-service bearer token and says the website must use an authenticated server-side proxy.
- The current review request schema accepts `reviewer_id` from the request body, so that field must not be treated as a verified identity until it is derived from the host's authenticated principal.
- The audit report read routes shown in the current backend do not include a workspace/owner predicate. The current backend therefore does not demonstrate tenant isolation for audit data.
- The GitHub repository is not the Manus WebDev project source; the integration plan in `docs/MANUS_WEBDEV_BACKEND_INTEGRATION.md` records this platform boundary.

Not yet verified:

- No target third-party API or OpenAPI specification has been supplied.
- No Manus project source, session adapter, tenant model, or secret-manager access has been inspected in this task.
- No live API request, database migration, build, automated test run, staging deployment, or production deployment has been performed as part of this design change.

**Decision:** do not enable generic outbound execution until the source/identity gate and provider contract gate are satisfied. The safest next input is the provider's official API documentation or OpenAPI file and confirmation of which QuillSpark runtime owns user authentication.

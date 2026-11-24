# QuillSpark bKash Payment Gateway — Implementation Plan

**Status:** Planning only — no payment code or live credentials added  
**Branch:** `feature/bkash-payment-sandbox`  
**Base:** `main`  
**Currency:** BDT  
**Rollout:** Sandbox first; Live only after merchant approval and a separate release gate

## 1. Goals and non-goals

### Goals
- Add a server-side bKash checkout flow for QuillSpark subscriptions or purchases.
- Persist payment attempts and provider events in PostgreSQL.
- Show customers a trustworthy payment status and their own transaction history.
- Provide an admin-only transaction view and operational summary.
- Make retries, duplicate callbacks, and uncertain provider outcomes safe.
- Keep all existing QuillSpark AI writing and Bengali terminology audit routes working.

### Non-goals for the sandbox milestone
- No real-money transactions.
- No live merchant credentials or secrets in Git, browser code, issue comments, or chat.
- No assumption that a browser redirect or callback alone proves payment success.
- No automatic refunds until provider support, permissions, and the admin approval workflow are verified.

## 2. Existing application constraints

The current backend is an Express 5 ESM service with PostgreSQL and a `/v1` API. Existing routes are protected by `requireServiceAuth`, which is service-token authentication; it is not an end-user identity system or an admin-role system. The existing review endpoint accepts `reviewer_id` from the request body, so that pattern must not be reused for payment administration.

The current migration runner reads `backend/migrations/001_init.sql`. Add a new ordered migration and update the migration runner to apply migrations safely and repeatably; do not rewrite or remove the existing audit tables.

## 3. Proposed architecture

1. QuillSpark dashboard requests a checkout session from the QuillSpark backend.
2. Backend validates the product/plan and amount from server-side configuration (never trusts a client-submitted amount).
3. Backend creates a local payment record with a unique merchant invoice/reference and an idempotency key.
4. Backend obtains/refreshes a bKash token using server-side credentials and calls the documented bKash Sandbox checkout API.
5. Customer completes the provider-hosted payment experience.
6. Backend verifies the outcome server-to-server with the provider's documented execute/query flow. A redirect or callback is only a signal to verify; it is not proof of payment.
7. Backend stores the verified status and provider event. Dashboard reads status/history from QuillSpark, not directly from bKash.
8. Admin endpoints require a separately implemented, verified admin identity/role check.

Keep provider-specific HTTP calls in a dedicated bKash service module. Keep database persistence and route validation separate from provider transport.

## 4. API proposal

Use the existing `/v1` namespace for authenticated application APIs. Final paths and payloads must be confirmed against the dashboard's current routing conventions before implementation.

| Proposed endpoint | Purpose | Access |
|---|---|---|
| `POST /v1/payments/bkash/checkout` | Create a checkout/payment attempt | Authenticated customer |
| `GET /v1/payments/:paymentId` | Read current payment status | Owning customer or admin |
| `GET /v1/payments` | List the signed-in customer's transactions | Authenticated customer |
| `POST /webhooks/bkash/callback` | Receive provider callback/return signal, then verify server-side | Provider-facing; strict validation and rate limits |
| `GET /v1/admin/payments/summary` | Aggregate payment metrics | Admin only |
| `GET /v1/admin/payments` | Search/filter transactions | Admin only |
| `POST /v1/admin/payments/:paymentId/refund` | Request a refund, only if supported and authorized | Admin only; approval/audit required |

The provider callback route is intentionally outside the existing service-token-protected `/v1` middleware. It must not become an unauthenticated way to mark a payment successful. It should only trigger server-side verification and safe state transitions.

## 5. Data model proposal

Add a new migration, for example `002_payments.sql`, with:

- **payments**: internal UUID, customer/user reference (once the app's customer identity model is confirmed), plan/product code, expected amount in minor units, currency (BDT), provider, unique merchant invoice/reference, provider payment/transaction IDs, status, idempotency key, timestamps, and sanitized provider response metadata.
- **payment_events**: append-only event history with event type, source, provider reference, verified flag, sanitized payload, and timestamp.
- **refunds** (later milestone): payment reference, amount in minor units, reason, status, provider refund reference, requester/approver identity, timestamps.
- **admin_audit_logs**: actor identity, action, target, timestamp, and safe metadata for privileged operations.

Use integer minor units for monetary values; never use floating-point arithmetic for amounts. Add unique constraints for invoice/provider transaction identifiers and indexes for customer history, status, and creation time. Define retention and privacy rules before storing provider payloads; never store PINs, OTPs, passwords, access tokens, or unnecessary personal data.

## 6. Security and reliability requirements

- Keep bKash username, password, app key, app secret, and tokens in the hosting secret manager/environment only. Add placeholders to `.env.example`; never commit real values.
- Sandbox and Live must use separate credentials and explicit environment configuration. Default to Sandbox; fail closed if the environment is missing or invalid.
- Never accept the amount, currency, plan price, customer identity, or admin role as authoritative from the browser.
- Implement customer authentication/ownership checks and a distinct admin authorization layer before exposing payment history or admin operations. Do not treat `QUILLSPARK_API_TOKEN` as a customer login or admin role.
- Verify payments server-to-server using the official current bKash API flow. Match amount, currency, merchant invoice/reference, and provider transaction identifiers before marking success.
- Treat timeouts and ambiguous provider responses as `pending/verification_required`; reconcile with provider query APIs before retrying or marking failed.
- Make checkout creation and callback processing idempotent. Duplicate callbacks must not double-credit a customer or duplicate an entitlement.
- Use strict Zod schemas, request size limits, rate limits, safe logging, and redaction of credentials/tokens/provider secrets.
- Validate callback authenticity using the current official provider mechanism where available; regardless, perform server-side payment verification.
- Record state transitions and privileged actions in append-only audit records.
- Do not store or request a customer's bKash PIN or OTP.

## 7. Development milestones and tasks

### Milestone A — contract and foundations
- [ ] Confirm the QuillSpark customer identity, account ownership, plan catalogue, and entitlement model.
- [ ] Review the current official bKash Merchant Checkout documentation and confirm Sandbox onboarding/API version, token lifecycle, checkout, execute/query, callback, transaction search, and refund support.
- [ ] Document provider status mapping and allowed state transitions.
- [ ] Add validated environment configuration with Sandbox as the only enabled mode.
- [ ] Add migration `002_payments.sql` and repeatable migration execution.
- [ ] Add unit tests for amount conversion, status mapping, and state transitions.

### Milestone B — Sandbox checkout
- [ ] Implement isolated bKash client/token service with timeouts and bounded retries.
- [ ] Implement checkout creation with server-side plan pricing and idempotency.
- [ ] Persist payment attempts before contacting the provider.
- [ ] Implement provider return/callback handling as a verification trigger only.
- [ ] Implement server-side execute/query verification and safe pending-state handling.
- [ ] Implement customer status and transaction-history endpoints with ownership checks.
- [ ] Add structured, redacted logs and correlation IDs.

### Milestone C — dashboard and administration
- [ ] Add customer checkout/status/history UI.
- [ ] Add admin authentication and role authorization; do not rely on a client-side hidden button.
- [ ] Add admin transaction search/filter and summary endpoints/UI.
- [ ] Add audit-log views for privileged actions.
- [ ] Add refunds only after confirming official API support and adding approval controls.

### Milestone D — verification and release
- [ ] Test successful, cancelled, failed, expired, duplicate, delayed, and ambiguous/timeout scenarios in Sandbox.
- [ ] Test forged/malformed callback attempts, amount mismatch, invoice mismatch, unauthorized history access, and admin access denial.
- [ ] Test duplicate checkout requests and duplicate callbacks for idempotency.
- [ ] Test reconciliation of pending payments and database failure recovery.
- [ ] Run existing tests and add payment integration tests with mocked provider responses.
- [ ] Confirm existing AI Writing and Terminology Audit tests/routes remain unchanged.
- [ ] Review logs, secrets handling, dependency/security checks, and migration rollback/recovery procedure.
- [ ] Deploy Sandbox to a non-production environment and obtain business-owner acceptance.

### Milestone E — Live eligibility gate (not part of current implementation)
- [ ] An authorized adult/business owner completes bKash merchant onboarding and receives explicit production approval.
- [ ] Confirm production API documentation, account permissions, settlement, refund, dispute, and support procedures directly with bKash.
- [ ] Store production secrets only in the production host's secret manager.
- [ ] Require an explicit release approval and a separate Live enablement change.
- [ ] Run a controlled smoke test and reconciliation before opening customer traffic.

**Live mode must remain disabled until every item in Milestone E is evidenced and approved.** This project plan does not authorize or enable live payments.

## 8. Acceptance criteria

- Sandbox checkout creates one local payment record and one provider checkout for a given idempotency key.
- A payment is marked successful only after server-side provider verification and matching BDT amount/reference.
- Duplicate callbacks and retries do not duplicate payments, entitlements, or ledger effects.
- Customers can access only their own payment records.
- Non-admin users cannot access admin endpoints or refund operations.
- Sensitive credentials and tokens never appear in source control, API responses, or logs.
- Existing QuillSpark writing and terminology-audit functionality continues to pass its tests.
- Live mode is disabled by default and cannot be enabled without the documented approval gate.

## 9. Configuration placeholders

Add only empty placeholders to `backend/.env.example` when implementation begins:

```dotenv
BKASH_ENV=sandbox
BKASH_BASE_URL=
BKASH_USERNAME=
BKASH_PASSWORD=
BKASH_APP_KEY=
BKASH_APP_SECRET=
```

Populate the Sandbox URL and credentials from the official merchant developer portal. Do not paste credentials into GitHub issues, source files, or ChatGPT.

## 10. Deployment and change control

- Keep all work on `feature/bkash-payment-sandbox`.
- Do not push payment changes directly to `main`.
- Open a Pull Request targeting `main` only after Sandbox tests and review pass.
- Do not deploy payment code to the production Manus environment as part of this planning milestone.
- Any Live enablement must be a separately reviewed change after merchant approval.

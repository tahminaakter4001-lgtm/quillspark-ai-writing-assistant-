# bKash Sandbox — Authentication and Authorization Gate

## Status

The Sandbox payment schema and domain foundation exist on `feature/bkash-payment-sandbox`. Checkout endpoints, provider HTTP calls, customer history, and admin operations are intentionally blocked until the application has a trustworthy end-user identity and role model.

## Findings from the current API

Reviewed on the feature branch:

- `backend/src/app.js` applies `requireServiceAuth` to all `/v1` routes.
- `backend/src/auth.js` validates one shared `QUILLSPARK_API_TOKEN`. This is service-to-service authentication, not an end-user session.
- The existing review endpoint accepts `reviewer_id` from the request body. A caller can therefore claim another reviewer ID; it is not an authorization identity.
- No verified customer session, customer ownership middleware, or admin-role authorization was found in the inspected backend entry points.
- The payment schema has a `customer_id` field, but a database column alone does not establish who owns that identity.

## Required controls before payment routes are implemented

1. **End-user authentication:** identify the application's actual login/session provider and validate sessions server-side. Do not accept a customer ID supplied by the browser as proof of identity.
2. **Customer ownership:** derive the customer identity from the validated session. Every payment read, status view, and history query must be scoped to that identity.
3. **Admin authorization:** require a server-verified admin role or permission for transaction-wide views, refunds, and administrative actions. A client-supplied role or reviewer ID is not sufficient.
4. **Service authentication separation:** keep `requireServiceAuth` for trusted server-to-server endpoints only. Do not treat the shared service token as a customer login.
5. **CSRF/session protections:** if browser cookies are used, implement secure, HttpOnly, SameSite cookies and CSRF protection for state-changing requests. If bearer sessions are used, validate issuer, audience, expiry, and signature.
6. **Auditability:** derive actor IDs from authenticated principals and append immutable payment/admin events. Never log credentials, access tokens, full phone numbers, or other payment secrets.
7. **Sandbox isolation:** keep the environment guard locked to Sandbox. Do not add a production endpoint, production credential support, or a Live-mode switch in this phase.

## Payment implementation sequence after the gate is satisfied

1. Add/verify the end-user authentication adapter and tests.
2. Add customer ownership and admin permission middleware with negative authorization tests.
3. Confirm the current bKash merchant Sandbox API contract and merchant onboarding details with the authorized merchant account owner.
4. Implement server-side token handling and create/execute/query flows against Sandbox only.
5. Verify payment status server-to-server before marking an order as paid. Treat browser redirects/callback parameters as untrusted hints, not proof of payment.
6. Add customer-scoped payment history and admin-only transaction views.
7. Add webhook/callback verification only according to the confirmed merchant contract; make processing idempotent.
8. Run backend tests and CI, then review the branch diff. Keep `main` unchanged until an explicitly reviewed pull request is approved.

## Inputs needed from the project owner

- Which existing sign-in/session system does the QuillSpark web application use? Provide its name and the relevant non-secret integration documentation or code path.
- Which server-side claim identifies a customer after session validation (for example, an immutable internal user UUID)?
- How are administrators assigned and verified (existing role table, identity-provider claim, or another server-side mechanism)?
- Provide the current official bKash Sandbox merchant integration document/API version from the authorized merchant onboarding channel. Do not paste usernames, passwords, app keys, app secrets, tokens, or live credentials into chat, issues, or source control.

Until these inputs are confirmed, no customer-facing checkout or admin transaction endpoint should be exposed.

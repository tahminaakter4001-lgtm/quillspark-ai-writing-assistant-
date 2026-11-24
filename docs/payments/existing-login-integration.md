# Existing Email/Password Login — bKash Integration Contract

**Project-owner confirmation:** QuillSpark already has Email/Password Login. Do not create a second login system for bKash.

**Repository finding:** The inspected feature-branch tree contains the Express API backend but no application login/session implementation or frontend auth source. The backend currently exposes a shared service-token guard, not a verified customer session. The payment authorization guards therefore remain intentionally unmounted.

## Integration boundary

The existing application login must remain the source of truth for customer identity. After the existing login/session middleware has validated a session, a small adapter may expose a normalized server-side principal to payment routes:

```js
req.auth = {
  userId: "<immutable internal user ID>",
  roles: ["customer"] // include "admin" only when verified server-side
};
```

This is a contract example, not a claim that the current login already emits these fields. The adapter must map from the actual verified session object—not from request JSON, query parameters, browser storage, or an unverified header.

## Required implementation steps

1. Locate the existing Email/Password login and session-validation code in the web application or its identity service.
2. Confirm password hashes are verified server-side using a modern password-hashing scheme; never expose password hashes to the browser.
3. Identify how the server validates sessions on every protected request (session store or signed token validation).
4. Map the authenticated account's immutable internal ID into `req.auth.userId`.
5. Map administrator privileges only from a trusted server-side role/permission source. A UI flag or client-submitted role is not authorization.
6. Mount `requireCustomerPrincipal` and `requireAdminPrincipal` only after the verified-login adapter.
7. Add route-level tests for unauthenticated access, customer-to-customer payment isolation, non-admin denial, and authorized admin access.
8. Keep `requireServiceAuth` for service-to-service routes; do not reuse the shared `QUILLSPARK_API_TOKEN` as a customer session.

## Acceptance tests

- Existing Email/Password login continues to work unchanged.
- An unauthenticated request cannot create a checkout or read payment history.
- A signed-in customer can read only payments whose stored `customer_id` matches the verified principal.
- A customer cannot access admin payment endpoints, even if they send `role: "admin"` in the request.
- Admin access succeeds only when the server-verified principal contains an authorized admin role.
- Client-supplied `customer_id`, `reviewer_id`, amount, currency, plan price, or role never overrides server-side values.

## Current blocker

The actual login/session source path and the trusted user/role fields are not present in the inspected backend tree. The project owner or repository maintainer must point to the existing login/session implementation (or add that application source to this repository) before the adapter can be wired safely. No credentials, password hashes, session cookies, or tokens should be shared in chat or committed to Git.

## Payment safety boundary

Continue Sandbox-only development. A payment becomes successful only after server-to-server provider verification. Do not enable Live payments or deploy payment processing to production as part of this integration step.

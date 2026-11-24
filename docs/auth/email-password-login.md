# QuillSpark Email/Password Authentication

This feature branch adds a first-party customer-account foundation for the bKash Sandbox work.

## Implemented foundation

- Customer registration and email/password login API routes.
- Passwords are stored as salted scrypt hashes; plaintext passwords are never persisted.
- Opaque, random session tokens are stored only as SHA-256 hashes in PostgreSQL.
- Session cookies are HttpOnly, SameSite=Lax, and Secure in production.
- A separate CSRF token is issued; logout requires the matching cookie, request header, and stored hash.
- New registrations are always assigned the `customer` role. Admin role changes must be performed through a trusted operator/database process, never through public request input.
- Sessions expire after 14 days and can be revoked on logout.

## API

- `POST /v1/auth/register` with `{ "email": "...", "password": "..." }`
- `POST /v1/auth/login` with `{ "email": "...", "password": "..." }`
- `GET /v1/auth/me`
- `POST /v1/auth/logout` with `X-CSRF-Token` matching the `qs_csrf` cookie

Passwords must be 12–128 characters. Registration and login require PostgreSQL.

## Required before production

1. Add a verified email flow (verification token delivery, expiry, resend throttling) before enabling paid account entitlements.
2. Configure the exact frontend origin(s), credentialed CORS, and CSRF protection for every state-changing authenticated route.
3. Add registration/login rate limiting and abuse monitoring at the edge and application layers.
4. Add account recovery with short-lived, single-use reset tokens; never email passwords.
5. Define and audit the admin provisioning process, MFA requirement, and admin session policy.
6. Add customer/admin route guards to payment endpoints; payment ownership must come only from the verified session principal.
7. Run migrations and automated tests against a disposable PostgreSQL database; review cookie behavior on the actual deployment domains.
8. Do not enable live bKash payments without an authorized adult/business owner and bKash merchant approval.

## Important integration note

The existing shared `QUILLSPARK_API_TOKEN` middleware protects service-to-service API routes. It is not customer authentication. Auth routes are deliberately mounted separately. Payment routes remain unavailable until session authentication and admin authorization are explicitly wired and verified.

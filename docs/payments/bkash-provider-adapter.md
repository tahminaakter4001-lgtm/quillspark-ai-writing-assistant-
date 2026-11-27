# bKash Sandbox provider adapter

## Current status

The provider adapter is an intentionally fail-closed scaffold. It defines the
operations QuillSpark expects but makes no outbound HTTP requests. Every method
returns a rejected promise with code
BKASH_PROVIDER_CONTRACT_REQUIRED.

This is deliberate: the official merchant-specific bKash integration contract
has not yet been supplied or verified. Do not infer endpoint URLs, API versions,
headers, token response fields, request payloads, callback signatures, or status
semantics from third-party examples.

## Operations represented

- Grant token
- Refresh token
- Create payment
- Execute payment
- Query payment
- Search transaction
- Refund

## Required before implementing provider calls

1. Obtain the official API specification from the authorized merchant account.
2. Confirm the exact bKash product, Sandbox base URL, API version, authentication
   scheme, endpoint paths, request/response schemas, and callback verification
   procedure.
3. Map the contract into the adapter and add sanitized request/response
   contract tests. Never commit credentials, tokens, or personal data.
4. Keep all outbound calls restricted to Sandbox and BDT.
5. Verify payment status server-to-server before any payment can become
   succeeded. A browser redirect or client callback is not proof of payment.
6. Keep customer access scoped to the authenticated user and administrative
   actions behind a trusted admin role.

## Explicitly not implemented

- No bKash HTTP client or provider endpoint calls
- No token acquisition or refresh
- No checkout, execute, query, transaction search, or refund requests
- No callback/webhook endpoint or signature verification
- No live environment or production payment activation

## Activation gate

The adapter must remain fail-closed until the official merchant contract is
reviewed and the Sandbox contract tests pass. Live payment support is outside
this change and remains disabled.

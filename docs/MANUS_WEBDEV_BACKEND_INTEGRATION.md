# QuillSpark on Manus WebDev — backend integration plan

**Target:** the existing QuillSpark website hosted at `https://quillspark-mlkn2wqs.manus.space/`.

**Preferred deployment:** the website's existing Manus WebDev project/runtime, not a second public Express server.

This plan is intentionally framework-aware: first inspect the existing Manus project and reuse its actual server-side route, authentication, database, and deployment conventions. Do not assume Next.js, Express, a particular folder structure, or a database provider until the project source confirms it.

## What is already in GitHub

The repository contains:
- the canonical Bengali IT glossary at `glossary/bn-it-glossary.json`;
- its JSON schema;
- a deterministic Python terminology audit script and tests;
- the backend reference implementation in `backend/src/` from this PR.

The GitHub repository does **not** contain the live Manus WebDev project source or its task/session identifier. The public website URL alone is not enough to safely patch the application's source.

## Target architecture

```text
QuillSpark browser UI (same Manus site origin)
          |
          | same-origin requests; user session
          v
Manus WebDev server-side routes / backend functions
          |
          +---- approved glossary loader
          |
          +---- deterministic terminology scanner
          |
          +---- OpenAI Responses API (server-side secret)
          |
          +---- Manus project database
                 |-- audit_reports
                 |-- human_reviews (append-only)
```

The browser must never receive the OpenAI key, a backend service token, or database credentials. The browser calls same-origin server routes; the server authenticates the Manus user using the existing project/session mechanism.

## Manus project setup

1. Open the existing QuillSpark WebDev project in the Manus web app (the project that publishes to the target `manus.space` URL). Continue that project; do not create a replacement website.
2. Ask the Manus agent to inspect the complete source tree, framework, existing server-side routes, project authentication, database client/schema, secrets, and deployment configuration before editing.
3. Add `OPENAI_API_KEY` as a **project secret** using Manus WebDev's sensitive secret-entry flow. Add `OPENAI_MODEL` as a normal environment setting only if the existing project supports non-secret environment values. Never put either value in source code, HTML, browser JavaScript, GitHub, logs, or screenshots.
4. Reuse the existing Manus project database. Add migrations/tables only after inspecting its database technology and migration conventions. Do not assume PostgreSQL or copy the standalone Postgres adapter unmodified.
5. Keep the current glossary as the canonical source. If Manus needs a database copy, load it from the repository/file and preserve `glossary.version`, `glossary_id`, term IDs, term status and governance values. Do not create a competing glossary or silently mark terms approved.
6. Implement the server-side routes below using the framework's existing conventions. Do not create a second Express listener or Docker service inside the Manus runtime unless Manus explicitly documents that as the project's supported model.
7. Update the existing QuillSpark UI to call same-origin routes. Preserve the current design, navigation, user data and features.
8. Run unit tests, build checks, and the route smoke tests. Check database persistence and access controls with a test account.
9. Publish a new Manus WebDev checkpoint only after the project owner approves the publish step. Then verify the existing live URL and critical user journeys.

## Server-side API contract

Use the following route semantics. Exact file paths and route syntax must follow the actual Manus project framework.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/quillspark/health` | Return non-secret service status only |
| GET | `/api/quillspark/glossary` | Return approved glossary terms and version |
| POST | `/api/quillspark/paraphrase` | Meaning-preserving Bengali/English rewrite |
| POST | `/api/quillspark/audit` | Deterministic glossary scan plus AI contextual review |
| GET | `/api/quillspark/audits/:auditId` | Return a saved audit report for an authorized user |
| POST | `/api/quillspark/audits/:auditId/reviews` | Append one human decision |
| GET | `/api/quillspark/audits/:auditId/reviews` | Return review history for an authorized user |

### Request shapes

Paraphrase:
```json
{
  "text": "আপনার লেখা এখানে দিন",
  "style": "professional",
  "target_language": "preserve"
}
```

Audit source and target:
```json
{
  "document_name": "user-guide.md",
  "source_text": "Authentication is required.",
  "target_text": "অথেনটিকেশন প্রয়োজন।"
}
```

For a Bengali-only audit, pass `document_text` instead of `source_text` and `target_text`.

Human review:
```json
{
  "finding_id": "QS-DET-001",
  "decision": "approve",
  "note": "Reviewed against the project style guide."
}
```

The server must derive the reviewer identity from the authenticated Manus user session; never trust a browser-provided user ID as proof of identity.

## Functional and governance requirements

- Preserve facts, negation, modality, conditions, dates, numbers, URLs, identifiers, code, placeholders, and protected tokens during paraphrasing.
- Apply only glossary terms whose status is `approved`. Draft and needs-review terms are suggestions, not production policy.
- Keep deterministic findings separate from AI contextual-review findings.
- Use exact evidence excerpts; do not invent line numbers or locations.
- Every suggested fix remains a proposal. Never silently edit the submitted document.
- Human decisions are append-only events: `approve`, `reject`, `revise`, or `defer`.
- A review approval is not an automatic glossary approval and does not automatically apply a document edit.
- Keep audit reports scoped to their authenticated owner/team. Enforce authorization on every read and write.
- Validate request size and schema; apply rate limits, safe error handling, and CSRF/origin protections appropriate to the existing Manus auth model.
- Never log API keys, full prompts containing sensitive user content, or database credentials.
- Use a transaction when creating report/review records where the selected database requires it.

## Acceptance criteria

1. `OPENAI_API_KEY` exists only as a Manus project secret and never appears in the client bundle or repository.
2. Unauthenticated users cannot call protected audit, paraphrase, or review routes.
3. Glossary endpoint returns the repository's approved glossary version and only approved terms.
4. Paraphrase route works in Bengali and English and preserves protected tokens.
5. Audit route returns valid JSON with deterministic and AI findings distinguished.
6. Audit reports persist across page reloads and are only visible to authorized users.
7. Review decisions persist with reviewer identity, timestamp and decision; existing decisions are not overwritten.
8. Draft glossary terms are never auto-approved.
9. Existing app UI and its other features still work.
10. The existing Manus website publishes successfully and the live URL passes smoke tests.

## Important platform boundary

Manus documentation describes WebDev project secrets as encrypted project values and provides a sensitive secret-entry flow. It also documents server-backed hosting, databases, AI features and integrations as WebDev usage. The separate Manus API `website.update` endpoint changes website metadata; publishing is a separate deployment operation. Do not confuse the Manus public API with the app's own server-side route layer.

The ChatGPT GitHub connection can update this repository and PR, but it is not connected to the user's Manus project editor in this conversation. The actual Manus-native source edit must be performed in the existing Manus project task. Do not claim a live Manus deployment until its build and publish status have been checked.

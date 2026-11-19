# QuillSpark Human Review Policy

## Scope
This policy governs candidate terminology in `glossary/software-development-candidates.yaml`. The existing canonical glossary at `glossary/bn-it-glossary.json` remains authoritative for previously approved entries.

## Status
- `Draft`: proposed term; not approved for production.
- `Needs Review`: queued for reviewer evaluation.
- `Approved`: accepted by an authorized human reviewer and eligible for canonical glossary consideration.
- `Rejected`: not accepted.
- `Deprecated`: previously approved term no longer recommended.

## Approval requirements
A reviewer checks technical accuracy, Bengali spelling, consistency with the canonical glossary, definition clarity, context, and duplicate/conflicting forms. Approval must be explicit and recorded in a reviewed change. Automated validation never approves terminology.

## Existing canonical terms
Do not duplicate or silently replace the approved entries listed in the candidate YAML metadata. In particular, retain the canonical Bengali forms already recorded for authentication, authorization, deployment, repository, pull request, and merge.

## Change control
Preserve stable IDs. Submit changes through a pull request, record reviewer decisions, update the changelog, and run validation. Draft entries must not be used as official production terminology.

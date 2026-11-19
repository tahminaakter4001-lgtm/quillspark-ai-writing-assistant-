import test from "node:test";
import assert from "node:assert/strict";
import { isValidServiceToken } from "../src/auth.js";
import { deterministicGlossaryScan, buildAuditReport } from "../src/audit.js";

test("service token comparison rejects missing, short, and mismatched tokens", () => {
  assert.equal(isValidServiceToken(undefined, "x".repeat(64)), false);
  assert.equal(isValidServiceToken("short", "short"), false);
  assert.equal(isValidServiceToken("a".repeat(64), "b".repeat(64)), false);
  assert.equal(isValidServiceToken("a".repeat(64), "a".repeat(64)), true);
});

test("deterministic scan reports only approved forbidden glossary forms", () => {
  const glossary = {
    terms: [
      {
        id: "QS-SEC-001",
        rule_id: "QS-SEC-001",
        source_term: "authentication",
        preferred_bn: "প্রমাণীকরণ",
        forbidden_forms: ["অথেনটিকেশন"],
        severity: "medium",
        status: "approved"
      },
      {
        id: "QS-DRAFT-001",
        source_term: "example",
        preferred_bn: "উদাহরণ",
        forbidden_forms: ["এক্সাম্পল"],
        severity: "low",
        status: "draft"
      }
    ]
  };
  const findings = deterministicGlossaryScan("অথেনটিকেশন দরকার।\nএক্সাম্পল লেখা।", glossary);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].preferred_term, "প্রমাণীকরণ");
  assert.equal(findings[0].location, "line 1");
});

test("report severity counts are computed from findings", () => {
  const report = buildAuditReport({
    documentName: "sample.md",
    glossary: { glossary_id: "quillspark-bn-it", version: "0.1.0", approval: "approved" },
    deterministic: [{ id: "QS-DET-001", severity: "medium" }],
    aiFindings: [{ severity: "high", category: "modality", target_excerpt: "প্রয়োজন", explanation: "Modality shift", suggested_fix: "অবশ্যই", confidence: 0.9 }],
    aiStatus: "complete"
  });
  assert.equal(report.summary.medium, 1);
  assert.equal(report.summary.high, 1);
  assert.equal(report.findings.length, 2);
});

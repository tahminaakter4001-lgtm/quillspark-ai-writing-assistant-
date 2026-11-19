import { randomUUID } from "node:crypto";

export function deterministicGlossaryScan(targetText, glossary) {
  const approved = glossary.terms.filter((term) => term.status === "approved");
  const lines = targetText.split(/\r?\n/);
  const findings = [];

  for (const [lineIndex, line] of lines.entries()) {
    for (const term of approved) {
      for (const forbidden of term.forbidden_forms || []) {
        if (typeof forbidden !== "string" || forbidden.length === 0) continue;
        const haystack = line.toLocaleLowerCase("bn");
        const needle = forbidden.toLocaleLowerCase("bn");
        let from = 0;
        let position;
        while ((position = haystack.indexOf(needle, from)) !== -1) {
          findings.push({
            id: `QS-DET-${String(findings.length + 1).padStart(3, "0")}`,
            severity: term.severity || "medium",
            category: "terminology",
            document: null,
            location: `line ${lineIndex + 1}`,
            source_excerpt: term.source_term,
            target_excerpt: line.trim(),
            found_form: line.slice(position, position + forbidden.length),
            preferred_term: term.preferred_bn,
            explanation: `This exact form is listed as discouraged by approved glossary rule ${term.rule_id || term.id || "unknown"}.`,
            suggested_fix: term.preferred_bn,
            confidence: 1,
            evidence_type: "deterministic_exact_match",
            human_review_required: true
          });
          from = position + Math.max(needle.length, 1);
        }
      }
    }
  }
  return findings;
}

export function buildAuditReport({ documentName, sourceText, targetText, glossary, deterministic, aiFindings, aiStatus, aiError }) {
  const auditId = randomUUID();
  const semantic = (aiFindings || []).map((item, index) => ({
    id: `QS-AI-${String(index + 1).padStart(3, "0")}`,
    severity: item.severity,
    category: item.category,
    document: documentName || null,
    location: null,
    source_excerpt: item.source_excerpt || null,
    target_excerpt: item.target_excerpt,
    explanation: item.explanation,
    suggested_fix: item.suggested_fix || null,
    confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0)),
    evidence_type: "ai_contextual_review",
    human_review_required: true
  }));

  const findings = [
    ...deterministic.map((item) => ({ ...item, document: documentName || null })),
    ...semantic
  ];
  const levels = ["critical", "high", "medium", "low", "info"];
  const counts = Object.fromEntries(levels.map((level) => [
    level, findings.filter((finding) => finding.severity === level).length
  ]));

  return {
    audit_id: auditId,
    status: aiStatus === "complete" ? "complete" : "partial",
    created_at: new Date().toISOString(),
    document: documentName || null,
    glossary: {
      id: glossary.glossary_id,
      version: glossary.version,
      approval: glossary.approval
    },
    review: {
      ai_status: aiStatus,
      human_review_required: findings.some((finding) =>
        ["critical", "high", "medium", "low"].includes(finding.severity)
      )
    },
    summary: counts,
    findings,
    limitations: [
      ...(aiStatus !== "complete" ? [aiError || "AI contextual review was unavailable; only deterministic findings are included."] : []),
      "Suggested fixes are not applied automatically.",
      "Critical and high-impact findings require qualified human review."
    ]
  };
}

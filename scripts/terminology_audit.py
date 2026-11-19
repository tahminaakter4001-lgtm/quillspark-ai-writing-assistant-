#!/usr/bin/env python3
"""Deterministic Bengali terminology checker for Markdown, TXT and DOCX files.

This tool reports glossary-form mismatches only. It does not perform semantic,
translation-quality, modality, or AI-assisted review.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

SUPPORTED = {".md", ".txt", ".docx"}
SEVERITIES = {"critical", "high", "medium", "low"}


def read_document(path: Path) -> list[str]:
    if path.suffix.lower() == ".docx":
        try:
            from docx import Document
        except ImportError as exc:
            raise RuntimeError("DOCX support requires python-docx") from exc
        doc = Document(path)
        lines = [p.text for p in doc.paragraphs]
        for table in doc.tables:
            for row in table.rows:
                lines.append(" | ".join(cell.text for cell in row.cells))
        return lines
    return path.read_text(encoding="utf-8-sig").splitlines()


def load_glossary(path: Path, include_draft: bool) -> tuple[list[dict], dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema_version") != "1.0":
        raise ValueError("glossary schema_version must be '1.0'")
    terms = data.get("terms")
    if not isinstance(terms, list):
        raise ValueError("glossary 'terms' must be an array")
    selected = []
    for index, term in enumerate(terms):
        if not isinstance(term, dict):
            raise ValueError(f"terms[{index}] must be an object")
        for key in ("source_term", "preferred_bn", "status"):
            if not isinstance(term.get(key), str) or not term[key].strip():
                raise ValueError(f"terms[{index}].{key} must be a non-empty string")
        if term["status"] not in {"approved", "draft", "deprecated", "needs_review"}:
            raise ValueError(f"terms[{index}].status is invalid")
        if term["status"] == "approved" or (include_draft and term["status"] == "draft"):
            selected.append(term)
    return selected, data


def discover(inputs: list[Path]) -> list[Path]:
    found = []
    for item in inputs:
        if item.is_file() and item.suffix.lower() in SUPPORTED:
            found.append(item)
        elif item.is_dir():
            found.extend(p for p in item.rglob("*") if p.is_file()
                         and p.suffix.lower() in SUPPORTED
                         and not any(part.startswith(".") for part in p.parts))
        elif not item.exists():
            raise FileNotFoundError(f"Input path does not exist: {item}")
    return sorted(set(p.resolve() for p in found))


def audit(paths: list[Path], terms: list[dict], glossary: dict) -> dict:
    findings = []
    scanned = 0
    for path in paths:
        try:
            lines = read_document(path)
        except Exception as exc:
            findings.append({
                "source_term": "", "found_form": "", "preferred_form": "",
                "category": "parser", "severity": "high",
                "location": str(path), "source_quote": "", "target_quote": "",
                "reason": f"Could not read document: {exc}",
                "suggested_fix": "", "confidence": 1.0,
                "evidence_type": "parser_error", "glossary_status": "n/a"
            })
            continue
        scanned += 1
        for line_no, line in enumerate(lines, 1):
            for term in terms:
                forbidden = term.get("forbidden_forms", [])
                if not isinstance(forbidden, list):
                    raise ValueError(f"forbidden_forms must be an array for {term['source_term']}")
                for form in forbidden:
                    if not isinstance(form, str) or not form:
                        continue
                    for match in re.finditer(re.escape(form), line, flags=re.IGNORECASE):
                        findings.append({
                            "source_term": term["source_term"],
                            "found_form": match.group(0),
                            "preferred_form": term["preferred_bn"],
                            "category": term.get("category", "general"),
                            "severity": term.get("severity", "medium"),
                            "location": f"{path}:{line_no}",
                            "source_quote": term["source_term"],
                            "target_quote": line.strip(),
                            "reason": term.get("note", "Found a glossary-listed discouraged form."),
                            "suggested_fix": term["preferred_bn"],
                            "confidence": 1.0,
                            "evidence_type": "exact_forbidden_form_match",
                            "glossary_status": term["status"]
                        })
    counts = Counter(f["severity"] for f in findings)
    return {
        "report_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tool": "quillspark-deterministic-terminology-audit",
        "audit_scope": "Exact matching of glossary forbidden_forms in supported files.",
        "semantic_review_performed": False,
        "glossary_version": glossary.get("version", "unspecified"),
        "glossary_approval": glossary.get("approval", "unspecified"),
        "documents_discovered": len(paths),
        "documents_scanned": scanned,
        "counts": {level: counts.get(level, 0) for level in ("critical", "high", "medium", "low")},
        "findings": findings,
        "review_required": bool(findings) or glossary.get("approval") != "approved"
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", nargs="+", required=True, help="Files or directories to scan")
    parser.add_argument("--glossary", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--include-draft", action="store_true",
                        help="Use draft terms as provisional review hints (never as approved policy)")
    args = parser.parse_args()
    try:
        terms, glossary = load_glossary(args.glossary, args.include_draft)
        paths = discover([Path(p) for p in args.input])
        report = audit(paths, terms, glossary)
        report["draft_terms_included"] = bool(args.include_draft)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Scanned {report['documents_scanned']} document(s); "
              f"{len(report['findings'])} finding(s).")
        if not paths:
            print("Warning: no supported documents found.", file=sys.stderr)
        if glossary.get("approval") != "approved":
            print("Warning: glossary is not approved; findings are provisional.", file=sys.stderr)
        return 0
    except Exception as exc:
        print(f"Audit failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

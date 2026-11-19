import json
import tempfile
import unittest
from pathlib import Path
from scripts.terminology_audit import audit, discover, load_glossary


class TerminologyAuditTests(unittest.TestCase):
    def test_exact_forbidden_form_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            doc = root / "sample.md"
            glossary_path = root / "glossary.json"
            doc.write_text("অথেনটিকেশন প্রয়োজন।\n", encoding="utf-8")
            glossary_path.write_text(json.dumps({
                "schema_version": "1.0",
                "version": "test",
                "approval": "approved",
                "terms": [{
                    "source_term": "authentication",
                    "preferred_bn": "প্রমাণীকরণ",
                    "forbidden_forms": ["অথেনটিকেশন"],
                    "status": "approved"
                }]
            }, ensure_ascii=False), encoding="utf-8")
            terms, glossary = load_glossary(glossary_path, False)
            report = audit(discover([doc]), terms, glossary)
            self.assertEqual(len(report["findings"]), 1)
            self.assertEqual(report["findings"][0]["location"].split(":")[-1], "1")
            self.assertEqual(report["findings"][0]["preferred_form"], "প্রমাণীকরণ")

    def test_draft_terms_are_opt_in(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "g.json"
            path.write_text(json.dumps({
                "schema_version": "1.0",
                "approval": "draft",
                "terms": [{"source_term": "x", "preferred_bn": "এক্স",
                           "forbidden_forms": ["এক্সএক্স"], "status": "draft"}]
            }), encoding="utf-8")
            self.assertEqual(load_glossary(path, False)[0], [])
            self.assertEqual(len(load_glossary(path, True)[0]), 1)


if __name__ == "__main__":
    unittest.main()

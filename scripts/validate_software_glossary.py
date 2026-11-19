import csv
import json
import sys
from pathlib import Path

import yaml
from jsonschema import validate

ROOT = Path(__file__).resolve().parents[1]
YAML_PATH = ROOT / "glossary/software-development-candidates.yaml"
CSV_PATH = ROOT / "glossary/software-development-candidates.csv"
SCHEMA_PATH = ROOT / "glossary/software-development-candidates.schema.json"

def main():
    data = yaml.safe_load(YAML_PATH.read_text(encoding="utf-8"))
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validate(instance=data, schema=schema)

    terms = data["terms"]
    ids = [term["id"] for term in terms]
    english = [term["english"].strip().casefold() for term in terms]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate term IDs found.")
    if len(english) != len(set(english)):
        raise ValueError("Duplicate English terms found.")
    if any(term["status"] != "Draft" for term in terms):
        raise ValueError("Candidate terms must remain Draft.")

    with CSV_PATH.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != len(terms):
        raise ValueError("CSV/YAML row counts do not match.")

    fields = ["id", "english", "bengali", "definition", "category", "status"]
    for index, (term, row) in enumerate(zip(terms, rows), start=1):
        for field in fields:
            if str(term[field]) != row[field]:
                raise ValueError(f"CSV/YAML mismatch at row {index}, field {field}.")

    print(f"VALIDATION PASSED: {len(terms)} draft terms; CSV matches YAML.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"VALIDATION FAILED: {exc}", file=sys.stderr)
        sys.exit(1)

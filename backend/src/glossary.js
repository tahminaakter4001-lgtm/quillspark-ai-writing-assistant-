import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultGlossaryPath = path.resolve(here, "../../glossary/bn-it-glossary.json");

export async function loadGlossary() {
  const glossaryPath = process.env.QUILLSPARK_GLOSSARY_PATH || defaultGlossaryPath;
  const raw = await readFile(glossaryPath, "utf8");
  const glossary = JSON.parse(raw);

  if (glossary.schema_version !== "1.0" || !Array.isArray(glossary.terms)) {
    throw new Error("The configured glossary has an unsupported shape.");
  }

  for (const [index, term] of glossary.terms.entries()) {
    if (
      !term || typeof term.source_term !== "string" ||
      typeof term.preferred_bn !== "string" ||
      !Array.isArray(term.forbidden_forms) ||
      typeof term.status !== "string"
    ) {
      throw new Error(`Invalid glossary entry at terms[${index}].`);
    }
  }

  return glossary;
}

export function approvedTerms(glossary) {
  return glossary.terms.filter((term) => term.status === "approved");
}

export function auditText(text, glossary = []) {
  const findings = [];
  for (const item of glossary) {
    if (!item.term || !item.preferred) continue;
    const escaped = item.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "giu");
    for (const match of text.matchAll(pattern)) {
      if (match[0] !== item.preferred) {
        findings.push({
          term: match[0],
          preferred: item.preferred,
          category: item.category || "পরিভাষা",
          severity: item.severity || "warning",
          note: item.note || "অনুমোদিত পরিভাষা ব্যবহার করুন।",
          index: match.index
        });
      }
    }
  }
  return findings.sort((a, b) => a.index - b.index);
}

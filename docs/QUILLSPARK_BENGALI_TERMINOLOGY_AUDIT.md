# QuillSpark — বাংলা টার্মিনোলজি অডিট
## Bengali Terminology Audit · Product & Workflow Documentation

**Version:** 0.1.0-draft  
**Languages:** বাংলা ও English  
**Status:** Draft — review required  
**Prepared:** 19 November 2026

> **গুরুত্বপূর্ণ সীমাবদ্ধতা / Important limitation:** এই নথি QuillSpark-এর জন্য adapter-independent audit workflow ও product guide। যাচাইকৃত QuillSpark API contract বা live API connection সরবরাহ করা হয়নি। তাই এখানে কোনো API call, CI run, repository update বা automated audit সম্পন্ন হয়েছে বলে দাবি করা হচ্ছে না।  
> This is an adapter-independent workflow specification, not a verified live API integration.

## সূচিপত্র / Contents
1. [উদ্দেশ্য](#1-উদ্দেশ্য--purpose)
2. [ব্যবহারকারী ও ব্যবহারক্ষেত্র](#2-ব্যবহারকারী--ব্যবহারক্ষেত্র--users--use-cases)
3. [মূল নীতি](#3-মূল-নীতি--core-principles)
4. [অডিট ইনপুট](#4-অডিট-ইনপুট--audit-inputs)
5. [অডিট কার্যপ্রবাহ](#5-অডিট-কার্যপ্রবাহ--audit-workflow)
6. [অডিট মডিউল](#6-অডিট-মডিউল--audit-modules)
7. [Glossary governance](#7-glossary-governance)
8. [Severity ও release policy](#8-severity--release-policy)
9. [রিপোর্ট কাঠামো](#9-রিপোর্ট-কাঠামো--report-structure)
10. [নিরাপত্তা ও protected tokens](#10-নিরাপত্তা--protected-tokens)
11. [Repository ও CI নির্দেশিকা](#11-repository--ci-guidance)
12. [QA checklist ও পরবর্তী পদক্ষেপ](#12-qa-checklist--next-steps)
13. [পরিশিষ্ট: Draft glossary ও JSON template](#13-পরিশিষ্ট--appendix)

## 1. উদ্দেশ্য / Purpose
QuillSpark Bengali Terminology Audit-এর লক্ষ্য বাংলা IT, software, API, product এবং localization documentation-এ পরিভাষার সঠিকতা, একরূপতা ও প্রযুক্তিগত অর্থ অক্ষুণ্ণ রাখা। এটি শুধু বানান পরীক্ষা নয়; source-target meaning, glossary compliance, protected-token integrity, modality এবং document structure-ও যাচাই করে।

**মূল নীতি:** প্রথমে deterministic বা নিয়মভিত্তিক পরীক্ষা, এরপর সন্দেহজনক অংশে context-aware AI review। প্রতিটি finding-এ evidence, location, severity, confidence ও suggested correction থাকতে হবে।

The goal is to preserve terminology accuracy, consistency, and technical meaning across Bengali IT and software documentation. Run deterministic checks first, then context-aware AI review for ambiguous or suspicious segments.

## 2. ব্যবহারকারী ও ব্যবহারক্ষেত্র / Users & Use Cases
- **অনুবাদক ও localization specialist:** অনুমোদিত পরিভাষা অনুসরণ এবং source-target meaning যাচাই।
- **Technical writer:** API reference, user guide, release note ও troubleshooting guide একরূপ রাখা।
- **QA ও reviewer:** উচ্চ-ঝুঁকির ভুল শনাক্ত এবং human-review queue তৈরি।
- **Engineering ও DevOps:** পরিবর্তিত ডকুমেন্টে repeatable audit ও CI policy প্রয়োগ।

## 3. মূল নীতি / Core Principles
1. Approved glossary-ই canonical source; AI-generated term সর্বদা draft candidate।
2. কোনো document নীরবে rewrite করা যাবে না; finding ও suggested fix আলাদা থাকবে।
3. Fuzzy match কেবল review hint—নিশ্চিত ভুল নয়।
4. Contextually valid synonym-কে glossary নিষেধ না করলে violation বলা যাবে না।
5. API documentation অনুপস্থিত থাকলে endpoint, authentication scheme, SDK বা request schema কল্পনা করা যাবে না।
6. কোনো tool সত্যিই কাজ না করলে CI run, build block, commit বা API execution-এর দাবি করা যাবে না।
7. Counts অবশ্যই actual findings থেকে গণনা করতে হবে; line number বা location অনুমান করা যাবে না।

## 4. অডিট ইনপুট / Audit Inputs
সর্বোত্তম ফলাফলের জন্য সরবরাহ করুন:
- English source ও Bengali target; stable segment ID-সহ paired file অগ্রাধিকারযোগ্য।
- Approved glossary/termbase (YAML, JSON, CSV, spreadsheet বা table)।
- Style guide ও modality policy (tone, UI naming, numerals, dates, must/should/may mapping)।
- Protected-token policy (code, URL, key, placeholder কোনগুলো অপরিবর্তনীয়)।
- Document metadata: ID, version, repository path, glossary version ও severity threshold।

Essential input অনুপস্থিত হলে report-এ scope ও confidence limitation স্পষ্টভাবে উল্লেখ করতে হবে.

## 5. অডিট কার্যপ্রবাহ / Audit Workflow
1. **Inventory & parsing:** ফাইল, ভাষা, document ID, source-target pairing, glossary version ও structure শনাক্ত; headings, tables, lists, links ও code fences সংরক্ষণ।
2. **Protected material detection:** code, URL, API path, JSON/YAML key, identifier, variable, file path, version, error code ও placeholder শনাক্ত।
3. **Deterministic scan:** preferred/forbidden form, Unicode variant, number, placeholder, token count ও structure তুলনা; exact match ও fuzzy candidate আলাদা রাখা।
4. **Context-aware review:** meaning, technical concept, negation, condition, modality, quantity, warning ও exception scope যাচাই।
5. **Cross-document consistency:** একই concept-এর Bengali form, product naming, repeated instruction ও contradiction তুলনা।
6. **Severity & human review:** critical/high issue-তে বাধ্যতামূলক human review; ambiguous finding-এ confidence কমানো।
7. **Report & recheck:** JSON/Markdown report তৈরি; approved edit-এর পর protected token ও structure পুনরায় scan।

## 6. অডিট মডিউল / Audit Modules
| Module | কাজ / Purpose |
|---|---|
| Terminology Audit | Preferred/forbidden form, context, category ও glossary adherence যাচাই |
| Bengali Translation QA | Accuracy, omission, addition, fluency, grammar, punctuation ও completeness |
| Terminology Consistency | একই source concept-এর একাধিক Bengali form ও location শনাক্ত |
| Protected Token Validator | Code/API/URL/placeholder/key/version exact preservation পরীক্ষা |
| Modality Checker | must, must not, should, should not, may ও can-এর force/scope তুলনা |
| Glossary Manager | Duplicate, conflict, missing context, status, version ও candidate change পরিচালনা |
| Cross-document Audit | একাধিক নথিতে terminology, naming, modality, structure ও contradiction যাচাই |
| Audit Report Generator | Evidence-backed JSON, Markdown, CSV বা HTML-ready report তৈরি |

## 7. Glossary governance
প্রতিটি entry-তে source term, preferred Bengali form, forbidden forms, category, context, notes, exceptions, status ও optional rule ID থাকা উচিত।

Status:
- **approved:** মানব reviewer অনুমোদিত canonical form।
- **draft:** AI/লেখকের প্রস্তাব; অনুমোদনের আগে review আবশ্যক।
- **deprecated:** আর ব্যবহার না করার নির্দেশ; migration guidance থাকা উচিত।
- **needs_review:** context, conflict বা policy অনিশ্চিত।

AI-generated candidate কখনো নিজে থেকে approved করা যাবে না। Approved glossary overwrite না করে versioned diff ও change log প্রস্তাব করুন.

## 8. Severity & Release Policy
| Severity | বাংলা নীতি | English policy |
|---|---|---|
| Critical | গুরুত্বপূর্ণ command/API identifier/placeholder বা critical numeric/security instruction নষ্ট; correction না হওয়া পর্যন্ত release hold | Material corruption of critical technical tokens or safety/security instructions |
| High | Modality/negation/security meaning materially ভুল বা required token অনুপস্থিত; mandatory human review | Material modality, negation, security, or required-token defect |
| Medium | Forbidden/inconsistent terminology বা glossary mismatch; review queue | Terminology inconsistency or glossary mismatch |
| Low | Punctuation, capitalization বা style-only inconsistency; batch cleanup | Style-only issue suitable for batch cleanup |

Project owners-কে release-blocking threshold অনুমোদন করতে হবে; এই default policy চূড়ান্ত নয়।

## 9. রিপোর্ট কাঠামো / Report Structure
প্রতিটি finding-এ থাকা উচিত:
- `source_term`, `found_form`, `preferred_form`, `category`
- `severity`, `location`, `source_quote`, `target_quote`
- `reason`, `suggested_fix`, `confidence`, `evidence_type`

Location অজানা হলে `unknown` লিখুন। কোনো line number বা count অনুমান করবেন না।

## 10. নিরাপত্তা ও Protected Tokens
Protected material translation বা suggested fix-এর মাধ্যমে পরিবর্তন করা যাবে না। Syntax-aware parser অগ্রাধিকার পাবে; regex-only extraction ব্যবহার করলে limitation report-এ প্রকাশ করুন। Token comparison-এ exact source-target mapping, missing, changed ও unexpected token আলাদা করে দেখান।

## 11. Repository & CI Guidance
প্রস্তাবিত repository layout:
```text
docs/
  QUILLSPARK_BENGALI_TERMINOLOGY_AUDIT.md
  glossary/
    bn-it-glossary.draft.yml
  schemas/
    audit-report.schema.json
  examples/
    audit-report.example.json
```

CI integration কেবল verified implementation, test suite ও approved policy প্রস্তুত হলে যোগ করুন। সম্ভাব্য pipeline: changed-document detection → parsing → deterministic checks → contextual review → report artifact → policy gate. CI status বাস্তবে execute না করলে pass/fail দাবি করবেন না।

## 12. QA Checklist & Next Steps
- [ ] সকল input file ও language inventory-তে নথিভুক্ত।
- [ ] Source-target pairing ও segment ID যাচাই।
- [ ] Glossary version ও approval status উল্লেখ।
- [ ] Protected token exact comparison সম্পন্ন; limitation প্রকাশ।
- [ ] Meaning, negation, modality ও condition যাচাই।
- [ ] প্রতিটি finding-এ evidence, location, severity ও suggested fix আছে।
- [ ] Counts findings থেকে গণনা।
- [ ] AI-generated glossary entry draft হিসেবে চিহ্নিত।
- [ ] Critical/high issue human-review queue-তে আছে।
- [ ] কোনো tool execution বা approval মিথ্যাভাবে দাবি করা হয়নি।

পরবর্তী পদক্ষেপ: project-approved Bengali glossary সংগ্রহ, source/target sample দিয়ে pilot audit, reviewer-দের severity ও modality policy অনুমোদন, তারপর verified API/connector পাওয়া গেলে adapter design ও implementation।

## 13. পরিশিষ্ট / Appendix

### A. Illustrative draft glossary (not approved)
| Source term | প্রস্তাবিত বাংলা | Category | Status |
|---|---|---|---|
| authentication | প্রমাণীকরণ | security | Draft |
| authorization | অনুমোদন | security | Draft |
| deployment | ডিপ্লয়মেন্ট | devops | Draft |
| endpoint | এন্ডপয়েন্ট | api | Draft |
| repository | রিপোজিটরি | development | Draft |
| placeholder | প্লেসহোল্ডার | technical writing | Draft |
| access token | অ্যাক্সেস টোকেন | security | Draft |
| request body | রিকোয়েস্ট বডি | api | Draft |

এগুলো illustrative candidate মাত্র; project-approved terminology নয়। Domain reviewer ও localization lead-এর অনুমোদন ছাড়া ব্যবহার করবেন না।

### B. JSON report template
```json
{
  "document_id": "example-document",
  "glossary_version": "0.1.0-draft",
  "backend": "llm_assisted",
  "overall_status": "review",
  "counts": {"critical": 0, "high": 0, "medium": 0, "low": 0},
  "findings": [],
  "protected_token_check": {
    "status": "review",
    "missing": [],
    "changed": [],
    "unexpected": []
  },
  "consistency_variants": [],
  "review_required": true
}
```

### C. Example finding
```json
{
  "source_term": "authentication",
  "found_form": "অথেনটিকেশন",
  "preferred_form": "প্রমাণীকরণ",
  "category": "terminology",
  "severity": "medium",
  "location": "Section 2, Segment 14",
  "source_quote": "Authentication is required.",
  "target_quote": "অথেনটিকেশন প্রয়োজন।",
  "reason": "The found form conflicts with the illustrative draft glossary.",
  "suggested_fix": "প্রমাণীকরণ প্রয়োজন।",
  "confidence": 0.88,
  "evidence_type": "contextual_ai"
}
```

### D. Key terms
| English | বাংলা |
|---|---|
| Termbase | পরিভাষা-ভান্ডার |
| Protected token | অপরিবর্তনীয় টোকেন |
| Modality | বাধ্যবাধকতা/অনুমতির মাত্রা |
| Deterministic check | নিয়মভিত্তিক যাচাই |
| Contextual review | প্রসঙ্গভিত্তিক পর্যালোচনা |
| Human review queue | মানব পর্যালোচনা তালিকা |

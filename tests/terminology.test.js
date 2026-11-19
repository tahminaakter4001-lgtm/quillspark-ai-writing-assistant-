import test from "node:test";
import assert from "node:assert/strict";
import { auditText } from "../src/lib/audit.js";

test("finds non-preferred glossary terms", () => {
  const result = auditText("ইউজার ডাটা পাঠায়", [
    {term:"ইউজার",preferred:"ব্যবহারকারী"},
    {term:"ডাটা",preferred:"ডেটা"}
  ]);
  assert.equal(result.length,2);
  assert.deepEqual(result.map(item => item.preferred),["ব্যবহারকারী","ডেটা"]);
});
test("does not flag preferred wording", () => {
  assert.equal(auditText("ব্যবহারকারী ডেটা পাঠায়",[
    {term:"ব্যবহারকারী",preferred:"ব্যবহারকারী"},
    {term:"ডেটা",preferred:"ডেটা"}
  ]).length,0);
});
test("returns no findings for empty glossary", () => {
  assert.deepEqual(auditText("একটি বাক্য",[]),[]);
});

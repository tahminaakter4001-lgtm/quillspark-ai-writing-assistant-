import "./styles.css";
import glossary from "../data/glossary.json";
import { auditText } from "./lib/audit.js";

const app = document.querySelector("#app");
let activeTab = "write";

app.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <a class="brand" href="#"><span class="brand-mark">Q</span><span>QuillSpark<small>WRITING WORKSPACE</small></span></a>
      <p class="nav-label">WORKSPACE</p>
      <button class="nav-item active" data-tab="write">✍️ <span>AI Writing</span></button>
      <button class="nav-item" data-tab="audit">🔎 <span>Terminology Audit</span></button>
      <div class="sidebar-note"><span class="dot"></span> বাংলা + English support</div>
      <div class="sidebar-bottom">A clearer way to write.</div>
    </aside>
    <main class="main">
      <header class="topbar"><div><span class="eyebrow">YOUR CREATIVE WORKSPACE</span><h1 id="page-title">AI Writing Assistant</h1></div><span class="status"><i></i> Workspace ready</span></header>
      <section class="intro"><div><span class="eyebrow">WRITE WITH CLARITY</span><h2>ভাবনাকে প্রকাশ করুন <span>আরও স্পষ্টভাবে।</span></h2><p>বাংলা ও ইংরেজিতে লিখুন, সম্পাদনা করুন এবং পরিভাষার সামঞ্জস্য যাচাই করুন।</p></div><div class="spark">✳</div></section>
      <section id="workspace"></section>
      <footer>QuillSpark <span>•</span> Your words, made clearer.</footer>
    </main>
  </div>`;

const workspace = document.querySelector("#workspace");
function render() {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === activeTab));
  document.querySelector("#page-title").textContent = activeTab === "write" ? "AI Writing Assistant" : "Bengali Terminology Audit";
  workspace.innerHTML = activeTab === "write" ? writeView() : auditView();
  if (activeTab === "write") bindWriter();
  else bindAudit();
}
function writeView() {
 return `<div class="panel"><div class="panel-head"><div><h3>Writing studio</h3><p>আপনার খসড়া লিখুন, তারপর একটি কাজ বেছে নিন।</p></div><span class="tag">AI ASSISTED</span></div>
 <label for="writing-input">YOUR TEXT</label><textarea id="writing-input" placeholder="এখানে আপনার লেখা লিখুন..."></textarea>
 <div class="action-row"><label for="writing-mode" class="sr-only">Writing action</label><select id="writing-mode"><option value="rewrite">Rewrite / উন্নত করুন</option><option value="summarize">Summarize / সংক্ষিপ্ত করুন</option><option value="translate">Translate / অনুবাদ করুন</option><option value="grammar">Grammar / ব্যাকরণ ঠিক করুন</option><option value="draft">Create draft / খসড়া লিখুন</option></select><button class="primary" id="generate">Generate <span>↗</span></button></div>
 <div id="writing-result" class="result empty">আপনার ফলাফল এখানে দেখা যাবে।</div><p class="hint">AI ব্যবহারের জন্য সার্ভারে OPENAI_API_KEY সেট করতে হবে।</p></div>`;
}
function auditView() {
 return `<div class="panel"><div class="panel-head"><div><h3>Terminology checker</h3><p>গ্লসারির সঙ্গে মিলিয়ে বাংলা IT লেখার পরিভাষা যাচাই করুন।</p></div><span class="tag">RULE-BASED</span></div>
 <label for="audit-input">DOCUMENT TEXT</label><textarea id="audit-input" placeholder="যে বাংলা IT ডকুমেন্টটি যাচাই করতে চান, এখানে পেস্ট করুন..."></textarea>
 <div class="action-row"><span class="hint">Glossary entries: ${glossary.length}</span><button class="primary" id="run-audit">Run audit <span>↗</span></button></div><div id="audit-result" class="result empty">অডিট রিপোর্ট এখানে দেখা যাবে।</div></div>`;
}
function bindWriter() {
 document.querySelector("#generate").addEventListener("click", async () => {
  const text = document.querySelector("#writing-input").value.trim();
  const result = document.querySelector("#writing-result");
  if (!text) { result.textContent = "প্রথমে কিছু লেখা যোগ করুন।"; return; }
  const button = document.querySelector("#generate"); button.disabled = true; button.textContent = "Working…";
  try {
   const response = await fetch("/api/ai", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,mode:document.querySelector("#writing-mode").value,language:"auto"})});
   const data = await response.json(); if (!response.ok) throw new Error(data.error || "Request failed");
   result.className = "result"; result.textContent = data.output;
  } catch (error) { result.className = "result error"; result.textContent = error.message; }
  finally { button.disabled = false; button.innerHTML = 'Generate <span>↗</span>'; }
 });
}
function bindAudit() {
 document.querySelector("#run-audit").addEventListener("click", () => {
  const text = document.querySelector("#audit-input").value;
  const findings = auditText(text, glossary), result = document.querySelector("#audit-result");
  result.className = "result";
  if (!text.trim()) { result.textContent = "প্রথমে ডকুমেন্টের লেখা যোগ করুন।"; return; }
  if (!findings.length) { result.innerHTML = '<div class="success">✓ গ্লসারির সঙ্গে কোনো অসামঞ্জস্য পাওয়া যায়নি।</div>'; return; }
  result.innerHTML = `<div class="report-summary"><strong>${findings.length}টি সম্ভাব্য পরিভাষা সমস্যা</strong><span>Rule-based review</span></div><div class="finding-list">${findings.map(f => `<div class="finding"><span class="severity ${f.severity}">${f.severity}</span><div><strong>${escapeHtml(f.term)} → ${escapeHtml(f.preferred)}</strong><p>${escapeHtml(f.note)}</p></div></div>`).join("")}</div>`;
 });
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => { activeTab = b.dataset.tab; render(); }));
render();

#!/usr/bin/env node
/* ---------------------------------------------------------------------------
 * Normalize payment-mode labels across the demo fixtures.
 *
 * The captured fixtures carry free-text payment-mode names ("Mobile Payments",
 * "Bank Credit Cards", "Online Bank Transfers", "E-wallet", …). The app should
 * only ever show the canonical vocabulary:
 *
 *   Cash · Advance Deposit · Credit Card · Debit Card · Net Banking · UPI · Others
 *
 * This script rewrites every payment-mode mix block (paymentModeMix,
 * refundByMode, advanceModeMix, pharmaPayMix, paymentModeSummary) — remapping
 * each label and SUMMING rows that collapse to the same bucket — and remaps the
 * "top payment/refund mode" KPI values + their descriptions. Idempotent: run it
 * again after re-capturing fixtures.
 *
 *   node scripts/normalize-payment-modes.js
 * --------------------------------------------------------------------------- */
const fs = require("fs");
const path = require("path");

const FIX_DIR = path.join(__dirname, "..", "src", "pages", "analytics", "demo", "fixtures");

// Raw → canonical. Longer keys first for safe substring replacement in prose.
const MAP = [
  ["Bank Credit Cards", "Credit Card"],
  ["Bank Debit Cards", "Debit Card"],
  ["Online Bank Transfers", "Net Banking"],
  ["Bank Transfers", "Net Banking"],
  ["Mobile Payments", "UPI"],
  ["E-wallet Payments", "Others"],
  ["E-wallet", "Others"],
  ["Cash Payment", "Cash"],
  ["Unspecified", "Others"],
  ["UPI", "UPI"],
  ["Cash", "Cash"],
];
const canon = (s) => {
  const hit = MAP.find(([raw]) => raw.toLowerCase() === String(s).trim().toLowerCase());
  return hit ? hit[1] : String(s);
};

// Blocks shaped { columns:[{key},…], rows:[{<labelKey>, amount}] } where one
// column is the mode label and `amount` is the only measure.
const MODE_BLOCKS = new Set(["paymentModeMix", "refundByMode", "advanceModeMix", "pharmaPayMix", "paymentModeSummary"]);
const LABEL_KEYS = ["k", "payment_mode", "paymentMode", "mode"];
// paymentModeSummary measures are split across two fields, not a single `amount`.
const MEASURE_KEYS = ["amount", "receivedAmount", "refundedAmount"];

function remapBlock(block) {
  if (!block || !Array.isArray(block.rows)) return;
  const labelKey = LABEL_KEYS.find((k) => block.rows.some((r) => r && typeof r[k] === "string"));
  if (!labelKey) return;
  const measures = MEASURE_KEYS.filter((m) => block.rows.some((r) => r && typeof r[m] === "number"));
  const rows = [];
  const merged = new Map();
  for (const row of block.rows) {
    if (!row || typeof row[labelKey] !== "string") { rows.push(row); continue; }
    const key = canon(row[labelKey]);
    if (!merged.has(key)) {
      const clone = { ...row, [labelKey]: key };
      merged.set(key, clone);
      rows.push(clone); // collapsed duplicates fold into this clone, not a new row
    } else {
      const tgt = merged.get(key);
      for (const m of measures) tgt[m] = (Number(tgt[m]) || 0) + (Number(row[m]) || 0);
    }
  }
  // Re-sort by the primary measure (desc) when there is one.
  if (measures.length) rows.sort((a, b) => (Number(b[measures[0]]) || 0) - (Number(a[measures[0]]) || 0));
  block.rows = rows;
}

const MODE_KPI_KEY = /mode/i; // kpi.key like topMode / topPayMode / topRefundMode
function remapKpiValue(s) {
  let out = String(s);
  for (const [raw, c] of MAP) out = out.split(raw).join(c); // longest-first substring replace
  return out;
}

function walk(node) {
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (MODE_BLOCKS.has(k) && v && typeof v === "object") remapBlock(v);
    // KPI objects: { key:'topPayMode', value:'Bank Credit Cards', description:'…' }
    if (k === "value" && typeof v === "string" && typeof node.key === "string" && MODE_KPI_KEY.test(node.key)) {
      node.value = remapKpiValue(v);
      if (typeof node.description === "string") node.description = remapKpiValue(node.description);
    }
    walk(v);
  }
}

let changed = 0;
for (const file of fs.readdirSync(FIX_DIR).filter((f) => f.endsWith(".json"))) {
  const p = path.join(FIX_DIR, file);
  const before = fs.readFileSync(p, "utf8");
  const json = JSON.parse(before);
  walk(json);
  // Preserve each file's existing formatting density (some fixtures are minified).
  const pretty = /^\s*\{\s*\n\s+"/.test(before);
  const trailingNL = before.endsWith("\n");
  const out = (pretty ? JSON.stringify(json, null, 2) : JSON.stringify(json)) + (trailingNL ? "\n" : "");
  if (out !== before) { fs.writeFileSync(p, out); changed++; console.log("normalized", file); }
}
console.log(`\nDone — ${changed} fixture file(s) updated.`);

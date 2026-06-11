#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "src");
const exts = new Set([".js", ".jsx", ".ts", ".tsx", ".css", ".scss"]);

const patterns = [
  /import\\s+[^;]*?\\.(png|jpe?g)\\b/gi,
  /require\\(\\s*['\"][^'\"]+\\.(png|jpe?g)\\b/gi,
  /url\\(\\s*['\"]?[^'\")]+\\.(png|jpe?g)\\b/gi,
];

const hits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!exts.has(path.extname(entry.name))) continue;
    const text = fs.readFileSync(full, "utf8");
    for (const re of patterns) {
      let m;
      while ((m = re.exec(text))) {
        const idx = m.index;
        const line = text.slice(0, idx).split("\\n").length;
        hits.push({
          file: full,
          line,
          match: m[0].slice(0, 200),
        });
      }
    }
  }
}

walk(ROOT);

if (hits.length) {
  console.error("PNG/JPG references found in imports/require/url():");
  for (const h of hits) {
    const rel = path.relative(path.resolve(__dirname, ".."), h.file);
    console.error(`- ${rel}:${h.line}  ${h.match}`);
  }
  process.exit(1);
}

console.log("OK: No PNG/JPG imports/require/url() found in src/");

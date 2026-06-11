/**
 * Collapses consecutive `const x = ASSETS.images.key` / `ASSETS.mobile.key` /
 * `const t = ASSETS.images` + `const x = t.key` into a single destructuring block.
 * Run: node scripts/consolidate-assets-destructure.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "../src");

const DIRECT_RE = /^\s*const\s+(\w+)\s*=\s*ASSETS\.(images|mobile)\.(\w+)\s*;\s*$/;
const ALIAS_RE =
  /^\s*const\s+(\w+)\s*=\s*ASSETS\.(images|mobile)\s*;\s*$/;
const FROM_ALIAS_RE = /^\s*const\s+(\w+)\s*=\s*(\w+)\.(\w+)\s*;\s*$/;

function formatBlock(pairs, namespace) {
  const inner = pairs
    .map(({ key, local }) =>
      key === local ? `  ${key},` : `  ${key}: ${local},`
    )
    .join("\n");
  return `const {\n${inner}\n} = ASSETS.${namespace};`;
}

function tryDirectBlock(lines, start) {
  const pairs = [];
  let i = start;
  let ns = null;
  while (i < lines.length) {
    const m = lines[i].match(DIRECT_RE);
    if (!m) break;
    const [, local, namespace, key] = m;
    if (ns === null) ns = namespace;
    if (namespace !== ns) break;
    pairs.push({ key, local });
    i++;
  }
  if (pairs.length < 2) return null;
  return { end: i, pairs, namespace: ns };
}

function tryAliasBlock(lines, start) {
  const m0 = lines[start]?.match(ALIAS_RE);
  if (!m0) return null;
  const aliasVar = m0[1];
  const namespace = m0[2];
  const pairs = [];
  let i = start + 1;
  while (i < lines.length) {
    const m = lines[i].match(FROM_ALIAS_RE);
    if (!m || m[2] !== aliasVar) break;
    pairs.push({ key: m[3], local: m[1] });
    i++;
  }
  if (pairs.length < 2) return null;
  return { end: i, pairs, namespace, skipFirst: true };
}

function processContent(content) {
  const lines = content.split("\n");
  const out = [];
  let i = 0;
  let changed = false;

  while (i < lines.length) {
    const aliasTry = tryAliasBlock(lines, i);
    if (aliasTry) {
      out.push(formatBlock(aliasTry.pairs, aliasTry.namespace));
      i = aliasTry.end;
      changed = true;
      continue;
    }

    const directTry = tryDirectBlock(lines, i);
    if (directTry) {
      out.push(formatBlock(directTry.pairs, directTry.namespace));
      i = directTry.end;
      changed = true;
      continue;
    }

    out.push(lines[i]);
    i++;
  }

  return { text: out.join("\n"), changed };
}

function walk(dir, files) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "build") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else if (/\.(js|jsx)$/.test(e.name)) files.push(full);
  }
}

const files = [];
walk(SRC, files);
let n = 0;
for (const f of files) {
  if (f.includes("consolidate-assets-destructure")) continue;
  const raw = fs.readFileSync(f, "utf8");
  if (!raw.includes("ASSETS.")) continue;
  const { text, changed } = processContent(raw);
  if (changed && text !== raw) {
    fs.writeFileSync(f, text, "utf8");
    n++;
    console.log(f);
  }
}
console.log("Updated", n, "files");

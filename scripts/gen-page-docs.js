/* Regenerates src/pages/analytics/docs/pageDocs.js from the authored docs JSON
 * + docs/analytics-planning/dev-docs/MASTER-API.md. Run: node scripts/gen-page-docs.js <authored.json>
 */
const fs = require("fs");

const src = process.argv[2];
const j = JSON.parse(fs.readFileSync(src, "utf8"));
const sections = j.result || j;
const master = fs.readFileSync("docs/analytics-planning/dev-docs/MASTER-API.md", "utf8");
const scope = fs.readFileSync("docs/analytics-planning/dev-docs/SCOPE.md", "utf8");
const scopeIpd = fs.readFileSync("docs/analytics-planning/dev-docs/SCOPE-IPD.md", "utf8");

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

let out = "// AUTO-GENERATED (scripts/gen-page-docs.js). One entry per analytics leaf:\n";
out += "// { title, explanatory, api }. explanatory = what the page is, for doctors and\n";
out += "// admins; api = backend-developer spec (routes, sources, missing feeds).\n";
out += "// Rendered in the page-info drawer; downloadable as .md and as the full ZIP.\n";
out += "/* eslint-disable */\n";
out += "export const PAGE_DOCS = {\n";
for (const s of sections) {
  out += `  ${JSON.stringify(s.key)}: {\n    title: ${JSON.stringify(s.title)},\n    explanatory: \`${esc(s.explanatory)}\`,\n    api: \`${esc(s.api)}\`,\n  },\n`;
}
out += `  "master_api": {\n    title: "Master APIs (OPD + IPD)",\n    explanatory: \`${esc(master)}\`,\n    api: \`${esc(master)}\`,\n  },\n`;
out += `  "project_scope": {\n    title: "OPD Analytics: the complete project",\n    explanatory: \`${esc(scope)}\`,\n    api: \`${esc(master)}\`,\n  },\n`;
out += `  "project_scope_ipd": {\n    title: "IPD Analytics: the complete project",\n    explanatory: \`${esc(scopeIpd)}\`,\n    api: \`${esc(master)}\`,\n  },\n`;
out += "};\n";
fs.writeFileSync("src/pages/analytics/docs/pageDocs.js", out);
console.log("pageDocs.js:", out.length, "bytes,", sections.length + 1, "entries");

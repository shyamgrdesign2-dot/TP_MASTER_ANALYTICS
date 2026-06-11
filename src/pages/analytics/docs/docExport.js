// Client-side doc downloads: single .md files and the full documentation ZIP.
// The ZIP is built with a minimal STORE-only (no compression) encoder so we
// need no new dependency; every reader (Finder, Explorer, unzip) accepts it.
import { PAGE_DOCS } from "./pageDocs";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const enc = new TextEncoder();
const le16 = (v) => [v & 0xff, (v >> 8) & 0xff];
const le32 = (v) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];

/** files: [{ name, text }] → Blob of a valid STORE zip. */
function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameB = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const local = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, ...le16(20), ...le16(0), ...le16(0), ...le16(0), ...le16(0),
      ...le32(crc), ...le32(data.length), ...le32(data.length), ...le16(nameB.length), ...le16(0),
    ]);
    chunks.push(local, nameB, data);
    central.push({ nameB, crc, size: data.length, offset });
    offset += local.length + nameB.length + data.length;
  }
  const cdStart = offset;
  for (const c of central) {
    const hdr = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, ...le16(20), ...le16(20), ...le16(0), ...le16(0), ...le16(0), ...le16(0),
      ...le32(c.crc), ...le32(c.size), ...le32(c.size), ...le16(c.nameB.length), ...le16(0), ...le16(0),
      ...le16(0), ...le16(0), ...le32(0), ...le32(c.offset),
    ]);
    chunks.push(hdr, c.nameB);
    offset += hdr.length + c.nameB.length;
  }
  const end = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, ...le16(0), ...le16(0), ...le16(central.length), ...le16(central.length),
    ...le32(offset - cdStart), ...le32(cdStart), ...le16(0),
  ]);
  chunks.push(end);
  return new Blob(chunks, { type: "application/zip" });
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadPageGuide(leafKey) {
  const d = PAGE_DOCS[leafKey];
  if (!d) return;
  saveBlob(new Blob([`# ${d.title}\n\n${d.explanatory}\n`], { type: "text/markdown" }), `${leafKey}-guide.md`);
}

export function downloadMasterApi() {
  const d = PAGE_DOCS.master_api;
  if (!d) return;
  saveBlob(new Blob([d.explanatory], { type: "text/markdown" }), "MASTER-API.md");
}

export function downloadScope(leaf = "project_scope") {
  const d = PAGE_DOCS[leaf];
  if (!d) return;
  saveBlob(new Blob([d.explanatory], { type: "text/markdown" }), leaf === "project_scope_ipd" ? "SCOPE-IPD.md" : "SCOPE.md");
}

export function downloadPageApiSpec(leafKey) {
  const d = PAGE_DOCS[leafKey];
  if (!d) return;
  saveBlob(new Blob([`# ${d.title}: backend API spec\n\n${d.api}\n`], { type: "text/markdown" }), `${leafKey}-api-spec.md`);
}

/** Full docs ZIP: master index + architecture + per-section guide and API spec. */
export function downloadFullDocsZip() {
  const keys = Object.keys(PAGE_DOCS).filter((k) => k !== "architecture" && k !== "master_api" && k !== "project_scope" && k !== "project_scope_ipd");
  const arch = PAGE_DOCS.architecture;
  let index = "# TatvaCare OPD Analytics: documentation pack\n\n";
  index += "Start with `architecture.md` (the master overview). Then one pair of files per section:\n";
  index += "`<section>.md` explains the page for doctors, admins and users; `<section>-api.md` is the\n";
  index += "backend developer spec (routes, sources, formulas, and the missing feeds with contracts).\n\n";
  index += "## Files in this pack\n\n- INDEX.md (this file)\n- SCOPE.md (the OPD module: what it is, for whom, the rules)\n- SCOPE-IPD.md (the IPD module: pages, documentation model, bed management, gaps)\n- MASTER-API.md (the OPD Master APIs: every API we have with why, every API we need with contract hints)\n- architecture.md\n- architecture-api.md\n";
  keys.forEach((k) => { index += `- ${k}.md / ${k}-api.md (${PAGE_DOCS[k].title})\n`; });
  const files = [{ name: "INDEX.md", text: index }];
  if (PAGE_DOCS.project_scope) files.push({ name: "SCOPE.md", text: PAGE_DOCS.project_scope.explanatory });
  if (PAGE_DOCS.project_scope_ipd) files.push({ name: "SCOPE-IPD.md", text: PAGE_DOCS.project_scope_ipd.explanatory });
  if (PAGE_DOCS.master_api) files.push({ name: "MASTER-API.md", text: PAGE_DOCS.master_api.explanatory });
  if (arch) {
    files.push({ name: "architecture.md", text: `# ${arch.title}\n\n${arch.explanatory}\n` });
    files.push({ name: "architecture-api.md", text: `# ${arch.title}: backend notes\n\n${arch.api}\n` });
  }
  keys.forEach((k) => {
    const d = PAGE_DOCS[k];
    files.push({ name: `${k}.md`, text: `# ${d.title}\n\n${d.explanatory}\n` });
    files.push({ name: `${k}-api.md`, text: `# ${d.title}: backend API spec\n\n${d.api}\n` });
  });
  saveBlob(buildZip(files), "tatvacare-opd-analytics-docs.zip");
}

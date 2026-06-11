import React from "react";
import { Drawer, Button, Divider } from "antd";
import { DocumentDownload, DocumentText } from "iconsax-reactjs";
import { PAGE_DOCS } from "../docs/pageDocs";
import { downloadPageGuide, downloadPageApiSpec, downloadFullDocsZip, downloadMasterApi, downloadScope } from "../docs/docExport";

/* Minimal markdown rendering: headings, bullets, bold, inline code, tables are
 * shown as preformatted rows. Deliberately tiny: no dependency, safe output. */
function MdView({ md }) {
  const lines = String(md || "").split("\n");
  const out = [];
  let list = null;
  const flush = () => {
    if (list) { out.push(<ul key={`ul${out.length}`} className="apid__ul">{list}</ul>); list = null; }
  };
  const inline = (s) =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
      if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`")) return <code key={i} className="apid__code">{part.slice(1, -1)}</code>;
      return part;
    });
  lines.forEach((ln, i) => {
    if (/^###\s/.test(ln)) { flush(); out.push(<h4 key={i} className="apid__h4">{inline(ln.replace(/^###\s/, ""))}</h4>); }
    else if (/^##\s/.test(ln)) { flush(); out.push(<h3 key={i} className="apid__h3">{inline(ln.replace(/^##\s/, ""))}</h3>); }
    else if (/^#\s/.test(ln)) { flush(); out.push(<h3 key={i} className="apid__h3">{inline(ln.replace(/^#\s/, ""))}</h3>); }
    else if (/^\s*[-*]\s/.test(ln)) { (list = list || []).push(<li key={i}>{inline(ln.replace(/^\s*[-*]\s/, ""))}</li>); }
    else if (/^\|/.test(ln)) { flush(); if (!/^\|[\s:-]+\|/.test(ln)) out.push(<div key={i} className="apid__trow">{inline(ln.replace(/^\||\|$/g, "").split("|").join("  ·  "))}</div>); }
    else if (/^>/.test(ln)) { flush(); out.push(<div key={i} className="apid__quote">{inline(ln.replace(/^>\s?/, ""))}</div>); }
    else if (ln.trim() === "") { flush(); }
    else { flush(); out.push(<p key={i} className="apid__p">{inline(ln)}</p>); }
  });
  flush();
  return <div className="apid__md">{out}</div>;
}

/** The page-info drawer: what this page is about, plus the downloadable docs
 *  (this page's guide, its backend API spec, the master API file, and the full
 *  documentation ZIP). Opened from the info icon next to every page heading. */
export default function PageInfoDrawer({ leaf, title, open, onClose, project = false }) {
  const doc = PAGE_DOCS[leaf];
  return (
    <Drawer
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <DocumentText size={18} color="var(--tp-blue-500)" />
          About: {doc?.title || title}
        </span>
      }
      placement="right"
      width={560}
      open={open}
      onClose={onClose}
      className="tp-analytics"
    >
      <div className="apid">
        <div className="apid__dl">
          {project ? (
            <>
              <Button size="small" icon={<DocumentDownload size={13} />} onClick={() => downloadScope(leaf)}>
                Project scope (.md)
              </Button>
              <Button size="small" icon={<DocumentDownload size={13} />} onClick={downloadMasterApi}>
                Master APIs (.md)
              </Button>
            </>
          ) : (
            <>
              <Button size="small" icon={<DocumentDownload size={13} />} onClick={() => downloadPageGuide(leaf)} disabled={!doc}>
                Page guide (.md)
              </Button>
              <Button size="small" icon={<DocumentDownload size={13} />} onClick={() => downloadPageApiSpec(leaf)} disabled={!doc}>
                Backend API spec (.md)
              </Button>
            </>
          )}
          <Button size="small" type="primary" icon={<DocumentDownload size={13} />} onClick={downloadFullDocsZip}>
            Full documentation (.zip)
          </Button>
        </div>
        <Divider style={{ margin: "14px 0" }} />
        {doc ? (
          <MdView md={doc.explanatory} />
        ) : (
          <p className="apid__p">No documentation entry exists for this page yet.</p>
        )}
      </div>
    </Drawer>
  );
}

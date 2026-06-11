import React from "react";
export function DocumentAttachmentBubble({ documents }) {
  if (!documents?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {documents.map((doc) => (
        <div key={doc.id} style={{ fontSize: 12, color: "#64748b", padding: "4px 8px", background: "#f1f5f9", borderRadius: 6 }}>{doc.fileName}</div>
      ))}
    </div>
  );
}

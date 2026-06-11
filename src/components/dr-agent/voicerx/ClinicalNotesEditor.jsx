import React, { useEffect, useRef } from "react";

export { emrSectionsToHtml } from "./emrUtils";

export function ClinicalNotesEditor({ value, html, onChange, readOnly = false }) {
  const ref = useRef(null);
  const content = value ?? html ?? "";

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (node.innerHTML !== content) node.innerHTML = content;
  }, [content]);

  const handleInput = (e) => {
    if (readOnly || !onChange) return;
    onChange(e.currentTarget.innerHTML);
  };

  return (
    <div
      ref={ref}
      className="vrx-clinical-notes-editor"
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onInput={handleInput}
      style={{
        outline: "none",
        padding: "16px 18px",
        fontSize: 13.5,
        lineHeight: 1.55,
        color: "#1f2937",
        fontFamily: "Inter, system-ui, sans-serif",
        background: "transparent",
        minHeight: 120,
        whiteSpace: "normal",
        wordBreak: "break-word"
      }}
    />
  );
}

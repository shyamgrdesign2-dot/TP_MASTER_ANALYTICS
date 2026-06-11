import React from "react";
import SmartHealthCheckupEditor from "./SmartHealthCheckupEditor";

function HealthCheckupDocument({
  documentRef,
  editable = false,
  useSmartEditor = false,
  smartEditorHtml = "",
  onSmartEditorChange = null,
  smartEditorRef = null,
  hideSmartToolbar = true,
  toolbarSlotRef = null,
}) {
  return (
    <div
      ref={documentRef}
      className="health-checkup-editor__document-paper"
      style={{ minHeight: 0, height: "fit-content", boxSizing: "border-box" }}
    >
        {/* Document Body — header is inside the Smart Editor iframe */}
      <div
        className="health-checkup-editor__document-body-wrap"
        style={{ minHeight: "0", flex: "1", width: "100%" }}
      >
        {useSmartEditor ? (
          <SmartHealthCheckupEditor
            ref={smartEditorRef}
            value={smartEditorHtml}
            onChange={onSmartEditorChange}
            readonly={!editable}
            className="health-checkup-editor__smart-editor-wrap"
            hideToolbar={toolbarSlotRef ? false : hideSmartToolbar}
            toolbarSlotRef={toolbarSlotRef}
          />
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
            Loading document...
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(HealthCheckupDocument);

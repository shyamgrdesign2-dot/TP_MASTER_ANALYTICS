import React, { useState, useCallback } from "react";
import { cn } from "../../../utils";
import styles from "./DocumentBottomSheet.module.scss";
import { DocumentUpload } from "iconsax-reactjs";
import { TPMedicalIcon } from "../../../atoms/MedicalIcon";

const DOC_CANNED_SUGGESTIONS = [
  { id: "doc-summarize", label: "Summarize document" },
  { id: "doc-compare", label: "Compare documents" },
  { id: "doc-extract", label: "Extract key findings" },
  { id: "doc-abnormal", label: "Check abnormalities" },
];

const DOC_TYPE_CONFIG = {
  pathology: {
    iconName: "test-tube",
    iconColor: "#1B8C54",
    bgColor: "rgba(27,140,84,0.08)",
    label: "Pathology",
  },
  radiology: {
    iconName: "x-ray",
    iconColor: "#3B6FE0",
    bgColor: "rgba(59,111,224,0.08)",
    label: "Radiology",
  },
  prescription: {
    iconName: "clipboard-activity",
    iconColor: "#C6850C",
    bgColor: "rgba(198,133,12,0.08)",
    label: "Prescription",
  },
  discharge_summary: {
    iconName: "file-text",
    iconColor: "#7C3AED",
    bgColor: "rgba(124,58,237,0.08)",
    label: "Discharge",
  },
  vaccination: {
    iconName: "injection",
    iconColor: "#0891B2",
    bgColor: "rgba(8,145,178,0.08)",
    label: "Vaccination",
  },
  other: {
    iconName: "document",
    iconColor: "#64748B",
    bgColor: "rgba(100,116,139,0.08)",
    label: "Document",
  },
};

function CloseIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z"
        fill={color}
      />
    </svg>
  );
}

export function DocumentBottomSheet({
  documents,
  onSendDocuments,
  onUploadNew,
  onClose,
  onCannedAction,
  maxSelect = 2,
  patientFirstName,
}) {
  const [selected, setSelected] = useState(new Set());
  const [maxWarning, setMaxWarning] = useState(false);

  const toggleDoc = useCallback(
    (docId) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(docId)) {
          next.delete(docId);
          setMaxWarning(false);
        } else {
          if (next.size >= maxSelect) {
            setMaxWarning(true);
            setTimeout(() => setMaxWarning(false), 2000);
            return prev;
          }
          next.add(docId);
        }
        return next;
      });
    },
    [maxSelect]
  );

  const handleSend = useCallback(() => {
    const docs = documents.filter((d) => selected.has(d.id));
    if (docs.length > 0) onSendDocuments(docs);
  }, [documents, selected, onSendDocuments]);

  const selectedCount = selected.size;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Bottom Sheet */}
      <div className={cn(styles.sheet)}>
        {/* Sticky header — white bg */}
        <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ background: "#fff" }}>
            <div className={styles.sheetHeader}>
              <div className={styles.sheetHeaderLeft}>
                <h3 className={styles.sheetTitle}>
                  {patientFirstName
                    ? `${patientFirstName}'s Medical Records`
                    : "Medical Records"}
                </h3>
                <span className={styles.sheetCount}>{documents.length}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={styles.sheetCloseBtn}
              >
                <CloseIcon size={24} />
              </button>
            </div>
            <div className={styles.headerDivider} />
          </div>

          {/* CTA + divider — only when documents exist */}
          {documents.length > 0 && (
            <div className={styles.sectionBg}>
              <div style={{ padding: "10px 12px" }}>
                <button
                  type="button"
                  onClick={onUploadNew}
                  className={styles.uploadBtn}
                >
                  <DocumentUpload size={14} variant="Linear" />
                  <span>Add New Medical Record</span>
                </button>
              </div>
              <div className={styles.orDividerWrap}>
                <div className={styles.orDividerLine} />
                <div className={styles.orDividerCenter}>
                  <span className={cn(styles.orDividerLabel)}>or</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className={cn(styles.scrollArea, "doc-scroll")}>
          {documents.length === 0 ? (
            /* ── Empty state ── */
            <div className={styles.emptyState}>
              <img
                src="/new-assets/icons/dr-agent/empty-docs.svg"
                width={100}
                height={100}
                alt=""
                style={{ marginBottom: 16, opacity: 0.6 }}
                draggable={false}
              />
              <h4 className={styles.emptyTitle}>No Medical Records</h4>
              <p className={cn(styles.emptyText)}>
                {patientFirstName
                  ? `No medical records have been added for ${patientFirstName}. Upload one to get started.`
                  : "No medical records have been added yet. Upload one to get started."}
              </p>
              <button
                type="button"
                onClick={onUploadNew}
                className={styles.uploadBtn}
              >
                <DocumentUpload size={14} variant="Linear" />
                <span>Add New Medical Record</span>
              </button>
            </div>
          ) : (
            <>
              {/* Selection hint */}
              <div className={styles.selectionHint}>
                <p className={styles.selectionHintText}>
                  {selectedCount > 0
                    ? `${selectedCount} selected`
                    : "Select documents to analyze"}
                </p>
                {maxWarning && (
                  <p className={styles.maxWarning}>
                    Max {maxSelect} documents
                  </p>
                )}
                {selectedCount > 0 && !maxWarning && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(new Set());
                      setMaxWarning(false);
                    }}
                    className={styles.clearAll}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Document list */}
              <div className={styles.docList}>
                <div className={styles.docListInner}>
                  {documents.map((doc) => {
                    const config =
                      DOC_TYPE_CONFIG[doc.docType] ?? DOC_TYPE_CONFIG.other;
                    const isSelected = selected.has(doc.id);

                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => toggleDoc(doc.id)}
                        className={cn(
                          styles.docRow,
                          isSelected ? styles.docRowSelected : styles.docRowDefault
                        )}
                      >
                        <div
                          className={cn(
                            styles.checkbox,
                            isSelected
                              ? styles.checkboxSelected
                              : styles.checkboxDefault
                          )}
                        >
                          {isSelected && (
                            <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2.5 6L5 8.5L9.5 3.5"
                                stroke="white"
                                strokeWidth={1.8}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <div
                          className={styles.docTypeIcon}
                          style={{ background: config.bgColor }}
                        >
                          <TPMedicalIcon
                            name={config.iconName}
                            variant="bulk"
                            size={16}
                            color={config.iconColor}
                          />
                        </div>
                        <div className={styles.docInfo}>
                          <span className={styles.docFileName}>
                            {doc.fileName}
                          </span>
                          <span className={styles.docMeta}>
                            {config.label} · {doc.uploadedAt} · {doc.uploadedBy}
                          </span>
                        </div>
                        <span className={styles.docSize}>{doc.size}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {documents.length > 0 && (
          <div className={styles.footer}>
            <button
              type="button"
              onClick={handleSend}
              disabled={selectedCount === 0}
              className={cn(
                styles.sendBtn,
                selectedCount === 0 ? styles.sendBtnDisabled : styles.sendBtnActive
              )}
            >
              {selectedCount === 0
                ? "Select documents to analyze"
                : `Add ${selectedCount} document${selectedCount > 1 ? "s" : ""} to chat`}
            </button>
          </div>
        )}
      </div>
      {/* da-* styles live in globals.css */}
    </div>
  );
}

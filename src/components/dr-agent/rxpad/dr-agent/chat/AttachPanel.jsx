import React from "react";
import { TPMedicalIcon } from "../../../atoms/MedicalIcon";
import styles from "./AttachPanel.module.scss";

const DUMMY_FILES = [
  {
    docType: "pathology",
    name: "Lab_Report_Mar2026.pdf",
    size: "340 KB",
    pages: 2,
    iconName: "test-tube",
    iconColor: "#1B8C54",
    bgColor: "rgba(27,140,84,0.08)",
  },
  {
    docType: "radiology",
    name: "X-Ray_Chest_Mar2026.pdf",
    size: "1.2 MB",
    pages: 1,
    iconName: "x-ray",
    iconColor: "#3B6FE0",
    bgColor: "rgba(59,111,224,0.08)",
  },
  {
    docType: "prescription",
    name: "Previous_Rx_Mar2026.pdf",
    size: "180 KB",
    pages: 1,
    iconName: "clipboard-activity",
    iconColor: "#C6850C",
    bgColor: "rgba(198,133,12,0.08)",
  },
];

export function AttachPanel({ onSelect, onClose }) {
  return (
    <div
      className={styles.panel}
      style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div className={styles.panelHeader}>
        <span className={styles.panelHeaderTitle}>
          Select a document to upload
        </span>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Close"
        >
          <svg
            width={10}
            height={10}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* File rows */}
      <div className={styles.fileList}>
        {DUMMY_FILES.map((file) => (
          <button
            key={file.docType}
            type="button"
            onClick={() => onSelect(file.docType)}
            className={styles.fileRow}
          >
            {/* Icon */}
            <div
              className={styles.fileIcon}
              style={{ background: file.bgColor }}
            >
              <TPMedicalIcon
                name={file.iconName}
                variant="bulk"
                size={16}
                color={file.iconColor}
              />
            </div>

            {/* File info */}
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileMeta}>
                {file.pages} {file.pages === 1 ? "page" : "pages"} &middot;{" "}
                {file.size}
              </span>
            </div>

            {/* Upload arrow */}
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              className={styles.uploadArrow}
            >
              <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

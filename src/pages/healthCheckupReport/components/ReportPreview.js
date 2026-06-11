import React, { useCallback, useMemo, useRef, useState } from "react";
import { Drawer, Button } from "antd";
import dayjs from "dayjs";

import HealthCheckupDocument from "./HealthCheckupDocument";
import { printReportWithIframe } from "../utils/printReportWithIframe";
import { normalizeHealthCheckupReportHtml } from "../utils/normalizeReportHtml";
import "./HealthCheckupReportEditor.scss";

import "./ReportPreview.scss";
import { ASSETS } from "../../../assets";
const editIconWhite = ASSETS.images.editWhite;

function ReportPreview({
  open,
  report,
  onClose,
  onEdit,
  onDelete,
  onSendToPatient,
  onDownload,
  loading = false,
  sendingToPatient = null,
  patient_data
}) {

  const documentRef = useRef(null);
  const [downloading] = useState(false);
  const isSending = sendingToPatient === report?.id;
  const zoom = 100; // Fixed zoom for now

  // Extract document content and header
  const headerTitle = report?.document?.content?.[0]?.attrs?.hospitalName || "HEALTH CHECK-UP SUMMARY";
  const reportDate = report?.createdAt || report?.created_at || report?.date;
  const formattedDate = reportDate ? dayjs(reportDate).format("DD MMM, YYYY") : "";
  const smartEditorRef = useRef(null);
  const normalizedReportHtml = useMemo(
    () => normalizeHealthCheckupReportHtml(report?.html ?? ""),
    [report?.html]
  );

  const handleDownloadClick = useCallback(() => {
    const paperEl = documentRef.current;
    if (!paperEl) {
      return;
    }
    const htmlContent = paperEl.outerHTML;
    const title = headerTitle || "Health Check-up Report";
    printReportWithIframe(htmlContent, title, patient_data);
  }, [headerTitle, patient_data]);

  const handleEdit = useCallback(() => {
    if (typeof onEdit === "function") {
      onEdit(report);
    }
  }, [onEdit, report]);

  const handleDelete = useCallback(() => {
    if (typeof onDelete === "function") {
      onDelete(report);
    }
  }, [onDelete, report]);

  return (
    <Drawer
      title={null}
      placement="right"
      width="100%"
      open={open}
      onClose={onClose}
      className="report-preview-drawer"
      closable={false}
      destroyOnClose
      styles={{
        body: { padding: 0, height: "100%", backgroundColor: "#222222" },
      }}
    >
      <div className="report-preview">
        {/* Header Bar */}
        <div className="report-preview__header">
          <div className="report-preview__header-left">
            <button
              type="button"
              className="report-preview__back-btn"
              onClick={onClose}
              aria-label="Back"
            >
              <i className="icon-right" />
            </button>
            <div className="report-preview__header-info">
              <h2 className="report-preview__title">Health Check-up Report</h2>
              {formattedDate && (
                <>
                  <span className="report-preview__divider" />
                  <span className="report-preview__date">{formattedDate}</span>
                </>
              )}
            </div>
          </div>

          <div className="report-preview__header-right">
            <button
              type="button"
              className="report-preview__icon-btn"
              onClick={handleEdit}
              disabled={isSending}
              title="Edit"
            >
              <img src={editIconWhite} alt="edit" width={24} height={24} />
            </button>

            <button
              type="button"
              className="report-preview__icon-btn"
              onClick={handleDownloadClick}
              disabled={downloading || isSending}
              title="Download"
            >
              <i className="icon-download" />
            </button>

            <button
              type="button"
              className="report-preview__icon-btn report-preview__icon-btn--danger"
              onClick={handleDelete}
              disabled={isSending}
              title="Delete"
            >
              <i className="icon-delete" />
            </button>
            <Button
              type="primary"
              className="report-preview__close-btn"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>

        {/* Document View */}
        <div className="report-preview__content">
          {!open ? (
            <div style={{ padding: "40px", color: "#ffffff", textAlign: "center" }}>
              Loading preview...
            </div>
          ) : (
            <div
              className="report-preview__document-container"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <div
                className="health-checkup-editor__document-wrap"
                style={{ minHeight: 0, overflow: "visible" }}
              >
                <HealthCheckupDocument
                  documentRef={documentRef}
                  editable={false}
                  showLogoControls={false}
                  useSmartEditor={true}
                  smartEditorHtml={normalizedReportHtml}
                  smartEditorRef={smartEditorRef}
                  hideSmartToolbar
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default React.memo(ReportPreview);

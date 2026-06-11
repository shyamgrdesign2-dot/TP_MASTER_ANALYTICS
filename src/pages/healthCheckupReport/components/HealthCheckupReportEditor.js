import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { Button, message as antMessage } from "antd";
import html2canvas from "html2canvas";

import { HEALTH_CHECKUP_REPORT_TEMPLATE_HTML } from "../constants";
import { buildReportContentFromGroupedData } from "../utils/buildReportContentFromGroupedData";
import { normalizeHealthCheckupReportHtml } from "../utils/normalizeReportHtml";
import ApiHealthCheckupReport from "../../../api/services/ApiHealthCheckupReport";
import HealthCheckupDocument from "./HealthCheckupDocument";

import "./HealthCheckupReportEditor.scss";

const USE_SMART_EDITOR = true;

function HealthCheckupReportEditor({
  initialContent,
  initialHeader,
  editingReportId = null,
  onClose,
  onSave,
  onPreview,
  isSaving = false,
  groupedConsultationData = null,
  editable = true,
  reportDate = null,
  patient_data = null,
}) {

  const { profile } = useSelector((state) => state.doctors);

  const documentRef = useRef(null);

  const smartEditorRef = useRef(null);
  const toolbarSlotRef = useRef(null);
  const loadedInitialContentKeyRef = useRef(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [isEditorContentReady, setIsEditorContentReady] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const initialHtmlWhenSmart = useMemo(() => {
    if (!USE_SMART_EDITOR) return "";
    if (groupedConsultationData) {
      return normalizeHealthCheckupReportHtml(buildReportContentFromGroupedData(
        groupedConsultationData,
        patient_data,
        profile
      ));
    }
    if (
      typeof initialContent === "string" &&
      initialContent.trim().startsWith("<")
    ) {
      return normalizeHealthCheckupReportHtml(initialContent);
    }
    return normalizeHealthCheckupReportHtml(HEALTH_CHECKUP_REPORT_TEMPLATE_HTML);
  }, [
    groupedConsultationData,
    patient_data,
    profile,
    initialContent,
  ]);

  const initialContentKey = useMemo(() => {
    if (editingReportId) return `edit:${editingReportId}`;
    if (groupedConsultationData) {
      return `generated:${patient_data?.patient_unique_id || "patient"}`;
    }
    return "blank";
  }, [editingReportId, groupedConsultationData, patient_data?.patient_unique_id]);

  // Set htmlContent when report is loaded (Smart editor path): from template/builder or from saved HTML
  useEffect(() => {
    if (!USE_SMART_EDITOR) return;
    if (loadedInitialContentKeyRef.current === initialContentKey) return;
    loadedInitialContentKeyRef.current = initialContentKey;
    setHtmlContent(initialHtmlWhenSmart);
    setIsEditorContentReady(true);
  }, [initialContentKey, initialHtmlWhenSmart]);

  /**
   * Generate thumbnail from document (first page, JPEG, good quality)
   * @returns {Promise<File|null>} - Thumbnail file or null if generation fails
   */
  const generateThumbnail = useCallback(async () => {
    if (!documentRef.current) return null;

    // Use the smart editor's internal container for exact boundaries, fallback to outer paper wrap
    const targetElement = documentRef.current.querySelector('.smart-editor-content-container') || documentRef.current.querySelector('.jodit-wysiwyg') || documentRef.current;

    try {
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: targetElement.offsetWidth,
        height: Math.min(targetElement.offsetHeight, 1100), // Capture ~first page
      });

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `thumbnail-${Date.now()}.jpg`, {
                type: "image/jpeg",
              });
              resolve(file);
            } else {
              resolve(null);
            }
          },
          "image/jpeg",
          0.85, // Good quality
        );
      });
    } catch (error) {
      console.error("Failed to generate thumbnail:", error);
      return null;
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (typeof onSave !== "function") return;

    setIsGeneratingThumbnail(true);
    // Yield to the browser so the loading spinner actually renders before html2canvas freezes the main thread
    await new Promise(resolve => setTimeout(resolve, 50));

    let thumbnailUrl = null;

    try {
      // Step 1: Generate thumbnail
      const thumbnailFile = await generateThumbnail();

      // Step 2: Upload thumbnail (optional - don't fail if it fails)
      if (thumbnailFile) {
        try {
          const uploadResult =
            await ApiHealthCheckupReport.uploadThumbnail(thumbnailFile);

          if (uploadResult && uploadResult.thumbnail_file) {
            thumbnailUrl = uploadResult.thumbnail_file;
          }
        } catch (uploadError) {
          console.warn(
            "Thumbnail upload failed, proceeding without thumbnail:",
            uploadError,
          );
        }
      }

      // Step 3: Call onSave with document and thumbnail URL
      const rawHtml = smartEditorRef.current?.getHtml?.();
      const htmlSource = rawHtml && rawHtml.trim() ? rawHtml : htmlContent;
      const html = normalizeHealthCheckupReportHtml(htmlSource);

      onSave({
        id: editingReportId,
        html,
        thumbnailUrl,
      });
    } catch (error) {
      console.error("Save failed:", error);
      antMessage.error("Failed to save report");
    } finally {
      setIsGeneratingThumbnail(false);
    }
  }, [
    onSave,
    editingReportId,
    generateThumbnail,
    htmlContent,
  ]);

  const smartEditorInitialHtml =
    loadedInitialContentKeyRef.current === initialContentKey
      ? htmlContent
      : initialHtmlWhenSmart;

  return (
    <div
      className={`health-checkup-editor health-checkup-editor--drawer`}
    >
      <header className="health-checkup-editor__header">
        <div className="health-checkup-editor__header-left">
          <button
            type="button"
            className="health-checkup-editor__back"
            onClick={onClose}
            aria-label="Back"
          >
            <i className="icon-right"></i>
          </button>
          <h2 className="health-checkup-editor__header-title">
            Health Check-up Report
          </h2>
        </div>
        <div className="health-checkup-editor__header-right">
          <Button
            type="primary"
            className="health-checkup-editor__save-btn"
            loading={isSaving || isGeneratingThumbnail}
            onClick={handleSave}
            disabled={isSaving || isGeneratingThumbnail}
          >
            {isSaving || isGeneratingThumbnail ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <div
        className="health-checkup-editor__document-wrap"
      >
        {isEditorContentReady ? (
          <HealthCheckupDocument
            key={initialContentKey}
            documentRef={documentRef}
            editable={editable}
            useSmartEditor={USE_SMART_EDITOR}
            smartEditorHtml={smartEditorInitialHtml}
            onSmartEditorChange={setHtmlContent}
            smartEditorRef={smartEditorRef}
            hideSmartToolbar={false}
            toolbarSlotRef={USE_SMART_EDITOR ? toolbarSlotRef : null}
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

export default React.memo(HealthCheckupReportEditor);

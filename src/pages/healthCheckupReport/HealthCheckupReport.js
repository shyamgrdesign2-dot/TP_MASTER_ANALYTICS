import React, { useState, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Drawer, message } from "antd";

import HealthCheckupEmptyState from "./components/HealthCheckupEmptyState";
import ReportsList from "./components/ReportsList";
import HealthCheckupReportEditor from "./components/HealthCheckupReportEditor";
import ReportPreview from "./components/ReportPreview";
import {
  fetchHealthCheckupReports,
  saveHealthCheckupReport,
  deleteHealthCheckupReport,
  setEditingReport,
  clearEditingReport,
  fetchConsultationsForHealthReport,
  resetHealthCheckupState,
} from "../../redux/healthCheckupReportSlice";
import { WHATSAPP_HEALTH_CHECKUP_REPORT_TEMPLATE_ID } from "./constants";
import {
  generateBillToken,
  createShortLink,
  sendWhatsAppMessage
} from "../opdBilling/service";
import { PERSISTANT_STORAGE_KEY_BILL_TOKEN } from "../../utils/constants";
import { useLocalStorage } from "../../utils/localStorage";
import config from "../../config";
import { getClinic } from "../../utils/utils";
import { printReportWithIframe } from "./utils/printReportWithIframe";

/**
 * Health Check-up Report page.
 * Shows empty state or reports list + handles editor/preview drawers.
 * On generate: fetches recent 7 consultations, groups by sections, passes to editor.
 */
function HealthCheckupReport({ patient_data, showHealthCheckupReportDrawer, setShowHealthCheckupReportDrawer }) {

  const dispatch = useDispatch();
  const patientUniqueId = patient_data?.patient_unique_id;

  // Token management for sharing reports
  const [getReportToken, setReportToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_BILL_TOKEN);

  // Get clinic and profile data
  const clinic = getClinic();
  const profile = useSelector((state) => state.profile);

  // Redux state
  const { reports, loading, saving, editingReportId, currentReport } = useSelector(
    (state) => state.healthCheckupReport
  );

  // Local UI state
  const [editorDrawerOpen, setEditorDrawerOpen] = useState(false);
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);
  const [groupedConsultationData, setGroupedConsultationData] = useState(null);
  const [loadingConsultations, setLoadingConsultations] = useState(false);
  const [sendingToPatient, setSendingToPatient] = useState(null); // reportId being sent

  // Fetch reports list on mount, and clear state on unmount
  useEffect(() => {
    if (patientUniqueId) {
      dispatch(fetchHealthCheckupReports(patientUniqueId));
    }

    // Cleanup when leaving patient profile
    return () => {
      dispatch(resetHealthCheckupState());
    };
  }, [dispatch, patientUniqueId]);

  // Generate new report from consultations
  const handleGenerateReport = useCallback(async () => {
    if (!patientUniqueId) {
      message.warning("Patient ID is required to generate the report.");
      return;
    }
    setLoadingConsultations(true);
    try {
      const payload = await dispatch(
        fetchConsultationsForHealthReport(patientUniqueId)
      ).unwrap();
      setGroupedConsultationData(payload ?? null);
      dispatch(clearEditingReport());
      setEditorDrawerOpen(true);
    } catch (err) {
      message.error(err?.message || "Failed to load consultations for report.");
      setGroupedConsultationData(null);
    } finally {
      setLoadingConsultations(false);
    }
  }, [dispatch, patientUniqueId]);

  // Open editor when parent triggers via prop
  useEffect(() => {
    if (showHealthCheckupReportDrawer) {
      handleGenerateReport();
      // Reset parent flag after consuming it
      setShowHealthCheckupReportDrawer(false);
    }
  }, [showHealthCheckupReportDrawer, setShowHealthCheckupReportDrawer, handleGenerateReport]);

  // Open existing report in editor (edit mode)
  const handleEditReport = useCallback(
    (report) => {
      dispatch(setEditingReport({ report: report.html, id: report.id }));
      setGroupedConsultationData(null);
      setEditorDrawerOpen(true);
    },
    [dispatch]
  );

  // Open report in preview (read-only editor)
  const handlePreviewReport = useCallback((report) => {
    setPreviewReport(report);
    setPreviewDrawerOpen(true);
  }, []);

  // Send report to patient via WhatsApp
  const handleSendToPatient = useCallback(async (report) => {
    if (!report?.id) {
      message.error("Report ID is missing");
      return;
    }

    const patientPhone = patient_data?.pm_contact_no || patient_data?.phone || patient_data?.um_contact;
    if (!patientPhone) {
      message.error("Patient phone number is not available");
      return;
    }

    setSendingToPatient(report.id);

    try {
      // Step 1: Get or generate token
      let token = getReportToken();
      if (!token) {
        token = await generateBillToken();
        setReportToken(token);
      }

      // Step 2: Build URL for patient view
      const targetUrl = `${config.doctor_portal_url}/health-checkup-report?token=${token}&reportId=${report.id}&patientId=${patientUniqueId}`;

      // Step 3: Create short link
      const shortLink = await createShortLink(targetUrl);
      if (!shortLink) {
        throw new Error("Failed to create short link");
      }

      // Step 4: Prepare WhatsApp message
      const whatsappMessage = {
        patient_name: patient_data?.name || patient_data?.um_name || "Patient",
        clinic_name: clinic?.hm_name || profile?.hm_name || "Clinic",
        report_link: shortLink,
        clinic_name2: clinic?.hm_name || profile?.hm_name || "Clinic",
      };

      // Step 5: Send WhatsApp message
      const statusRes = await sendWhatsAppMessage({
        template_id: WHATSAPP_HEALTH_CHECKUP_REPORT_TEMPLATE_ID,
        text: JSON.stringify(whatsappMessage),
        mobile_number: patientPhone,
      });

      if (statusRes === 200) {
        message.success("Health Check-up Report sent successfully!");
      } else {
        throw new Error("Failed to send WhatsApp message");
      }
    } catch (error) {
      console.error("Error sending report to patient:", error);
      message.error(error?.message || "Failed to send report to patient");
    } finally {
      setSendingToPatient(null);
    }
  }, [patient_data, patientUniqueId, clinic, profile, getReportToken, setReportToken]);

  // Download report as PDF
  const handleDownloadReport = useCallback((report) => {
    // Open in preview mode - user can click download button there
    // setPreviewReport(report);
    // setPreviewDrawerOpen(true);
    printReportWithIframe(report.html, "Health Check-up Report", patient_data);
  }, [patient_data]);

  // Close preview
  const handleClosePreview = useCallback(() => {
    setPreviewDrawerOpen(false);
    setPreviewReport(null);
  }, []);

  // Delete from preview
  const handleDeleteFromPreview = useCallback(
    async (report) => {
      if (!patientUniqueId) return;
      try {
        await dispatch(
          deleteHealthCheckupReport({ id: report.id, patientId: patientUniqueId })
        ).unwrap();
        // Refresh list
        dispatch(fetchHealthCheckupReports(patientUniqueId));
        handleClosePreview();
      } catch (err) {
        console.error(err);
      }
    },
    [dispatch, patientUniqueId, handleClosePreview]
  );

  // Edit from preview
  const handleEditFromPreview = useCallback(
    (report) => {
      handleClosePreview();
      handleEditReport(report);
    },
    [handleClosePreview, handleEditReport]
  );

  // Card click opens preview
  const handleCardClick = useCallback((report) => {
    setPreviewReport(report);
    setPreviewDrawerOpen(true);
  }, []);

  // Close editor
  const handleCloseEditor = useCallback(() => {
    setEditorDrawerOpen(false);
    setGroupedConsultationData(null);
    dispatch(clearEditingReport());
  }, [dispatch]);

  // Save report (create or update)
  const handleSave = useCallback(
    async (payload) => {
      if (!patientUniqueId) return;
      try {
        await dispatch(
          saveHealthCheckupReport({
            id: payload.id,
            patientId: patientUniqueId,
            html: payload.html,
            thumbnail_file: payload.thumbnailUrl,
          })
        ).unwrap();
        // Refresh list
        dispatch(fetchHealthCheckupReports(patientUniqueId));
        handleCloseEditor();
      } catch (err) {
        // Error already shown by thunk
      }
    },
    [dispatch, patientUniqueId, handleCloseEditor]
  );

  // Preview from editor
  const handlePreviewFromEditor = useCallback((payload) => {
    setPreviewReport({
      ...payload,
      html: payload?.html ?? payload?.document?.html ?? "",
      id: payload?.id ?? null,
      createdAt: payload?.createdAt ?? new Date().toISOString(),
    });
    setPreviewDrawerOpen(true);
  }, []);

  // Show empty state or reports list
  const hasReports = reports && reports.length > 0;

  return (
    <>
      {!hasReports && !loading ? (
        <HealthCheckupEmptyState
          onGenerateReport={handleGenerateReport}
          patientId={patientUniqueId}
          loading={loadingConsultations}
        />
      ) : (
        <ReportsList
          reports={reports}
          loading={loading}
          onGenerateReport={handleGenerateReport}
          onEditReport={handleEditReport}
          onPreviewReport={handlePreviewReport}
          onDownloadReport={handleDownloadReport}
          onSendToPatient={handleSendToPatient}
          onCardClick={handleCardClick}
          patientId={patientUniqueId}
          sendingToPatient={sendingToPatient}
        />
      )}

      {/* Editor Drawer */}
      <Drawer
        title={null}
        placement="right"
        width="100%"
        open={editorDrawerOpen}
        onClose={handleCloseEditor}
        destroyOnClose
        closable={false}
        styles={{
          body: { padding: 0, display: "flex", flexDirection: "column", height: "100%" },
        }}
      >
        <HealthCheckupReportEditor
          open={editorDrawerOpen}
          onClose={handleCloseEditor}
          onSave={handleSave}
          onPreview={handlePreviewFromEditor}
          isSaving={saving}
          groupedConsultationData={groupedConsultationData}
          initialContent={currentReport}
          editingReportId={editingReportId}
          patient_data={patient_data}
        />
      </Drawer>

      {/* Preview Drawer */}
      <ReportPreview
        open={previewDrawerOpen}
        report={previewReport}
        onClose={handleClosePreview}
        onEdit={handleEditFromPreview}
        onDelete={handleDeleteFromPreview}
        onSendToPatient={handleSendToPatient}
        loading={loading}
        sendingToPatient={sendingToPatient}
        patient_data={patient_data}
      />
    </>
  );
}

export default React.memo(HealthCheckupReport);

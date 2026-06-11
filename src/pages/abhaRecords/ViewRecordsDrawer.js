import React, { useState, useEffect } from "react";
import { Drawer, Button, Spin, message } from "antd";

import { viewConsentRecord } from "../../api/services/ApiAbha";

import "./ViewRecordsDrawer.scss";
import { ASSETS } from "../../assets";
const {
  arrowBoxRight2: arrowBoxIcon,
  symptoms: SymptomsIcon,
  medication: MedicationIcon,
} = ASSETS.images;

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
};

const getSectionIcon = (resourceType = "") => {
  if (resourceType === "MedicationRequest") {
    return MedicationIcon;
  }
  return SymptomsIcon;
};

const formatObservationValue = (item) => {
  if (item?.value == null && !item?.unit) return "";
  const numeric =
    typeof item.value === "number" || typeof item.value === "string"
      ? `${item.value}`
      : "";
  return [numeric, item.unit].filter(Boolean).join(" ");
};

const formatSectionItem = (resourceType, item, index) => {
  if (!item || typeof item !== "object") {
    return { title: item || "-", subtitle: "" };
  }

  const recordedDate = formatDate(item.recordedDate);

  switch (resourceType) {
    case "MedicationRequest":
      return {
        title: item.medication || "-",
        subtitle: [item.dosage, recordedDate].filter(Boolean).join(" • "),
      };
    case "Condition":
      return {
        title: item.display || "-",
        subtitle: [
          item.status && `Status: ${item.status}`,
          item.severity && `Severity: ${item.severity}`,
          item.note && `Note: ${item.note}`,
          recordedDate,
        ]
          .filter(Boolean)
          .join(", "),
      };
    case "Appointment":
      return {
        title: item.description || item.doctor || "-",
        subtitle: [
          item.status && `Status: ${item.status}`,
          item.doctor && `Doctor: ${item.doctor}`,
          recordedDate,
        ]
          .filter(Boolean)
          .join(", "),
      };
    case "Observation": {
      const value = formatObservationValue(item);
      return {
        title: item.display || "-",
        subtitle: [value, item.note, recordedDate].filter(Boolean).join(" • "),
      };
    }
    case "DocumentReference": {
      const downloadLabel = item.title || `Document ${index + 1}`;
      const dataHref = item.data
        ? `data:${item.contentType || "application/octet-stream"};base64,${
            item.data
          }`
        : item.url || null;
      return {
        title: downloadLabel,
        subtitle: [item.contentType, item.status, recordedDate]
          .filter(Boolean)
          .join(" • "),
        action: dataHref
          ? {
              href: dataHref,
              filename: `${downloadLabel}`.replace(/\s+/g, "_"),
              label: item.contentType?.includes("pdf")
                ? "Download PDF"
                : "Download",
            }
          : null,
      };
    }
    default:
      return {
        title: item.display || item.title || item.description || "-",
        subtitle: Object.entries(item)
          .filter(([key]) => !["display", "title", "description"].includes(key))
          .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
          .join(", "),
      };
  }
};

const ViewRecordsDrawer = ({ visible, onClose, record, consentId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordDetails, setRecordDetails] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  const records = record?.records || [];
  const totalRecords = records.length;
  const currentRecord = records[currentIndex] || null;
  const currentRecordId = currentRecord?.recordId || currentRecord?.request_id;

  useEffect(() => {
    if (visible && records.length > 0) {
      setCurrentIndex(0);
      setRecordDetails(null);
    }
  }, [visible, record, records.length]);

  useEffect(() => {
    if (!visible) {
      setRecordDetails(null);
      setLoadingRecord(false);
      return;
    }

    if (!consentId || !currentRecordId) {
      setRecordDetails(null);
      return;
    }

    let shouldUpdate = true;

    const fetchRecord = async () => {
      setLoadingRecord(true);
      try {
        const response = await viewConsentRecord(consentId, currentRecordId);
        if (!shouldUpdate) return;
        if (response?.success && response?.consentRecord) {
          setRecordDetails(response.consentRecord);
        } else {
          setRecordDetails(null);
          message.error(
            response?.message || "Unable to fetch consent record details"
          );
        }
      } catch (error) {
        if (shouldUpdate) {
          console.error("Failed to fetch consent record:", error);
          setRecordDetails(null);
          message.error("Failed to fetch consent record. Please try again.");
        }
      } finally {
        if (shouldUpdate) {
          setLoadingRecord(false);
        }
      }
    };

    fetchRecord();

    return () => {
      shouldUpdate = false;
    };
  }, [visible, consentId, currentRecordId]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalRecords - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleClose = () => {
    setCurrentIndex(0);
    setRecordDetails(null);
    onClose();
  };

  const formatRecordNumber = (num) => {
    return String(num).padStart(2, "0");
  };

  return (
    <Drawer
      closeIcon={false}
      placement="right"
      open={visible}
      onClose={handleClose}
      width={700}
      className="view-records-drawer"
      styles={{
        body: {
          padding: 0,
          backgroundColor: "#fff",
          height: "983px",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <div className="view-records-drawer-content">
        <div className="view-records-drawer__header">
          <div className="view-records-drawer__header-left">
            <Button
              type="text"
              className="view-records-drawer__back-btn"
              onClick={handleClose}
            >
              <i className="icon-Cross fs-3"></i>
            </Button>
            <div className="view-records-drawer__title">Records</div>
          </div>
        </div>

        {totalRecords > 0 && (
          <div className="view-records-drawer__navigation">
            <Button
              type="text"
              className="view-records-drawer__nav-btn"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <img
                src={arrowBoxIcon}
                alt="Next"
                className="view-records-drawer__nav-icon view-records-drawer__nav-icon--right"
              />
            </Button>
            <span className="view-records-drawer__counter">
              {formatRecordNumber(currentIndex + 1)}/
              {formatRecordNumber(totalRecords)}
            </span>
            <Button
              type="text"
              className="view-records-drawer__nav-btn"
              onClick={handleNext}
              disabled={currentIndex === totalRecords - 1}
            >
              <img
                src={arrowBoxIcon}
                alt="Previous"
                className="view-records-drawer__nav-icon view-records-drawer__nav-icon--left"
              />
            </Button>
          </div>
        )}

        <div className="view-records-drawer__body">
          {loadingRecord ? (
            <div className="view-records-drawer__loading">
              <Spin />
            </div>
          ) : currentRecord && recordDetails ? (
            <div className="view-records-drawer__content">
              <div className="view-records-drawer__summary">
                <div className="view-records-drawer__summary-col">
                  <SummaryRow
                    label="Practitioner Name"
                    value={recordDetails?.consultation_info?.doctor_name || "-"}
                  />
                  <SummaryRow
                    label="Clinic Name"
                    value={
                      recordDetails?.consultation_info?.facility_name ||
                      record?.hospitalName ||
                      "-"
                    }
                  />
                  <SummaryRow
                    label="Visit Date"
                    value={
                      formatDate(
                        recordDetails?.consultation_info?.consultation_date
                      ) || "-"
                    }
                  />
                </div>
                <div className="view-records-drawer__summary-col">
                  <SummaryRow
                    label="Patient Name"
                    value={recordDetails?.patient_info?.name || "-"}
                  />
                  <SummaryRow
                    label="Patient Gender"
                    value={recordDetails?.patient_info?.gender || "-"}
                  />
                  <SummaryRow
                    label="Patient Birth Date"
                    value={
                      formatDate(recordDetails?.patient_info?.birthDate) || "-"
                    }
                  />
                </div>
              </div>

              <div className="view-records-drawer__divider" />

              <div className="view-records-drawer__sections">
                {(recordDetails?.sections || []).filter(
                  (section) =>
                    Array.isArray(section?.data) && section.data.length
                ).length === 0 && (
                  <div className="view-records-drawer__empty-card">
                    No sections available for this record.
                  </div>
                )}

                {(recordDetails?.sections || [])
                  .filter(
                    (section) =>
                      Array.isArray(section?.data) && section.data.length
                  )
                  .map((section) => {
                    try {
                      return (
                        <div
                          className="view-records-drawer__card"
                          key={section.title}
                        >
                          <div className="view-records-drawer__card-header">
                            <img
                              src={getSectionIcon(section.resourceType)}
                              alt={section.resourceType || "Section"}
                              className="view-records-drawer__card-icon"
                            />
                            <div>
                              <div className="view-records-drawer__card-title">
                                {section.title || "-"} ({section.resourceType})
                              </div>
                            </div>
                          </div>
                          <div className="view-records-drawer__card-content">
                            <ul className="view-records-drawer__list">
                              {section.data.map((item, index) => {
                                try {
                                  const { title, subtitle, action } =
                                    formatSectionItem(
                                      section.resourceType,
                                      item,
                                      index
                                    );
                                  if (!title && !subtitle && !action)
                                    return null;
                                  return (
                                    <li key={`${section.title}-${index}`}>
                                      <div className="view-records-drawer__list-title">
                                        {title}
                                      </div>
                                      {subtitle && (
                                        <div className="view-records-drawer__list-note">
                                          {subtitle}
                                        </div>
                                      )}
                                      {action?.href && (
                                        <a
                                          className="view-records-drawer__download"
                                          href={action.href}
                                          download={action.filename}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {action.label || "Download"}
                                        </a>
                                      )}
                                    </li>
                                  );
                                } catch (error) {
                                  console.error(
                                    "Failed to render record item",
                                    error
                                  );
                                  return null;
                                }
                              })}
                            </ul>
                          </div>
                        </div>
                      );
                    } catch (error) {
                      console.error(
                        "Failed to render section",
                        section?.title,
                        error
                      );
                      return null;
                    }
                  })}
              </div>
            </div>
          ) : (
            <div className="view-records-drawer__empty">
              No record data available
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="view-records-drawer__summary-row">
    <span className="view-records-drawer__summary-label">{label}:</span>
    <span className="view-records-drawer__summary-value">{value || "-"}</span>
  </div>
);

export default ViewRecordsDrawer;

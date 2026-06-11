import React from "react";
import { useNavigate } from "react-router-dom";
import "./SetupSummary.scss";
import SummaryPreview from "../preview/SummaryPreview";

import { isMobile } from "react-device-detect";
import { ASSETS } from "../../../../assets";
const {
  editIconBlue: editIcon,
  mailPurple: mailIcon,
  callPurple: phoneIcon,
  locationPurple: locationIcon,
} = ASSETS.images;

const SetupSummary = ({ setupData, showSummaryOnly = false, enableEditMode = false }) => {

  const navigate = useNavigate();

  // Check if all required data is present
  const isReceptionistComplete = setupData?.receptionistName && setupData?.avatar;
  const isClinicComplete = setupData?.contact && setupData?.googleLocation && setupData?.doctors?.length > 0;
  const isAllComplete = isReceptionistComplete && isClinicComplete;

  const handleEdit = (section) => {
    switch (section) {
      case "receptionist":
        navigate("/appointment-agent?step=receptionist");
        break;
      case "doctors":
        navigate("/appointment-agent?step=clinic");
        break;
      case "clinic":
        navigate("/appointment-agent?step=clinic");
        break;
      default:
        break;
    }
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  return (
    <div className="setup-summary-container" style={{width : isMobile ? "90%" : "70%"}}>
      <div className="summary-container">
        <div className="summary-section">
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {setupData?.avatar && (
              <div className="avatar-preview">
                <img src={setupData.avatar.lookUrl} alt="Selected Avatar" />
              </div>
            )}
            <div className="section-header">
              <div className="section-info">
                <h3>{setupData?.receptionistName || "AI Receptionist"}</h3>
                <p>(AI Virtual Receptionist)</p>
              </div>
            </div>
          </div>
          {(!showSummaryOnly || enableEditMode) && (
            <button
              className="edit-button"
              onClick={() => handleEdit("receptionist")}
            >
              <img
                src={editIcon}
                width={16}
                height={16}
                alt="edit"
                style={{ margin: "0 8px 3px 0" }}
              />
            </button>
          )}
          {!isReceptionistComplete && !showSummaryOnly && !enableEditMode && (
            <div className="incomplete-warning">
              ⚠️ Receptionist setup incomplete
            </div>
          )}
        </div>

        <div className="summary-section doctor-section">
          <div className="section-header">
            <div className="section-info">
              <h6>Patient can book appointment of these doctor below</h6>
            </div>
            {(!showSummaryOnly || enableEditMode) && (
              <button
                className="edit-button"
                onClick={() => handleEdit("doctors")}
              >
                <img
                  src={editIcon}
                  width={16}
                  height={16}
                  alt="edit"
                  style={{ margin: "0 8px 3px 0" }}
                />
              </button>
            )}
          </div>
          <div className="doctors-list">
            {setupData?.doctors && setupData.doctors.length > 0 ? (
              setupData.doctors.map((doctor) => (
                <div key={doctor.um_id} className="doctor-item">
                  <div
                    style={{
                      backgroundColor: "#A2A2A8",
                      color: "#4B4AD5",
                      padding: "6px",
                      borderRadius: "50%",
                      fontSize: "1.5rem",
                      width: "3rem",
                      height: "3rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {getInitials(doctor.um_name)}
                  </div>
                  <div className="text-content d-flex justify-content-between flex-column">
                    <span style={{ fontWeight: 600, fontSize: "1rem"}}>
                      {doctor.um_name}
                    </span>
                    <span className="fs-10">
                      {doctor.speciality || "MBBS"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p>No doctors selected yet</p>
            )}
          </div>
          {!isClinicComplete && !showSummaryOnly && !enableEditMode && (
            <div className="incomplete-warning">
              ⚠️ Clinic details incomplete
            </div>
          )}
        </div>

        <div className="summary-section doctor-section">
          <div className="section-header">
            <div className="section-info">
              <h3>Hospital/Clinic Details</h3>
            </div>
            {(!showSummaryOnly || enableEditMode) && (
              <button
                className="edit-button"
                onClick={() => handleEdit("clinic")}
              >
                <img
                  src={editIcon}
                  width={16}
                  height={16}
                  alt="edit"
                  style={{ margin: "0 8px 3px 0" }}
                />
              </button>
            )}
          </div>
          <div className="clinic-details">
            {setupData?.contact && (
              <div className="contact-item">
                <img src={phoneIcon} alt="Phone" />
                <a href={`tel:${setupData.contact}`}>{setupData.contact}</a>
              </div>
            )}
            {setupData?.email && (
              <div className="contact-item">
                <img src={mailIcon} alt="Email" />
                <a href={`mailto:${setupData.email}`}>{setupData.email}</a>
              </div>
            )}
            <div className="contact-item">
              <img src={locationIcon} alt="Location" />
              <div className="address">
                <p>{setupData?.clinicData?.hm_name}</p>
                <p>
                  {[
                    setupData?.clinicData?.hm_address,
                    setupData?.clinicData?.hm_address1,
                    setupData?.clinicData?.hm_address2,
                    setupData?.clinicData?.hm_state,
                    setupData?.clinicData?.hm_pincode
                  ]
                    .filter(field => field && field.trim() !== '')
                    .join(', ')}
                </p>
                {setupData?.googleLocation && (
                  <a
                    href={`https://maps.google.com/?q=${setupData.googleLocation}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View in Google maps
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isAllComplete && !showSummaryOnly && !enableEditMode && (
          <div className="completion-status">
            <div className="status-message">
              Please complete all previous steps before proceeding
            </div>
          </div>
        )}
      </div>
      <div style={{width :"45%"}}>
        <SummaryPreview setupData={setupData} />
      </div>
    </div>
  );
};

export default SetupSummary;

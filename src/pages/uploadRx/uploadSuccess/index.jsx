import React from "react";
import { Button } from "antd";
import PatientInfoCard from "../patientInfoCard";
import "./styles.scss";

import { trackEvent } from "../../../utils/utils";
import { EVENTS } from "../../../utils/events";
import { ASSETS } from "../../../assets";
const websiteLogo = ASSETS.images.websiteImages.logo;
const {
  editWhite: editIconWhite,
  successAnimation_3: successAnimationWebp,
} = ASSETS.images;

const UPLOAD_SUCCESS_TEXT = {
  title: "Rx has been uploaded successfully.",
  description:
    "These documents will be visible on the TatvaPractice EMR post page refresh.",
};

const UploadSuccess = ({ onAddEditClick = () => {}, patientData }) => {
  const handleAddEditClick = () => {
    trackEvent(EVENTS.SNAP_RX.reuploadRxClicked);
    onAddEditClick();
  };
  return (
    <div className="success-rx-upload-container">
      <img className="website-logo" src={websiteLogo} alt="logo" />
      <div className="success-content">
        <div className="success-icon">
          <img
            src={successAnimationWebp}
            alt="SUCCESS GIF"
          />
        </div>
        <div className="success-text">
          <div className="success-title"> {UPLOAD_SUCCESS_TEXT.title}</div>
          <div className="success-description">
            {UPLOAD_SUCCESS_TEXT.description}
          </div>
        </div>
        <div className="patient-info-card-container">
          <PatientInfoCard
            name={patientData?.patientName}
            gender={patientData?.patientGender}
            age={patientData?.patientAge}
            phone={patientData?.patientPhone}
            className="patient-info-card-success"
          />
        </div>
        <Button
          type="primary"
          className="book-appointment-btn fs-14 fw-medium"
          onClick={handleAddEditClick}
          icon={
            <img src={editIconWhite} alt="add-edit" className="add-edit-icon" />
          }
        >
          <span className="add-edit-text">Add/Edit</span>
        </Button>
      </div>
    </div>
  );
};

export default UploadSuccess;

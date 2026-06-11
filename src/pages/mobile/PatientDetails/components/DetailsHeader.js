import React from 'react';
import { useSelector } from 'react-redux';

import { NEO_NATOLOGISTS_DP_ID } from '../../../../utils/constants';
import './DetailsHeader.scss';
import { ASSETS } from "../../../../assets";
const {
  arrowLeftWhite: arrowLeft,
  moreVertical,
  notificationContainer: voiceCircleIcon,
} = ASSETS.mobile;

function DetailsHeader({ onBack, title, onEdit, profileSection, patient_data, onVoiceRxClick }) {
  const { profile } = useSelector((state) => state.doctors);

  const getPatientDetailsString = (patient_data) => {
    if (!patient_data) return 'N/A';
    
    const parts = [];
    
    if (patient_data?.pm_gender) {
      const gender = patient_data.pm_gender.toLowerCase();
      if (gender === 'm' || gender === 'male') {
        parts.push('Male');
      } else if (gender === 'f' || gender === 'female') {
        parts.push('Female');
      } else {
        parts.push(patient_data.pm_gender);
      }
    }
    
    let ageStr = '';
    if (profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) {
      if (patient_data?.ageYears != 0) {
        ageStr += `${patient_data.ageYears}y`;
      }
      if (patient_data?.ageMonths != 0) {
        ageStr += ` ${patient_data.ageMonths}m`;
      }
      if (patient_data?.ageDays != 0) {
        ageStr += ` ${patient_data.ageDays}d`;
      }
    } else {
      if (patient_data?.ageYears != 0) {
        ageStr = `${patient_data.ageYears}y`;
      } else if (patient_data?.ageMonths != 0) {
        ageStr = `${patient_data.ageMonths}m`;
      } else if (patient_data?.ageDays != 0) {
        ageStr = `${patient_data.ageDays}d`;
      }
    }
    if (ageStr) {
      parts.push(ageStr.trim());
    }
    
    if (patient_data?.pm_contact_no) {
      parts.push(patient_data.pm_contact_no);
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'N/A';
  };

  return (
    <div className="details-header">
      <div className="header-content">
        <button className="back-button" onClick={onBack} type="button">
          <img src={arrowLeft} alt="Back" />
        </button>
        {profileSection ? (
          <div className="header-profile-section">{profileSection}</div>
        ) : (
          <div className="header-title-section">
            <h1 className="header-title">{title || "Patient Details"}</h1>
            {patient_data && (
              <p className="header-patient-details">{getPatientDetailsString(patient_data)}</p>
            )}
          </div>
        )}
        <div className="header-actions">
          {onVoiceRxClick && (
            <button className="voice-circle-button" onClick={onVoiceRxClick} type="button">
              <img src={voiceCircleIcon} alt="Voice Rx" />
            </button>
          )}
          {onEdit && (
            <button className="edit-button" onClick={onEdit} type="button">
              <img src={moreVertical} alt="More options" />
            </button>
          )}
          {!onEdit && !onVoiceRxClick && <div className="header-spacer" />}
        </div>
      </div>
    </div>
  );
}

export default DetailsHeader;


import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from 'antd';
import { PATIENT_DETAILS_SIDEBAR_KEYS } from '../../utils/constants';

import './PatientDetailsBottomSheet.scss';
import { ASSETS } from "../../assets";
const {
  close2: closeIcon,
  profile: profileIcon,
  edit2: editIcon,
  visitsummary: visitSummaryIcon,
  woman: womanIcon,
  personalcard: personalcardIcon,
  call: callIcon,
  blood: bloodIcon,
} = ASSETS.mobile;

function PatientDetailsBottomSheet({ visible, onClose, patient_data, onBeforeNavigate }) {
  const navigate = useNavigate();

  if (!patient_data) return null;

  const getGenderLabel = () => {
    const g = (patient_data?.pm_gender || '').toLowerCase();
    if (g === 'm' || g === 'male') return 'Male';
    if (g === 'f' || g === 'female') return 'Female';
    return patient_data?.pm_gender || '-';
  };

  const getAgeGender = () => {
    const parts = [];
    if (patient_data?.ageYears != null && patient_data.ageYears !== '') {
      parts.push(`${patient_data.ageYears}y`);
    }
    if (getGenderLabel() !== '-') {
      parts.push(getGenderLabel());
    }
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const patientId =
    patient_data?.patient_unique_id ||
    patient_data?.pm_pid ||
    patient_data?.pm_reference_id ||
    patient_data?.tpml_refrence_id ||
    '-';
  const mobile = patient_data?.pm_contact_no || '-';
  const bloodGroup =
    patient_data?.pm_blood_group || patient_data?.patient_blood_group || '-';

  const handleEditProfile = () => {
    onBeforeNavigate?.();
    onClose?.();
    navigate('/edit_patient', { state: { patient_data } });
  };

  const handleVisitSummary = () => {
    onBeforeNavigate?.();
    onClose?.();
    navigate('/patient_details', {
      state: { patient_data, sidebarKey: PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY },
    });
  };

  const rows = [
    { iconSrc: profileIcon, label: 'Patient Name', value: patient_data?.pm_fullname || patient_data?.patient_name || '-' },
    { iconSrc: womanIcon, label: 'Age & Gender', value: getAgeGender() },
    { iconSrc: personalcardIcon, label: 'Patient Id', value: patientId },
    { iconSrc: callIcon, label: 'Mobile Number', value: mobile },
    { iconSrc: bloodIcon, label: 'Blood Group', value: bloodGroup },
  ];

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="auto"
      className="patient-details-bottom-sheet"
      closable={false}
      maskClosable
    >
      <div className="patient-details-bottom-sheet-content">
        <div className="patient-details-bottom-sheet-header">
          <h3 className="patient-details-bottom-sheet-title">Patient Details</h3>
          <button
            className="patient-details-bottom-sheet-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <img src={closeIcon} alt="" />
          </button>
        </div>

        <div className="patient-details-bottom-sheet-rows">
          {rows.map((row) => (
            <div key={row.label} className="patient-details-bottom-sheet-row">
              <div className="patient-details-bottom-sheet-icon">
                <img src={row.iconSrc} alt="" aria-hidden />
              </div>
              <div className="patient-details-bottom-sheet-text">
                <span className="patient-details-bottom-sheet-label">{row.label}</span>
                <span className="patient-details-bottom-sheet-value">{row.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="patient-details-bottom-sheet-actions">
          <button
            type="button"
            className="patient-details-bottom-sheet-btn"
            onClick={handleEditProfile}
          >
            <img src={editIcon} alt="" aria-hidden />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            className="patient-details-bottom-sheet-btn"
            onClick={handleVisitSummary}
          >
            <img src={visitSummaryIcon} alt="" aria-hidden />
            <span>Visit Summary</span>
          </button>
        </div>
        <div className="patient-details-bottom-sheet-home-indicator" />
      </div>
    </Drawer>
  );
}

export default PatientDetailsBottomSheet;

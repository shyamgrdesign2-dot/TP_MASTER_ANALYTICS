import React, { useState, useMemo, useCallback } from 'react';
import './PatientListItem.scss';

import PatientOptionsModal from './PatientOptionsModal';
import { trackEvent } from '../../../../utils/utils';
import moment from 'moment';
import { ASSETS } from "../../../../assets";
const KebabIcon = ASSETS.mobile.moreVertical;

const getInitials = (name) => {
  if (!name) return 'P';
  const parts = name.trim().split(' ').filter(part => part.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return 'P';
};

const calculateAge = (dob) => {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

const AVATAR_BG_COLOR = '#F6EFFB';
const AVATAR_TEXT_COLOR = '#A461D8';

const PatientListItem = React.memo(({ 
  patient, 
  onClick, 
  onEdit, 
  onCreatePrescription, 
  onBookAppointment,
  onWalkInConsultation,
  doctorDetails 
}) => {
  const [showOptions, setShowOptions] = useState(false);

  const patientName = useMemo(() => 
    patient.pm_fullname || patient.pm_name, 
    [patient.pm_fullname, patient.pm_name]
  );

  const initials = useMemo(() => 
    getInitials(patientName), 
    [patientName]
  );

  const patientAge = useMemo(() => 
    patient.pm_age || calculateAge(patient.pm_dob),
    [patient.pm_age, patient.pm_dob]
  );

  const contactNumber = useMemo(() => 
    patient.pm_contact_no || patient.pm_mobile,
    [patient.pm_contact_no, patient.pm_mobile]
  );

  const patientId = useMemo(() => 
    patient.tpml_refrence_id || patient.pm_pid || patient.pm_patient_id,
    [patient.tpml_refrence_id, patient.pm_pid, patient.pm_patient_id]
  );

  const formattedPatientInfo = useMemo(() => {
    const parts = [];
    
    if (patient.pm_gender) {
      parts.push(patient.pm_gender.charAt(0).toUpperCase());
    }
    
    if (patientAge) {
      parts.push(`${patientAge}y`);
    }
    
    if (contactNumber) {
      parts.push(contactNumber);
    }
    
    if (patientId) {
      parts.push(patientId);
    }
    
    if (parts.length === 0) return 'N/A';
    
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part}
        {index < parts.length - 1 && <span className="separator"> | </span>}
      </React.Fragment>
    ));
  }, [patient.pm_gender, patientAge, contactNumber, patientId]);

  const lastVisitFormatted = useMemo(() => {
    if (patient.lastVisitDate) {
      return moment(patient.lastVisitDate).format("DD-MM-YYYY");
    }
    return null;
  }, [patient.lastVisitDate]);

  const handleKebabClick = useCallback((e) => {
    e.stopPropagation();
    setShowOptions(true);
    
    if (doctorDetails) {
      trackEvent("TP_AllPatients_Actionitemkebabmenu", {
        ...doctorDetails,
        patient_id: patient?.pm_pid,
        patient_name: patientName,
        patient_number: contactNumber,
      });
    }
  }, [doctorDetails, patient?.pm_pid, patientName, contactNumber]);

  const handleCloseOptions = useCallback(() => {
    setShowOptions(false);
  }, []);

  const handlePatientClick = useCallback(() => {
    onClick(patient);
  }, [onClick, patient]);

  const handleViewDetails = useCallback(() => {
    onClick(patient);
  }, [onClick, patient]);

  const handleEdit = useCallback(() => {
    onEdit(patient);
  }, [onEdit, patient]);

  const handleCreatePrescription = useCallback(() => {
    onCreatePrescription(patient);
  }, [onCreatePrescription, patient]);

  const handleBookAppointment = useCallback(() => {
    onBookAppointment(patient);
  }, [onBookAppointment, patient]);

  const handleWalkInConsultation = useCallback(() => {
    onWalkInConsultation(patient);
  }, [onWalkInConsultation, patient]);

  return (
    <>
      <div className="patient-list-item" onClick={handlePatientClick}>
        <div className="patient-content">
          <div className="patient-avatar-section">
            <div 
              className="patient-avatar"
              style={{ 
                backgroundColor: AVATAR_BG_COLOR,
                color: AVATAR_TEXT_COLOR 
              }}
            >
              {initials}
            </div>
            <div className="patient-info">
              <div className="patient-header">
                <div className="patient-name">
                  {patientName || 'Unknown'}
                </div>
                <button 
                  className="kebab-button"
                  onClick={handleKebabClick}
                  type="button"
                  aria-label="Patient options"
                >
                  <img src={KebabIcon} alt="Options" className="kebab-icon" />
                </button>
              </div>
              <div className="patient-details">
                <p className="details-text">
                  {formattedPatientInfo}
                </p>
                {lastVisitFormatted && (
                  <p className="last-visit">
                    Last visit: {lastVisitFormatted}
                  </p>
                )}
                {patient.category && (
                  <p className="patient-category">
                    Category: {patient.category}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOptions && (
        <PatientOptionsModal
          patient={patient}
          onClose={handleCloseOptions}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onCreatePrescription={handleCreatePrescription}
          onBookAppointment={handleBookAppointment}
          onWalkInConsultation={handleWalkInConsultation}
          doctorDetails={doctorDetails}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.patient.pm_pid === nextProps.patient.pm_pid &&
    prevProps.patient.pm_fullname === nextProps.patient.pm_fullname &&
    prevProps.patient.pm_name === nextProps.patient.pm_name &&
    prevProps.patient.pm_gender === nextProps.patient.pm_gender &&
    prevProps.patient.pm_age === nextProps.patient.pm_age &&
    prevProps.patient.pm_contact_no === nextProps.patient.pm_contact_no &&
    prevProps.patient.pm_mobile === nextProps.patient.pm_mobile &&
    prevProps.patient.lastVisitDate === nextProps.patient.lastVisitDate &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onCreatePrescription === nextProps.onCreatePrescription &&
    prevProps.onBookAppointment === nextProps.onBookAppointment &&
    prevProps.onWalkInConsultation === nextProps.onWalkInConsultation
  );
});

PatientListItem.displayName = 'PatientListItem';

export default PatientListItem;

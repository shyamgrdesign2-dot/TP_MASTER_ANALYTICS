import React, { useCallback, useMemo } from 'react';
import './WalkInPatientCard.scss';
import { getClinicName, getClinic } from '../../../../utils/utils';

// Avatar colors (constants)
const AVATAR_BG_COLOR = '#F6EFFB';
const AVATAR_TEXT_COLOR = '#A461D8';

// Highlight search query in text - moved outside component for performance
const BoldWordInName = ({ name, boldWord }) => {
  if (!name || !boldWord) return <span>{name}</span>;
  const parts = name.split(new RegExp(`(${boldWord})`, "i"));
  return parts.map((part, index) => {
    if (part.toLowerCase() === boldWord.toLowerCase()) {
      return <span key={index} className="search-highlight">{part}</span>;
    }
    return <span key={index}>{part}</span>;
  });
};

function WalkInPatientCard({ 
  patient, 
  searchQuery = '',
  onPatientDetails,
  onVoiceRx,
  doctorDetails,
  profile
}) {
  // Generate initials from patient name
  const getInitials = useCallback((name) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ').filter(part => part.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return 'P';
  }, []);

  // Calculate age from date of birth
  const calculateAge = useCallback((dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }, []);

  // Format patient details with styled separators
  const formatPatientInfo = useMemo(() => {
    const parts = [];
    
    // Gender
    if (patient?.pm_gender) {
      parts.push(patient.pm_gender.charAt(0).toUpperCase());
    }
    
    // Age - use ageYears from web version format (preferred), fallback to pm_age or calculated
    if (patient?.ageYears !== undefined && patient.ageYears !== null && patient.ageYears !== 0) {
      parts.push(`${patient.ageYears}y`);
    } else if (patient?.pm_age) {
      parts.push(`${patient.pm_age}y`);
    } else if (patient?.pm_dob) {
      const age = calculateAge(patient.pm_dob);
      if (age) parts.push(`${age}y`);
    }
    
    // Mobile/Contact
    const contact = patient?.pm_contact_no || patient?.pm_mobile;
    if (contact) {
      parts.push(contact);
    }
    
    // Patient ID
    const patientId = patient?.tpml_refrence_id || patient?.pm_pid || patient?.pm_patient_id;
    if (patientId) {
      parts.push(patientId);
    }
    
    // Return with separators styled
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part}
        {index < parts.length - 1 && <span className="separator"> | </span>}
      </React.Fragment>
    ));
  }, [patient, calculateAge]);

  const handlePatientDetailsClick = useCallback(() => {
    if (doctorDetails && window.Moengage) {
      const clinic_name = getClinicName(profile?.hospital_data);
      window.Moengage.track_event("TP_Patient_details", {
        clinic_name,
        patient_number: patient?.pm_contact_no || patient?.pm_mobile,
        patient_id: patient?.patient_unique_id || patient?.pm_pid,
      });
    }
    onPatientDetails?.(patient);
  }, [doctorDetails, profile, patient, onPatientDetails]);

  const handleVoiceRxClick = useCallback(() => {
    if (doctorDetails && profile && window.Moengage) {
      const clinic = getClinic(profile?.hospital_data);
      window.Moengage.track_event("TP_AV_Entry", {
        patient_id: patient?.patient_unique_id || patient?.pm_pid || "",
        patient_name: patient?.pm_fullname || patient?.pm_name || "",
        patient_mobile_number: patient?.pm_contact_no || patient?.pm_mobile || "",
        doctor_id: profile?.doctor_unique_id,
        doctor_name: profile?.um_name,
        doctor_specialty: profile?.dp_name,
        doctor_mobile_number: profile?.um_contact,
        hm_id: clinic?.hm_id,
        clinic_name: clinic?.hm_name,
        source: "Patient Selected",
      });
    }
    onVoiceRx?.(patient);
  }, [doctorDetails, profile, patient, onVoiceRx]);

  const patientName = useMemo(() => 
    patient?.pm_fullname || patient?.pm_name || 'Unknown',
    [patient]
  );

  const initials = useMemo(() => getInitials(patientName), [patientName, getInitials]);

  return (
    <div className="walk-in-patient-card">
      <div className="patient-card-content">
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
                {searchQuery ? (
                  <BoldWordInName name={patientName} boldWord={searchQuery} />
                ) : (
                  patientName
                )}
              </div>
            </div>
            <div className="patient-details">
              <p className="details-text">
                {formatPatientInfo}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="patient-card-divider"></div>
      
      <div className="patient-card-actions">
        <button 
          className="btn-patient-details"
          onClick={handlePatientDetailsClick}
          type="button"
        >
          Patient Details
        </button>
        <button 
          className="btn-voice-rx"
          onClick={handleVoiceRxClick}
          type="button"
        >
          Voice Rx
        </button>
      </div>
    </div>
  );
}

export default React.memo(WalkInPatientCard);


import React from 'react';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { makeDefaultLogo } from '../../../../utils/utils';
import { NEO_NATOLOGISTS_DP_ID, PAEDIATRIC_DP_ID } from '../../../../utils/constants';
import './PatientProfileSection.scss';

function PatientProfileSection({ patient_data }) {
  const { profile } = useSelector((state) => state.doctors);
  const { patients_details } = useSelector((state) => state.records);

  const isPaediatric = profile?.dp_id === PAEDIATRIC_DP_ID;

  let patientDOB = '';
  if (patient_data?.pm_dob) {
    patientDOB = moment(patient_data.pm_dob).format('DD-MM-YYYY');
  } else if (patient_data?.DOB) {
    patientDOB = moment(patient_data.DOB, 'Do MMMM YYYY').format('DD-MM-YYYY');
  }

  const getPatientDetailsString = (patient_data) => {
    if (!patient_data) return 'N/A';
    
    const parts = [];
    
    if (patient_data?.pm_gender) {
      parts.push(patient_data.pm_gender[0].toUpperCase());
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
    
    const mrn = patients_details?.pm_reference_id || patient_data?.pm_reference_id || patient_data?.tpml_refrence_id;
    const patientId = mrn || patient_data?.pm_pid;
    if (patientId) {
      parts.push(patientId);
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'N/A';
  };

  return (
    <div className="patient-profile-section">
      <div className="profile-card">
        <div className="profile-avatar">
          {makeDefaultLogo(patient_data?.pm_fullname)}
        </div>
        <div className="profile-info">
          <div className="patient-name">{patient_data?.pm_fullname || 'N/A'}</div>
          <div className="patient-details">
            {getPatientDetailsString(patient_data)}
            {isPaediatric && patientDOB ? ` (${patientDOB})` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientProfileSection;


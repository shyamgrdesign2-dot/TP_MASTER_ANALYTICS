import React from 'react';
import './PatientOptionsModal.scss';

import { trackEvent } from '../../../../utils/utils';
import { ASSETS } from "../../../../assets";
const {
  close2: CloseIcon,
  user: UserIcon,
  login: LoginIcon,
  calendar2: CalendarIcon,
} = ASSETS.mobile;

function PatientOptionsModal({ 
  patient, 
  onClose, 
  onEdit, 
  onCreatePrescription, 
  onBookAppointment,
  onWalkInConsultation,
  onViewDetails,
  doctorDetails 
}) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleOptionClick = (action) => {
    switch (action) {
      case 'details':
        onViewDetails && onViewDetails();
        break;
      case 'edit':
        onEdit && onEdit();
        break;
      case 'prescription':
        onCreatePrescription && onCreatePrescription();
        break;
      case 'appointment':
        onBookAppointment && onBookAppointment();
        break;
      case 'walkIn':
        onWalkInConsultation && onWalkInConsultation();
        break;
      default:
        break;
    }
    onClose();
  };

  return (
    <div className="patient-options-modal-backdrop" onClick={handleBackdropClick}>
      <div className="patient-options-modal">
        <div className="modal-header">
          <div className="modal-title">
            <h3>Options</h3>
          </div>
          <button 
            className="close-button"
            onClick={onClose}
            type="button"
          >
            <img src={CloseIcon} alt="Close" className="close-icon" />
          </button>
        </div>
        
        <div className="modal-content">
          <div className="options-list">
            <button 
              className="option-item"
              onClick={() => handleOptionClick('details')}
            >
              <div className="option-icon">
                <img src={UserIcon} alt="User" />
              </div>
              <span>Patient Details</span>
            </button>
            <div className="option-divider" />
            <button 
              className="option-item"
              onClick={() => handleOptionClick('walkIn')}
            >
              <div className="option-icon">
                <img src={LoginIcon} alt="Walk-in" />
              </div>
              <span>Start Walk-in Consultation</span>
            </button>
            {/* Temporarily commented out - will be implemented in next phase */}
            {/* <div className="option-divider" />
            <button 
              className="option-item"
              onClick={() => handleOptionClick('appointment')}
            >
              <div className="option-icon">
                <img src={CalendarIcon} alt="Calendar" />
              </div>
              <span>Book Appointment</span>
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientOptionsModal;

import React from 'react';
import moment from 'moment';
import { TAB_QUEUE, TAB_FINISHED, TAB_CANCELLED } from '../../../../utils/constants';

import './AppointmentCard.scss';
import { ASSETS } from "../../../../assets";
const moreVerticalIcon = ASSETS.mobile.moreVertical;

function AppointmentCard({
  appointment,
  selectedTab,
  onConsultClick,
  onPatientDetailsClick,
  onViewRxClick,
  onCancelClick,
  onMoreOptionsClick,
}) {
  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'P';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get gender and age
  const getGenderAge = () => {
    const gender = appointment.pm_gender || '';
    const contact = appointment.pm_contact_no || '';
    const pid = appointment.pm_pid || appointment.pm_reference_id || '';
    const shortGender = gender ? (gender.charAt(0).toUpperCase()) : '';
    
    let ageStr = '';
    if (appointment.ageYears != 0) {
      ageStr = `${appointment.ageYears}y`;
    } else if (appointment.ageMonths != 0) {
      ageStr = `${appointment.ageMonths}m`;
    } else if (appointment.ageDays != 0) {
      ageStr = `${appointment.ageDays}d`;
    }
    
    const parts = [];
    if (shortGender) parts.push(shortGender);
    if (ageStr) parts.push(ageStr);
    if (contact) parts.push(contact);
    if (pid) parts.push(pid);
    
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {index > 0 && <span style={{ color: '#a2a2a8' }}> | </span>}
        {part}
      </React.Fragment>
    ));
  };

  // Get chips data
  const getChips = () => {
    const chips = [];
    
    // Time and date chip
    if (appointment.apTime || appointment.apDate) {
      const timeText = appointment.apTime || '';
      const dateText = appointment.apDate ? `(${formatDate(appointment.apDate)})` : '';
      chips.push({
        type: 'time',
        text: `${timeText} ${dateText}`.trim(),
      });
    }

    // Visit type + Billed/Unbilled: one chip like "New Visit (Unbilled)" – only (Billed)/(Unbilled) in color (reference)
    if (appointment.toct_type || appointment.billStatus) {
      const billType = appointment.billStatus === 'Unbilled' ? 'unbilled' : 'billed';
      if (appointment.toct_type && appointment.billStatus) {
        chips.push({
          type: billType,
          text: appointment.toct_type,
          billLabel: `(${appointment.billStatus})`,
        });
      } else if (appointment.toct_type) {
        chips.push({ type: 'visit-type', text: appointment.toct_type });
      } else {
        chips.push({
          type: billType,
          text: appointment.billStatus,
        });
      }
    }

    return chips;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parsed = moment(dateStr, 'Do MMM YYYY');
      if (parsed.isValid()) {
        return parsed.format('DD MMM');
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const patientName = appointment.pm_salutation
    ? `${appointment.pm_salutation} ${appointment.pm_fullname}`
    : appointment.pm_fullname;

  const chips = getChips();

  return (
    <div className="appointment-card">
      <div className="card-header">
        <div className="patient-info">
          <div className="patient-avatar">
            <div className="avatar-initials">
              {getInitials(appointment.pm_fullname)}
            </div>
          </div>
          <div className="patient-details">
            <div className="patient-name">{patientName}</div>
            <div className="patient-meta">{getGenderAge()}</div>
          </div>
        </div>
        {selectedTab !== TAB_CANCELLED && (
          <button
            className="more-options-btn"
            onClick={() => onMoreOptionsClick(appointment)}
            type="button"
          >
            <img src={moreVerticalIcon} alt="More options" className="more-options-icon" />
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="card-chips">
          {chips.map((chip, index) => (
            <div
              key={index}
              className={`chip ${chip.type === 'time' ? 'time-chip' : 'status-chip'} ${chip.type} ${chip.billLabel ? 'has-bill-label' : ''}`}
            >
              <span className="chip-text">{chip.text}</span>
              {chip.billLabel && <span className="chip-bill-label">{chip.billLabel}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="card-divider" />

      <div className="card-actions">
        <button
          className="btn-outline btn-patient-details"
          onClick={() => onPatientDetailsClick(appointment)}
        >
          Patient Details
        </button>
        {selectedTab === TAB_FINISHED ? (
          <button
            className="btn-primary btn-view-rx"
            onClick={() => onViewRxClick(appointment)}
          >
            View Rx
          </button>
        ) : selectedTab === TAB_QUEUE ? (
          <button
            className="btn-primary btn-consult"
            onClick={() => onConsultClick(appointment)}
          >
            Voice Rx
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default AppointmentCard;
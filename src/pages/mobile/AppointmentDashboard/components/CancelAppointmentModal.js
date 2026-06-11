import React from 'react';
import { Drawer } from 'antd';

import './CancelAppointmentModal.scss';
import { ASSETS } from "../../../../assets";
const {
  close2: closeIcon,
  alert: alertIcon,
} = ASSETS.mobile;

function CancelAppointmentModal({
  visible,
  onClose,
  onConfirm,
  loading,
}) {
  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="auto"
      className="cancel-appointment-modal"
      closable={false}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">
            Are you sure you want to cancel this appointment?
          </h3>
          <button className="close-btn" onClick={onClose} type="button">
            <img src={closeIcon} alt="Close" className="close-icon" />
          </button>
        </div>

        <div className="warning-box">
          <div className="warning-icon">
            <img src={alertIcon} alt="Alert" className="alert-icon" />
          </div>
          <p className="warning-text">
            Canceling this appointment will free up the time slot for others. This action cannot be undone. Do you want to proceed?
          </p>
        </div>

        <div className="modal-actions">
          <button
            className="btn-cancel"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Cancelling...' : 'Yes, Cancel Appointment'}
          </button>
          <button
            className="btn-keep"
            onClick={onClose}
            disabled={loading}
          >
            No, Keep Appointment
          </button>
        </div>
      </div>
    </Drawer>
  );
}

export default CancelAppointmentModal;


import React, { useState } from 'react';
import { Drawer } from 'antd';

import './EndVisitModal.scss';
import { ASSETS } from "../../../../assets";
const closeIcon = ASSETS.mobile.close2;

function EndVisitModal({
  visible,
  onClose,
  onConfirm,
  loading,
}) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      return;
    }
    onConfirm(reason);
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Drawer
      placement="bottom"
      onClose={handleClose}
      open={visible}
      height="auto"
      className="end-visit-modal"
      closable={false}
      maskClosable={true}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">End Visit</h3>
          <button className="close-btn" onClick={handleClose} type="button">
            <img src={closeIcon} alt="Close" className="close-icon" />
          </button>
        </div>

        <div className="reason-field">
          <label className="reason-label">
            Reason<span className="required-asterisk">*</span>
          </label>
          <textarea
            className="reason-textarea"
            placeholder="Enter the reason to end the visit"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <div className="modal-actions">
          <button
            className="btn-save"
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
            type="button"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

export default EndVisitModal;


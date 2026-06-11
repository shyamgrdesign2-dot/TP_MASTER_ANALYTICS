import React from 'react';
import { Drawer } from 'antd';
import { TAB_QUEUE, TAB_FINISHED } from '../../../../utils/constants';

import './MoreOptionsModal.scss';
import { ASSETS } from "../../../../assets";
const {
  close2: closeIcon,
  endvisit: endVisitIcon,
  cancelappointment: cancelAppointmentIcon,
  printrx: printRxIcon,
  download: downloadIcon,
} = ASSETS.mobile;

function MoreOptionsModal({
  visible,
  onClose,
  appointment,
  selectedTab,
  onCancelClick,
  onEndVisitClick,
  onPrintRxClick,
  onDownloadRxClick,
}) {
  if (!appointment) return null;

  const handleAction = (action) => {
    onClose();
    switch (action) {
      case 'cancel':
        onCancelClick && onCancelClick(appointment);
        break;
      case 'end-visit':
        onEndVisitClick && onEndVisitClick(appointment);
        break;
      case 'print-rx':
        onPrintRxClick && onPrintRxClick(appointment);
        break;
      case 'download-rx':
        onDownloadRxClick && onDownloadRxClick(appointment);
        break;
      default:
        break;
    }
  };

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="auto"
      className="more-options-modal"
      closable={false}
      maskClosable={true}
    >
      <div className="more-options-modal-content">
        {/* Header */}
        <div className="more-options-modal-header">
          <h3 className="more-options-modal-title">More Options</h3>
          <button className="more-options-modal-close" onClick={onClose} type="button">
            <img src={closeIcon} alt="Close" className="more-options-close-icon" />
          </button>
        </div>

        {/* Options List */}
        <div className="more-options-options-list">
          {selectedTab === TAB_QUEUE && (
            <>
              {/* Option 1: Cancel Appointment */}
              <div className="more-options-option-item" onClick={() => handleAction('cancel')}>
                <div className="more-options-option-content">
                  <div className="more-options-option-icon-wrapper">
                    <img src={cancelAppointmentIcon} alt="Cancel Appointment" className="more-options-option-icon" />
                  </div>
                  <div className="more-options-option-text">
                    <span>Cancel Appointment</span>
                  </div>
                </div>
                <div className="more-options-option-divider" />
              </div>

              {/* Option 2: End Visit */}
              <div className="more-options-option-item" onClick={() => handleAction('end-visit')}>
                <div className="more-options-option-content">
                  <div className="more-options-option-icon-wrapper">
                    <img src={endVisitIcon} alt="End Visit" className="more-options-option-icon" />
                  </div>
                  <div className="more-options-option-text">
                    <span>End Visit</span>
                  </div>
                </div>
                <div className="more-options-option-divider" />
              </div>
            </>
          )}

          {selectedTab === TAB_FINISHED && (
            <>
              {/* Option 1: Print Rx */}
              <div className="more-options-option-item" onClick={() => handleAction('print-rx')}>
                <div className="more-options-option-content">
                  <div className="more-options-option-icon-wrapper">
                    <img src={printRxIcon} alt="Print Rx" className="more-options-option-icon" />
                  </div>
                  <div className="more-options-option-text">
                    <span>Print Rx</span>
                  </div>
                </div>
                <div className="more-options-option-divider" />
              </div>

              {/* Option 2: Download Rx */}
              <div className="more-options-option-item" onClick={() => handleAction('download-rx')}>
                <div className="more-options-option-content">
                  <div className="more-options-option-icon-wrapper">
                    <img src={downloadIcon} alt="Download Rx" className="more-options-option-icon" />
                  </div>
                  <div className="more-options-option-text">
                    <span>Download Rx</span>
                  </div>
                </div>
                <div className="more-options-option-divider" />
              </div>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default MoreOptionsModal;


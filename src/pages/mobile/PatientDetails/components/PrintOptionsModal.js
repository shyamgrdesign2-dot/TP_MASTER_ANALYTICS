import React from 'react';
import { Drawer } from 'antd';

import './PrintOptionsModal.scss';
import { ASSETS } from "../../../../assets";
const {
  close2: closeIcon,
  print: printIcon,
  printrx: printRxIcon,
} = ASSETS.mobile;

function PrintOptionsModal({
  visible,
  onClose,
  onPrintClick,
  onPrintMedicinesOnlyClick,
  showPrintMedicinesOnly = true,
}) {
  const handleAction = (action) => {
    onClose();
    switch (action) {
      case 'print':
        onPrintClick && onPrintClick();
        break;
      case 'print-medicines-only':
        onPrintMedicinesOnlyClick && onPrintMedicinesOnlyClick();
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
      className="print-options-modal"
      closable={false}
      maskClosable={true}
    >
      <div className="print-options-modal-content">
        <div className="print-options-modal-header">
          <h3 className="print-options-modal-title">Print Options</h3>
          <button className="print-options-modal-close" onClick={onClose} type="button">
            <img src={closeIcon} alt="Close" className="print-options-close-icon" />
          </button>
        </div>

        <div className="print-options-list">
          <div className="print-options-option-item" onClick={() => handleAction('print')}>
            <div className="print-options-option-content">
              <div className="print-options-option-icon-wrapper">
                <img src={printIcon} alt="Print" className="print-options-option-icon" />
              </div>
              <div className="print-options-option-text">
                <span>Print</span>
              </div>
            </div>
            <div className="print-options-option-divider" />
          </div>

          {showPrintMedicinesOnly && (
            <div className="print-options-option-item" onClick={() => handleAction('print-medicines-only')}>
              <div className="print-options-option-content">
                <div className="print-options-option-icon-wrapper">
                  <img src={printRxIcon} alt="Print Medicines Only" className="print-options-option-icon" />
                </div>
                <div className="print-options-option-text">
                  <span>Print Medicines Only</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default PrintOptionsModal;


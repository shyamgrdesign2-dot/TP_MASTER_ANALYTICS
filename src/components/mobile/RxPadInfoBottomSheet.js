import React from 'react';
import { Drawer } from 'antd';

import './RxPadInfoBottomSheet.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;

function RxPadInfoBottomSheet({ visible, onClose }) {
  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="auto"
      className="rx-pad-info-bottom-sheet"
      closable={false}
      maskClosable
    >
      <div className="rx-pad-info-bottom-sheet-content">
        <div className="rx-pad-info-bottom-sheet-header">
          <h3 className="rx-pad-info-bottom-sheet-title">Note</h3>
          <button
            className="rx-pad-info-bottom-sheet-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <img src={closeIcon} alt="" />
          </button>
        </div>

        <div className="rx-pad-info-bottom-sheet-body">
          <p className="rx-pad-info-bottom-sheet-text">
            Review the structured Rx data below. You can edit or add details directly here, or use voice input to update them.
          </p>
        </div>

        <div className="rx-pad-info-bottom-sheet-actions">
          <button
            type="button"
            className="rx-pad-info-bottom-sheet-btn"
            onClick={onClose}
          >
            Got it
          </button>
        </div>

        <div className="rx-pad-info-bottom-sheet-home-indicator" />
      </div>
    </Drawer>
  );
}

export default RxPadInfoBottomSheet;

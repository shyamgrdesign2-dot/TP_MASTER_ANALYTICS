import React from 'react';
import { Drawer, Button } from 'antd';

import './MobileNoConditionScreen.scss';
import { ASSETS } from "../../assets";
const closeIcon = ASSETS.mobile.close2;
const noConditionImage = ASSETS.images.noHypertension;

function MobileNoConditionScreen({ 
  visible, 
  onClose, 
  item,
  onSetActive,
  onBack
}) {
  if (!visible || !item) return null;

  const conditionName = item.title || 'condition';

  return (
    <Drawer
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="60vh"
      className="mobile-no-condition-screen"
      closable={false}
      maskClosable={true}
    >
      <div className="mobile-no-condition-content">
        {/* Header */}
        <div className="mobile-no-condition-header">
          <button
            className="mobile-no-condition-back"
            onClick={onBack}
            type="button"
          >
            <i className="icon-left" />
          </button>
          <h3 className="mobile-no-condition-title">{conditionName}</h3>
          <button
            className="mobile-no-condition-close"
            onClick={onClose}
            type="button"
          >
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        {/* Body */}
        <div className="mobile-no-condition-body">
          <img 
            src={noConditionImage} 
            alt={`No ${conditionName}`}
            className="no-condition-image"
          />
          <h2 className="no-condition-heading">
            No {conditionName}!
          </h2>
          <p className="no-condition-text">
            You have selected as patient does not<br />
            have {conditionName}
          </p>

          <Button
            type="primary"
            className="change-to-active-btn"
            onClick={() => onSetActive?.(item)}
          >
            Change to Active
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export default MobileNoConditionScreen;

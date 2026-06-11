import React from 'react';

import './EmptyState.scss';
import { ASSETS } from "../../../../assets";
const emptyIllustration = ASSETS.mobile.emptyIllustration;

function EmptyState({ message }) {
  return (
    <div className="empty-state-wrapper">
      <div className="empty-state">
        <img src={emptyIllustration} alt="No data" className="empty-icon" />
        <div className="empty-message">{message}</div>
      </div>
    </div>
  );
}

export default EmptyState;


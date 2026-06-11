import React from 'react';
import { message } from 'antd';
// import BillingDashboard from '../../../opdBilling/components/billingDashboard/BillingDashboard';
import { MESSAGE_KEY } from '../../../../utils/constants';
import './BillingTab.scss';

function BillingTab({ patientData, fromPath }) {
  // Coming soon CTA - non clickable for now
  // const handleCardClick = () => {
  //   message.open({
  //     key: MESSAGE_KEY,
  //     type: '',
  //     className: 'message-appointment',
  //     content: 'Feature coming in the next update',
  //     duration: 3,
  //   });
  // };

  return (
    <div className="billing-tab">
      {/* <BillingDashboard patientData={patientData} fromPath={fromPath} /> */}
      <div className="billing-tab-greyed-card">
        <div className="billing-tab-content">
          <div className="billing-tab-icon-wrapper">
            <div className="billing-tab-icon">
              <i className="icon-billings" />
            </div>
          </div>
          <div className="billing-tab-text">
            <h3 className="billing-tab-title">Billing & Payment</h3>
            <p className="billing-tab-subtitle">This feature will be available soon</p>
          </div>
          <div className="billing-tab-badge">
            <span>Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingTab;

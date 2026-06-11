import React from "react";
import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import "./InfoTooltip.css";

const InfoTooltip = ({ type = "Refunded", amount, billNo, notes }) => {
  const renderContent = () => {
    if (type === "Refunded") {
      return (
        <div className="custom-tooltip-content">
          <div
            className="tooltip-header"
            style={{
              marginBottom: notes ? 12 : 0,
            }}
          >
            <span>Refunded </span>
            <span className="amount">₹{amount}</span>
          </div>
          {notes && (
            <div className="tooltip-notes">
              <div className="notes-label">Credit Notes:</div>
              <div className="notes-content">{notes}</div>
            </div>
          )}
        </div>
      );
    } else if (type === "Debit") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            This amount <span style={{ fontWeight: 700 }}>₹{amount}</span> was
            debited against patient's next Bill No:{" "}
            <span style={{ fontWeight: 700 }}>{billNo}</span>
          </div>
        </div>
      );
    } else if (type === "Deposit") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            This amount was deposited via a refund from Bill No:{" "}
            <span style={{ fontWeight: 700 }}>{billNo}</span>
          </div>
        </div>
      );
    } else if (type === "BillNumber") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Customize the <span style={{ fontWeight: 700 }}>Bill Number</span>{" "}
            format. This sequence appears on all generated Bill Receipts for
            patients. Example: BIL_20240100.
          </div>
        </div>
      );
    } else if (type === "BillReceiptNumber") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Customize the{" "}
            <span style={{ fontWeight: 700 }}>Bill Receipt Number</span> format.
            This sequence appears on all generated Bill Receipts for patients.
            Example: REP_20240100.
          </div>
        </div>
      );
    } else if (type === "AdvanceReceiptNumber") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Set the format for{" "}
            <span style={{ fontWeight: 700 }}>Advance Receipt Numbers</span>.
            This sequence appears on Advance Deposit Receipts issued to
            patients. Example: ADV_202401001.
          </div>
        </div>
      );
    } else if (type === "GSTIN") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Enter your clinic's{" "}
            <span style={{ fontWeight: 700 }}>
              GSTIN (Goods and Services Tax Identification Number)
            </span>
            . This number will appear on all Bill Receipts and Advance Deposit
            Receipts.
          </div>
        </div>
      );
    } else if (type === "DefaultPaymentMode") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Select the{" "}
            <span style={{ fontWeight: 700 }}>default payment mode</span>
            (e.g., Cash, Card, UPI). This will be pre-selected during billing to
            record the paid amount but can be changed as needed.
          </div>
        </div>
      );
    } else if (type === "BillingStatus") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Choose whether to display the{" "}
            <span style={{ fontWeight: 700 }}>
              billing status on the Appointment screen
            </span>
            . This helps staff/Doctor to track payment progress for
            appointments.
          </div>
        </div>
      );
    } else if (type === "DefaultDiscountType") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Define the default discount type{" "}
            <span style={{ fontWeight: 700 }}>default discount type</span>: flat
            amount(₹) or percentage(%). This will be applied automatically
            during billing if selected
          </div>
        </div>
      );
    } else if (type === "Form3c") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Enable this option to{" "}
            <span style={{ fontWeight: 700 }}>
              include bills in Form C reports
            </span>
            . Form C is a compliance document required in some cases
          </div>
        </div>
      );
    } else if (type === "AdvanceInRx") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Enable this option to include the{" "}
            <span style={{ fontWeight: 700 }}>
              Advance Deposit Receipt/Bill Receipt
            </span>{" "}
            in the Rx print
          </div>
        </div>
      );
    } else if (type === "ReceptionistAccessControl") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Set{" "}
            <span style={{ fontWeight: 700 }}>
              permissions for receptionists
            </span>
            . You can allow or restrict their ability to view or manage billing
          </div>
        </div>
      );
    } else if (type === "BillInfoInPrint") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Choose whether to{" "}
            <span style={{ fontWeight: 700 }}>
              display the name of the bill creator and the bill creation date
            </span>{" "}
            on printed Bill receipts.
          </div>
        </div>
      );
    } else if (type === "EditBillAccessControlForReception") {
      return (
        <div className="custom-tooltip-content">
          <div className="due-amount-text">
            Set permissions for reception staff; you can allow or restrict their
            ability to edit OPD bills.
          </div>
        </div>
      );
    }

    return (
      <div className="custom-tooltip-content">
        <div className="due-amount-text">
          This due amount of <span style={{ fontWeight: 700 }}>₹{amount}</span>{" "}
          has been automatically added to the patient's next bill
          {billNo && (
            <div className="bill-no">
              (Bill No: <span style={{ fontWeight: 700 }}>{billNo}</span>)
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Tooltip
      overlayClassName="custom-tooltip-container"
      title={renderContent()}
      color="white"
      placement={type === "Debit" ? "bottomRight" : "bottom"}
    >
      <InfoCircleOutlined className="info-icon" />
    </Tooltip>
  );
};

export default InfoTooltip;

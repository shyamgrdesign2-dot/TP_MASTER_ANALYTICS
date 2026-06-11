import React from "react";
import { Modal } from "antd";
import "../AbhaDrawer.scss";

const TermsAndConditionsPopup = ({
  open = false,
  onClose = () => {},
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={true}
      centered
      width={675}
      className="terms_conditions_modal"
      zIndex={1200}
      maskClosable={false}
      closeIcon={
        <span className="terms_conditions_close_icon">×</span>
      }
    >
      <div className="terms_conditions_content">
        <div className="terms_conditions_header">
          <h3 className="terms_conditions_title">Terms and Conditions</h3>
        </div>

        <div className="terms_conditions_body">
          <p className="terms_conditions_text">
            I, hereby declare that I am voluntarily sharing my Aadhaar Number and demographic information issued by UIDAI, with National Health Authority (NHA) for the sole purpose of creation of ABHA number . I understand that my ABHA number can be used and shared for purposes as may be notified by ABDM from time to time including provision of healthcare services. Further, I am aware that my personal identifiable information (Name, Address, Age, Date of Birth, Gender and Photograph) may be made available to the entities working in the National Digital Health Ecosystem (NDHE) which inter alia includes stakeholders and entities such as healthcare professionals (e.g. doctors), facilities (e.g. hospitals, laboratories) and data fiduciaries (e.g. health programmes), which are registered with or linked to the Ayushman Bharat Digital Mission (ABDM) , and various processes there under.
          </p>
        </div>

        <div className="terms_conditions_footer">
          <button
            className="terms_conditions_got_it_button"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TermsAndConditionsPopup;

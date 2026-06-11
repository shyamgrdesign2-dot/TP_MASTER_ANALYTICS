import React from "react";
import { Modal, Card } from "antd";
import { useSelector } from "react-redux";
import { ASSETS } from "../assets";
import { getClinicName, getDeviceSdkData, getTokenData } from "../utils/utils";

const SMS = ASSETS.images.sms;

function ContactSupportModal({ isModalOpen, clickContactSupport }) {

  const { profile } = useSelector((state) => state.doctors);

  const contactNumberandEmail = () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData();
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Monetization_VoiceRx_Contact_Support", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      um_id: tokenData?.user_id,
      clinic_Name: clinic_name,
      ...deviceSdkData,
    });
  }

  return (
    <Modal
      open={isModalOpen}
      centered
      closeIcon={false}
      footer={null}
      className="modalcommon"
      destroyOnClose
    >
      <Card
        title='Contact Support'
        extra={
          <button className="btn p-1 lh-1 btnclose closeButton" onClick={clickContactSupport}>
            <i className="icon-Cross"></i>
          </button>
        }
      >
        <div className="rounded-4 p-4 w-100" style={{ background: "#4B4AD514" }}>
          <div className="align-items-center">
            <i className="icon-phone fs-18"></i>
            <a className="text-main fw-medium fs-16" href="tel:+91-9974042363" onClick={contactNumberandEmail}> +91-9974042363</a>
          </div>
          <div className="my-2">(Monday - Saturday | 9am to 8pm)</div>
          <div className="align-items-center">
            <img className="me-1" width={19} height={19} src={SMS} />
            <a className="text-main fw-medium fs-16" href="mailto:support@tatvacare.in" onClick={contactNumberandEmail}>
              Support@tatvacare.in
            </a>
          </div>
        </div>
      </Card>
    </Modal>
  );
}

export default React.memo(ContactSupportModal);

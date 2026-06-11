import React from "react";

import { getClinicName, getDeviceSdkData, getTokenData } from "../../../utils/utils";
import { useSelector } from "react-redux";
import { ASSETS } from "../../../assets";
const SMS = ASSETS.images.sms;

function ContactSupport({ refs }) {

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
    <div
      id="contactSupport"
      ref={(el) => refs && (refs.current.contactSupport = el)}
    >
      <span className="fs-12-1 fw-medium text-primary">Contact Support</span>
      <div className="fw-semibold fs-20 text-black mb-2">
        Need More Help? Reach Out to Our Support Team
      </div>
      <div
        className="d-inline-flex align-items-center rounded-4 p-4"
        style={{ background: "#4B4AD514" }}
      >
        <i className="icon-phone fs-18"></i>
        <a className="text-main fw-medium fs-16" href="tel:+91-9974042363" onClick={contactNumberandEmail}>
          +91-9974042363
        </a>{" "}
        <div className="mx-2">|</div>
        <img width={19} height={19} src={SMS} />
        <a className="text-main fw-medium fs-16" href="mailto:support@tatvacare.in" onClick={contactNumberandEmail}>
          Support@tatvacare.in
        </a>
      </div>
    </div>
  );
}

export default React.memo(ContactSupport);
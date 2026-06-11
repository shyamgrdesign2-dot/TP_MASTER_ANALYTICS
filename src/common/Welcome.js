import React, { useState, useEffect, useCallback } from "react";
import Button from "react-bootstrap/Button";
import { Drawer } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { userCredit } from "../redux/bulkMessagesSlice";

import { getDecodedToken } from "../utils/localStorage";
import config from "../config";
import AvailableCredits from "../components/bulk_messages/AvailableCredits";
import { getClinicCity } from "../utils/utils";
import { isMobile } from "react-device-detect";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_CVT_EXT_HOS, GB_ZYDUS_USER } from "../utils/constants";
import { env } from "../EnvironmentConfig";
import useTabletViewport from "../hooks/useTabletViewport";
import { ASSETS } from "../assets";
const CreditImg = ASSETS.images.creditIcon;

function Welcome(props) {

  const { locationPath, backVisible, appointmentAgentsData } = props;

  const { userCreditObj } = useSelector((state) => state.bulkMessages);
  const { profile } = useSelector((state) => state.doctors);
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const [availableCredit, setAvailableCredit] = useState(false);
  const decodedToken = getDecodedToken();

  const location = useLocation();
  const isFromAddAppointment = location.state?.from === "/add-appointment";

  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);


  const isTablet = useTabletViewport();

  const clickWalkInConsultation = () => {
    const businessId = decodedToken?.result?.hospital_business_id;
    window.Moengage.track_event("walk_in_consultation_click", {
      "doctor_id": profile?.doctor_unique_id,
      "timestamp": new Date(),
    });
    if (businessId == config.zydus_business_id) {
      navigate("/walk_in_consultation_zydus")
    } else {
      navigate("/walk_in_consultation")
    }
  }

  const handleAvailableCredit = useCallback(
    () => {
      setAvailableCredit(!availableCredit)
    },
    [availableCredit]
  );

  const handleNewTemplate = () => {
    navigate('/create-campaign', { state: { setupData:appointmentAgentsData } });
    const clinic_city = getClinicCity(profile?.hospital_data);
    window.Moengage.track_event("TP_Choose_New_Template", {
      "Doctor_specialty": profile?.dp_name,
      "Doctor_unique_id": profile?.doctor_unique_id,
      clinic_city,
      "Doctor_Name": profile?.um_name,
      "Doctor_mobile_No": profile?.um_contact,
    });
  }

  return (
    <>
      <div className="welcomesection position-relative">
        <div className="bg-welcome d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            {backVisible && (
              <div onClick={() => isFromAddAppointment ? navigate("/add-appointment", {
                replace: true,
                state: {
                  ...location.state
                }
              }) : navigate(-1)} className="lh-1 me-1 px-2 text-dark cursor-pointer">
                <i className="fs-3 icon-right"></i>
              </div>
            )}
            <div>
              {locationPath == "/add_patient" ? (
                <h1>Add New Patient</h1>
              ) : locationPath == "/edit_patient" ? (
                <h1>Edit Patient Details</h1>
              ) : (locationPath == "/walk_in_consultation" || locationPath == "/walk_in_consultation_zydus") ? (
                <h1>Start Walk-In Consultation</h1>
              ) : locationPath == "/bulk_messages" ? (
                <h1>Messages</h1>
              ) : locationPath == "/billing-dashboard" ? (
                <h1>Bill History</h1>
              ) : (
                <h1>Welcome Dr. {profile?.um_name?.split(/\s+/).filter(word => (word.toLowerCase() != "Dr".toLowerCase() && word.toLowerCase() != "Dr.".toLowerCase())).join(' ')}!</h1>
              )}
              {locationPath == "/" && <p>{"Your Appointments"}</p>}
              {locationPath == "/bulk_messages" && <p className="text-main fw-medium fs-14">{"Engage patients with timely updates and reminders"}</p>}
            </div>
          </div>
          <div className="d-flex gap-1">
            <div>
              {locationPath == "/" && !isCvtExtHosAccessableFromGB &&
                <div className="d-lg-flex d-block">
                  {decodedToken?.result?.hospital_business_id != env.zydus_business_id && !isZydusUserAccessableFromGB && (
                    <Button
                      variant="outline-primary"
                      className="px-3 btn-41 me-3 btn-outline-primary d-flex align-items-center rounded-10px"
                      style={{
                        background: 'rgba(255,255,255,0.5)',
                      }}
                      onClick={() => {
                        window.Moengage.track_event("TP_AddAppointment_addnewappointment", {
                          "Doctor_specialty": profile?.dp_name,
                          "Doctor_unique_id": profile?.doctor_unique_id,
                          "Doctor_Name": profile?.um_name,
                          "Doctor_mobile_No": profile?.um_contact,
                        });
                        navigate('/add-appointment');
                      }}>
                      <i className="icon-Add me-2"></i>
                      {`Add ${isTablet ? "" : "New"} Appointment`}
                    </Button>
                  )}
                  
                  <Button
                    variant="primary"
                    className="px-3 btn-41"
                    onClick={clickWalkInConsultation}>
                    {`Start Walk-in ${isTablet ? "" : "Consultation"}`}
                  </Button>
                </div>
              }
              {locationPath == "/bulk_messages" &&
                <div className="d-lg-flex d-block">
                  <Button
                    onClick={handleAvailableCredit}
                    className="px-3 btn-41 btn-message d-flex align-items-center">
                    <img src={CreditImg} width={19} className="me-2" />
                    {`Available Credits: ${userCreditObj?.userCredit}`}
                  </Button>
                  <Button
                    variant="primary"
                    className="px-3 btn-41 ms-3 d-flex align-items-center"
                    onClick={handleNewTemplate}>
                    <i className="icon-Add me-2"></i>
                    {"Choose new Template"}
                  </Button>
                </div>
              }
            </div>
          </div>
        </div>
        <div className="pb-5">&nbsp;</div>
      </div>

      {/* Message Credits Drawer */}
      <Drawer
        className="modalWidth-645" width="auto"
        title="Buy Message Credits"
        placement="right"
        closable
        open={availableCredit}
        onClose={handleAvailableCredit}
      >
        <AvailableCredits handleAvailableCredit={handleAvailableCredit} />
      </Drawer>
    </>
  );
}

export default React.memo(Welcome);

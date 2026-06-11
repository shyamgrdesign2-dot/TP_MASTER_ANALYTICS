import { Button } from "antd";

import { useDispatch } from "react-redux";
import { setShowSCPopup } from "../redux/ddxSlice";
import { getClinicName, getTokenData, trackEvent } from "../utils/utils";
import { useSelector } from "react-redux";
import { useContext } from "react";
import CashManagerContext from "../context/CashManagerContext";
import dayjs from "dayjs";
import { ASSETS } from "../assets";
const scStrip = ASSETS.images.scBannerStrip;

const SCBanner = ({ handleBanner }) => {
  const dispatch = useDispatch();
  const { profile, userId } = useSelector((state) => state.doctors);
  const { patient_data, pamId } = useContext(CashManagerContext);
  const clinic_name = getClinicName(profile?.hospital_data);
  const tokenData = getTokenData();

  return (
    <div
      className="d-flex justify-content-between align-items-center"
      style={{
        border: "1px solid #E2E2EA",
        borderRadius: 16,
        padding: "8px 12px 8px 18px",
        marginBottom: 20,
      }}
    >
      <div className="d-flex w-100">
        <div style={{ fontSize: 16 }}>
          <div className="d-flex align-items-center">
            <img
              src={scStrip}
              alt="scStrip"
              width={45}
              height={45}
              className="me-2"
            />
            <span>
              Hey! You’ve received <b style={{ fontWeight: 600 }}>symptoms</b>{" "}
              and <b style={{ fontWeight: 600 }}>medical history</b> details
              from the patient.
              <span
                className="theme-color cursor-pointer"
                style={{ textDecoration: "underline", marginLeft: 5 }}
                onClick={() => {
                  dispatch(setShowSCPopup(true));
                  trackEvent("SC_Doctor_ViewedSummary", {
                    clinic_name,
                    appointment_id:
                      patient_data !== undefined
                        ? patient_data.hasOwnProperty("pam_id")
                          ? patient_data.pam_id
                          : pamId
                        : 0,
                    hospital_id: tokenData?.clinic_id,
                    timestamp: dayjs().format("YYYY-MM-DD HH:mm:ss"),
                    doctor_id: userId,
                    doctor_name: profile?.um_name,
                    doctor_speciality: profile?.dp_name,
                  });
                }}
              >
                View now
              </span>
            </span>
          </div>
        </div>
      </div>
      <Button
        type="text"
        className="btn btn-delete-prescription focus-none h-100"
        style={{ padding: 5 }}
        onClick={handleBanner}
      >
        <i className="icon-Cross fs-3" />
      </Button>
    </div>
  );
};

export default SCBanner;

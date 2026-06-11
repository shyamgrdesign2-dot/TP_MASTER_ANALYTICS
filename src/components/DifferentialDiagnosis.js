import { Button, Collapse, Divider } from "antd";

import LoopingVideo from "../components/common/LoopingVideo";

import { useSelector } from "react-redux";
import {
  IS_DDX_DIAGNOSIS_OPEN,
  IS_DDX_LAB_INVESTIGATION_OPEN,
  S_DDX,
} from "../utils/constants";
import { useState, useCallback, useContext } from "react";
import { useAccess } from "../pages/vaccination/useAccess";
import { useLocation } from "react-router-dom";
import { WarningColor, WarningRank } from "./DifferentialDiagnosisDrawer";
import { getClinicName, getDeviceSdkData, getTokenData } from "../utils/utils";
import FreeTrialButton from "../pages/monetization/components/FreeTrialButton";
import CashManagerContext from "../context/CashManagerContext";
import { ASSETS } from "../assets";
const {
  apexai: apexAI,
  shadedArrow: arrow,
  ddxicon: ddxIcon,
  loading_2: loadingWebm,
  loading: loadingMp4,
  ddxBg,
} = ASSETS.images;

const DifferentialDiagnosis = ({
  handleDDxDrawer,
  ddxOptionsList,
  getGenerateDDx,
  isDDxLoading,
  onSelectParent,
  isDiagnosis,
  isSymptoms,
  handleDDxKnowMore,
  isDDxGenerated,
}) => {
  const { isDDxReadyToGenerate } = useSelector((state) => state.ddx);
  const { profile } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const { showHideSubModal } = useContext(CashManagerContext);

  const { state } = useLocation();
  const { patient_data } = state;

  const { isGynaecHistoryAccessable } = useAccess(patient_data?.ageYears);

  const [isCollapseActive, setIsCollapseActive] = useState(
    localStorage.getItem(
      isDiagnosis ? IS_DDX_DIAGNOSIS_OPEN : IS_DDX_LAB_INVESTIGATION_OPEN
    )
      ? JSON.parse(
        localStorage.getItem(
          isDiagnosis ? IS_DDX_DIAGNOSIS_OPEN : IS_DDX_LAB_INVESTIGATION_OPEN
        )
      )
      : true
  );

  const accordionItems = [
    {
      key: "1",
      label: (
        <div style={{ fontSize: 16, fontWeight: 500 }}>
          {isDiagnosis
            ? "Differential Diagnosis"
            : isSymptoms
              ? "Associated Symptoms"
              : "Suggested Tests"}
        </div>
      ),
      children:
        ddxOptionsList?.length > 0 ? (
          <>
            <span className="ddx-ready-txt">
              {isDiagnosis
                ? "Tap diagnosis to add to Rx"
                : isSymptoms
                  ? "These are symptoms associated with added diagnosis. Tap to add to Rx"
                  : "Test suggestions are based on added diagnosis. Tap to add to Rx"}
            </span>
            <div
              className="d-flex align-items-center"
              style={{
                padding: "15px 8px 0 0px",
                gap: 16,
                flexWrap: "wrap",
                width: "90%",
              }}
            >
              {ddxOptionsList?.map((item, index) => (
                <Button
                  key={index}
                  type="button"
                  className="btn-41 btn ant-btn-text btn-input d-flex flex-column test-name-btn"
                  style={{
                    gap: isDiagnosis ? 8 : "",
                    height: isDiagnosis ? 50 : "",
                    justifyContent: isDiagnosis ? "flex-start" : "center",
                    alignItems: isDiagnosis ? "flex-start" : "center",
                    background: "rgba(255, 255, 255, 0.6)",
                  }}
                  onClick={() => {
                    onSelectParent({ ...item });
                    window.Moengage.track_event(
                      isDiagnosis ? "TP_CDSS_Ddx_selected" : "TP_CDSS_addtoRx",
                      {
                        clinic_name: getClinicName(profile?.hospital_data),
                        doctor_id: profile?.doctor_unique_id,
                        patient_number: patient_data?.pm_contact_no,
                        patient_id: patient_data?.patient_unique_id,
                        field: "ddx",
                      }
                    );
                  }}
                >
                  <span className="ddx-btn">
                    {item?.tds_name ||
                      item?.symptom_name ||
                      item?.investigation_name}
                  </span>
                  {isDiagnosis && (
                    <div className="d-flex" style={{ columnGap: 2 }}>
                      {Array.from({
                        length: WarningRank[item?.likelihood] || 0,
                      }).map((_, index) => (
                        <div
                          key={index}
                          style={{
                            width: 13,
                            height: 4,
                            border: `2px solid ${WarningColor[item?.likelihood]
                              }`,
                            borderRadius: 2,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </Button>
              ))}
            </div>
            <Divider />
            <div
              className="d-flex align-items-center"
              style={{ columnGap: 14 }}
            >
              {isDiagnosis && (
                <div
                  className="d-flex align-items-center"
                  style={{
                    width: isDDxReadyToGenerate ? 268 : "",
                    height: 48,
                    backgroundColor: isDDxReadyToGenerate ? "white" : "",
                    padding: isDDxReadyToGenerate ? "4px 4px 4px 12px" : "",
                    borderRadius: 12,
                  }}
                >
                  {isDDxReadyToGenerate && (
                    <div
                      className="ddx-ready-txt"
                      style={{ fontSize: 12, width: 85 }}
                    >
                      Get updated diagnosis
                    </div>
                  )}
                  <div style={{ width: "160px", position: "relative" }}>
                    <Button
                      type="primary"
                      className="btn btn-primary3 btn-41 px-4 me-20 w-100 d-flex align-items-center justify-content-center"
                      style={{ gap: 10 }}
                      onClick={() => getGenerateDDx("ddx")}
                      disabled={!isDDxReadyToGenerate}
                    >
                      <img src={ddxIcon} alt="ddx-icon" />
                      Generate DDx
                      {/* Show shimmer overlay only when button is enabled */}
                      {isDDxReadyToGenerate && (
                        <div className="shimmer-overlay-cdss" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
              <Button
                type="button"
                className="btn-41 btn ant-btn-text btn-input d-flex align-items-center justify-content-between"
                style={{
                  background: "white",
                }}
                onClick={() => handleDDxDrawer("ddx")}
              >
                <span>View Detailed Analysis</span>
              </Button>
              {isDiagnosis && (
                <div
                  className="d-flex align-items-center"
                  style={{ columnGap: 8, cursor: "pointer" }}
                  onClick={handleDDxKnowMore}
                >
                  <div className="text-primary" style={{ fontWeight: 600 }}>
                    Know More About DDx
                  </div>
                  <img src={arrow} alt="arrow" />
                </div>
              )}
              <div className="ms-auto">
                <FreeTrialButton title={S_DDX} showHideSubModal={() => {
                showHideSubModal({ service_name: S_DDX })
                  const clinic_name = getClinicName(profile?.hospital_data);
                  const tokenData = getTokenData(); 
                  const deviceSdkData = getDeviceSdkData();
                  window.Moengage.track_event("TP_Monetization_FreeTrailButton", {
                    doctor_name: profile?.um_name,
                    doctor_number: profile?.um_contact,
                    doctor_unique_id: profile?.doctor_unique_id,
                    doctor_specialty: profile?.dp_name,
                    um_id: tokenData?.user_id,
                    clinic_id: tokenData?.clinic_id,
                    clinic_Name: clinic_name,
                    payment_Status: planDetails?.currentPlanStatus,
                    ...deviceSdkData
                  });
                }} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className={`${isDDxGenerated && ddxOptionsList?.length === 0
                ? "text-danger-custom"
                : ""
                }`}
            >
              {isDDxGenerated && ddxOptionsList?.length === 0
                ? `No results found! We couldn't generate any diagnosis due to incomplete or inaccurate information provided. Please review and update the details, then try again.`
                : `Enter key symptoms or examinations to get possible diagnoses and recommended tests.
            Adding additional details like medical history${isGynaecHistoryAccessable &&
                  patient_data?.pm_gender?.toLowerCase() === "female"
                  ? ", gynecological and obstetric history"
                  : ""
                } and lab results can help improve accuracy.`}
            </div>
            <div
              className="d-flex align-items-center"
              style={{
                padding: isDDxReadyToGenerate ? "0 8px" : "",
                marginTop: 16,
                columnGap: 16,
              }}
            >
              <div
                className="d-flex align-items-center"
                style={{
                  width: isDDxReadyToGenerate ? 268 : "",
                  height: 48,
                  backgroundColor: isDDxReadyToGenerate ? "white" : "",
                  padding: isDDxReadyToGenerate ? "4px 4px 4px 12px" : "",
                  borderRadius: 12,
                }}
              >
                {isDDxReadyToGenerate && (
                  <div className="ddx-ready-txt" style={{ fontSize: 12 }}>
                    DDx ready to generate!
                  </div>
                )}
                <div style={{ width: "160px", position: "relative" }}>
                  <Button
                    type="primary"
                    className="btn btn-primary3 btn-41 px-4 me-20 w-100 d-flex align-items-center justify-content-center"
                    style={{ gap: 10 }}
                    onClick={() => getGenerateDDx("ddx")}
                    disabled={!isDDxReadyToGenerate}
                  >
                    <img src={ddxIcon} alt="ddx-icon" />
                    Generate DDx
                    {/* Show shimmer overlay only when button is enabled */}
                    {isDDxReadyToGenerate && (
                      <div className="shimmer-overlay-cdss" />
                    )}
                  </Button>
                </div>
              </div>
              <div
                className="d-flex align-items-center"
                style={{ columnGap: 8, cursor: "pointer" }}
                onClick={handleDDxKnowMore}
              >
                <div className="text-primary" style={{ fontWeight: 600 }}>
                  Know More About DDx
                </div>
                <img src={arrow} alt="arrow" />
              </div>
              <div className="ms-auto">
                <FreeTrialButton title={S_DDX} showHideSubModal={() => {
                  showHideSubModal({ service_name: S_DDX })
                  const clinic_name = getClinicName(profile?.hospital_data);
                  const tokenData = getTokenData(); 
                  const deviceSdkData = getDeviceSdkData();
                  window.Moengage.track_event("TP_Monetization_FreeTrailButton", {
                    doctor_name: profile?.um_name,
                    doctor_number: profile?.um_contact,
                    doctor_unique_id: profile?.doctor_unique_id,
                    doctor_specialty: profile?.dp_name,
                    um_id: tokenData?.user_id,
                    clinic_id: tokenData?.clinic_id,
                    clinic_Name: clinic_name,
                    payment_Status: planDetails?.currentPlanStatus,
                    ...deviceSdkData
                  });
                  }} />
              </div>
            </div>
          </>
        ),
    },
  ];

  const handlePanelChange = () => {
    setIsCollapseActive((prev) => !prev);
    localStorage.setItem(
      isDiagnosis ? IS_DDX_DIAGNOSIS_OPEN : IS_DDX_LAB_INVESTIGATION_OPEN,
      !isCollapseActive
    );
  };

  return (
    <>
      <div className="d-flex" style={{ padding: "20px 0" }}>
        <div>
          <img
            style={{ backgroundColor: "#22003C", borderRadius: "10px 10px 0px" }}
            className="me-3"
            src={apexAI}
            alt="apex-AI"
          />
        </div>
        {isDDxLoading ? (
          <div
            className="d-flex flex-column align-items-center justify-content-center"
            style={{
              background: `url(${ddxBg})`,
              width: "100%",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              borderRadius: 12,
              padding: "17px 20px",
              width: "100%",
            }}
          >
            <LoopingVideo
              webm={loadingWebm}
              mp4={loadingMp4}
              width={105}
              height={105}
              ariaLabel="Loading"
            />
            <span className="title-common">Generating AI powered diagnosis</span>
          </div>
        ) : (
          <div
            className="d-flex flex-column"
            style={{
              width: "100%",
            }}
          >
            <Collapse
              items={accordionItems}
              defaultActiveKey={isCollapseActive ? ["1"] : null}
              onChange={handlePanelChange}
              className="prescriptiontab-accordian ddx-collapse"
              expandIconPosition={"end"}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default DifferentialDiagnosis;

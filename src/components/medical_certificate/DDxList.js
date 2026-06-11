import { Button, Card, Collapse, Divider } from "antd";

import LoopingVideo from "../../components/common/LoopingVideo";

import {
  ImpressionText,
  WarningColor,
  WarningRank,
} from "../DifferentialDiagnosisDrawer";
import { useContext, useState } from "react";
import CashManagerContext from "../../context/CashManagerContext";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { isMobile, isTablet } from "react-device-detect";
import { errorMessage, getClinicName, getDeviceSdkData, getTokenData, shouldMonetizationDisabled } from "../../utils/utils";
import { FAILED_VERIFICATION, FREE, S_DDX } from "../../utils/constants";
import CampaignDiscount from "../../pages/monetization/components/CampaignDiscount";

import { interest } from "../../redux/monetizationSlice";
import { openModal } from "../../redux/doctorModalSlice";
import { ASSETS } from "../../assets";
const {
  shadedArrow: arrow,
  tick: selectedTick,
  ddxicon: ddxIcon,
  loading_2: loadingWebm,
  loading: loadingMp4,
  ddx: ddxImg,
  ddxTag,
  crown,
  sms2: SMS2,
  expiredInfographic2,
} = ASSETS.images;

const DDxList = ({
  generatedDDx,
  handleDDxDrawer,
  isDDxLoading,
  handleDDxKnowMore,
  getGenerateDDx,
  handleDrawerVital,
  isDDxGenerated,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { servicesList } = useSelector((state) => state.doctors);
  const DDX_planDetails = servicesList?.find(e => e.service_name === S_DDX)

  const { diagnosisData, setDiagnosisData } = useContext(CashManagerContext);
  const { isDDxReadyToGenerate } = useSelector((state) => state.ddx);
  const { profile } = useSelector((state) => state.doctors);

  const tp_monetization_enable = !shouldMonetizationDisabled();

  const { state } = useLocation();
  const { patient_data } = state;

  const [isCollapseActive, setIsCollapseActive] = useState(false);

  const handlePanelChange = () => {
    setIsCollapseActive((prev) => !prev);
  };

  const clickBuyNow = (service_name) => {
    navigate('/get-unlimited-access', { state: { buyServiceName: service_name } })
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData(); 
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Monetization_VoiceRx_GetUnlimitedRx", {
        doctor_name: profile?.um_name,
        doctor_number: profile?.um_contact,
        doctor_unique_id: profile?.doctor_unique_id,
        doctor_specialty: profile?.dp_name,
        clinic_id: tokenData?.clinic_id,
        um_id: tokenData?.user_id,
        clinic_Name: clinic_name,
        former_page: service_name,
        ...deviceSdkData,
    });
  }

  const clickRequestCallback = async (service_name) => {
    dispatch(openModal(service_name))
    // let sendData = {
    //   mbl_no: profile?.um_contact,
    //   is_pm_renew_requested: true,
    //   service_name: service_name
    // }
    // const action = await dispatch(interest(sendData));
    // if (action.meta.requestStatus === "fulfilled") {
    //   errorMessage(action.payload.message)
    // }
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData(); 
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Monetization_RequestACallback", {
        doctor_name: profile?.um_name,
        doctor_number: profile?.um_contact,
        doctor_unique_id: profile?.doctor_unique_id,
        doctor_specialty: profile?.dp_name,
        clinic_id: tokenData?.clinic_id,
        um_id: tokenData?.user_id,
        clinic_Name: clinic_name,
        former_page: service_name,
        ...deviceSdkData,
    });
  }

  const accordionItems = [
    {
      key: "1",
      label: (
        <div
          style={{
            borderRadius: "20px 20px 0 0",
          }}
          className="d-flex flex-column justify-content-between p-14"
        >
          <>
            <div className="d-flex align-items-center">
              <img
                src={ddxImg}
                alt="ddx-img"
                width={48}
                height={48}
                className="me-3"
              />
              <div
                className="title-common d-flex flex-column"
                style={{ gap: 4 }}
              >
                {/* <img
                  src={ddxTag}
                  alt="ddx-img"
                  width={36}
                  height={16}
                  className="me-3"
                /> */}
                <span>Differential Diagnosis</span>
              </div>
            </div>
          </>
          {isCollapseActive && generatedDDx?.length === 0 ? (
            <div
              style={{
                paddingTop: 10,
              }}
              className={`${isDDxGenerated && generatedDDx?.length === 0
                ? "text-danger-custom"
                : ""
                }`}
            >
              {isDDxGenerated
                ? "No results found! We couldn't generate any diagnosis due to incomplete or inaccurate information provided. Please review and update the details, then try again."
                : "Enter key symptoms or examinations and patient history to generate a list of possible diagnoses and recommended tests for confirmation. Ensure accurate data for best results."}
            </div>
          ) : isCollapseActive ? (
            <div className="d-flex">
              <Button
                type="button"
                className="btn-41 btn ant-btn-text btn-input d-flex align-items-center justify-content-between"
                style={{
                  background: "white",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDDxDrawer("apexDDx");
                }}
              >
                <span>View Detailed Analysis</span>
              </Button>
            </div>
          ) : null}
        </div>
      ),
      children: (
        <div>
          {(DDX_planDetails?.plan_tier === FREE && DDX_planDetails?.credit_balance <= 0) ? (
            <div className="voicerx-modal ddx-side text-center m-2">
              <Card
                extra={
                  <>
                    <img className="expiredInfographic" src={expiredInfographic2} alt="Your trial plan has Expired" />
                    <img className="expiredInfographic" style={{ opacity: 0.5 }} src={expiredInfographic2} alt="Your trial plan has Expired" />
                  </>
                }>

                <div className="text-white">
                  Your<span className="text-white fw-semibold"> {DDX_planDetails?.service_display_name} trial plan  </span>  has expired. <br />
                  Upgrade now to continue a hassle free experience!
                </div>

                <div className="bg-white p-4 rounded-5 mt-4">
                  <div className="fs-4 fw-bold text-price">Upgrade Now 🚀</div>
                  <div className="mt-3 text-price">Unlock unlimited AI {DDX_planDetails?.service_display_name}, a trusted feature used by <span className="fw-bold text-price">5,000+ doctors</span> across clinics.</div>

                  {/* {DDX_planDetails?.discount && (
                    <CampaignDiscount flag={2} title={DDX_planDetails?.service_name}/>
                  )} */}

                  <div>
                    <Button type='button' className='mt-3 btn align-items-center mx-auto d-flex btn-41 btn-text btn-save' style={{ height: 52 }} onClick={() => clickRequestCallback(DDX_planDetails?.service_name)}>
                      <i className='icon-phone text-primary me-2'></i>
                      Request a call back
                    </Button>
                  </div>
                  {tp_monetization_enable && !(isMobile && !isTablet) &&
                    <div>
                      <Button className="mt-3 btn btn-proceed btn-primary3 w-100 align-items-center justify-content-center d-flex" onClick={() => clickBuyNow(DDX_planDetails?.service_name)}>
                        <img className="me-2" src={crown} alt="Crown" />
                        Get Unlimited Access
                      </Button>
                    </div>
                  }
                </div>
              </Card>
            </div>
          ): DDX_planDetails?.plan_tier === FAILED_VERIFICATION ? (
            <div className="voicerx-modal ddx-side text-center m-2">
              <Card
                extra={
                  <>
                    <img className="expiredInfographic" src={expiredInfographic2} alt="Your trial plan has Expired" />
                    <img className="expiredInfographic" style={{ opacity: 0.5 }} src={expiredInfographic2} alt="Your trial plan has Expired" />
                  </>
                }>

                <div className="text-white">
                  Your payment for the <span className="text-white fw-semibold">{DDX_planDetails?.service_display_name}</span> Add-on has failed. Please contact Support for further assistance.!
                </div>

                <div className="bg-white p-4 rounded-5 mt-4 text-start">
                  <div className="align-items-center my-3">
                    <i className="icon-phone fs-16 border p-1 rounded-2 me-1 text-secondary-custom"></i>
                    <a className="text-main fw-medium fs-16 text-welcome" href="tel:+91-9974042363"> +91 93444 14944</a>
                  </div>
                  <div className="align-items-center my-3">
                    <span className="me-2 border p-1 rounded-2" style={{ padding: '2px 4px' }}>
                      <img width={16} height={16} src={SMS2} />
                    </span>
                    <a className="text-main fw-medium fs-16 text-welcome" href="mailto:support@tatvacare.in" >
                      Support@tatvacare.in
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <>
              <div
                className="d-flex flex-column justify-content-center align-items-center"
                style={{ gap: 10, padding: "18px 14px 0" }}
              >
                {(isDDxReadyToGenerate || generatedDDx?.length === 0) && (
                  <Button
                    className="btn btn-primary3 btn-41 px-4 w-100 d-flex align-items-center justify-content-center"
                    style={{ gap: 10 }}
                    onClick={() => getGenerateDDx("apexDDx")}
                    disabled={!isDDxReadyToGenerate}
                  >
                    <img src={ddxIcon} alt="ddx-icon" />
                    <span>Generate DDx</span>
                    {isDDxReadyToGenerate && (
                      <div className="shimmer-overlay-cdss" />
                    )}
                  </Button>
                )}
                {isDDxReadyToGenerate && (
                  <span className="disclaimer-txt" style={{ fontSize: 12 }}>
                    {generatedDDx?.length === 0
                      ? "DDx ready to generate!"
                      : "Get updated diagnosis"}
                  </span>
                )}
              </div>
              <div
                className="d-flex flex-column p-14"
                style={{
                  padding: generatedDDx?.length === 0 ? "0px" : "14px",
                  paddingBottom: 0,
                  gap: 16,
                }}
              >
                {generatedDDx.map((item, index) => {
                  return (
                    <div
                      key={index}
                      className="d-flex flex-column"
                      style={{
                        padding: "11px 15px",
                        background: "#FAF8F6",
                        gap: 5,
                        borderRadius: 16,
                      }}
                    >
                      <div className="patientName">
                        {item?.differentialDiagnosisName}
                      </div>
                      <div className="d-flex" style={{ columnGap: 2 }}>
                        {Array.from({
                          length: WarningRank[item?.likelihood] || 0,
                        }).map((_, index) => (
                          <div
                            key={index}
                            style={{
                              width: 13,
                              height: 4,
                              border: `2px solid ${WarningColor[item?.likelihood]}`,
                              borderRadius: 2,
                            }}
                          />
                        ))}
                      </div>
                      <h6
                        style={{
                          color: WarningColor[item?.likelihood],
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {ImpressionText[item?.likelihood]}
                      </h6>
                      <div
                        className="d-flex align-items-center"
                        style={{ columnGap: 8, marginTop: 10 }}
                      >
                        {diagnosisData
                          ?.map((item) => item?.tds_name)
                          ?.includes(item?.differentialDiagnosisName) ? (
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={selectedTick}
                              alt="tick"
                              width={18}
                              height={18}
                            />
                            <div
                              className="document-date"
                              style={{ fontWeight: 600 }}
                            >
                              Added
                            </div>
                          </div>
                        ) : (
                          <div
                            className="d-flex"
                            style={{ cursor: "pointer", gap: 10 }}
                            onClick={() => {
                              diagnosisData.push({
                                tds_id: item?._id,
                                unique_id: item?._id,
                                tds_name: item?.differentialDiagnosisName,
                                pms_default: 1,
                                usage_count: 0,
                                isDDx: true,
                                since: "",
                                status: "",
                                note: "",
                              });
                              setDiagnosisData((prev) => [...prev]);
                              window.Moengage.track_event("TP_CDSS_Ddx_selected", {
                                clinic_name: getClinicName(profile?.hospital_data),
                                doctor_id: profile?.doctor_unique_id,
                                patient_number: patient_data?.pm_contact_no,
                                patient_id: patient_data?.patient_unique_id,
                                field: "apexDDx",
                              });
                            }}
                          >
                            <div
                              className="text-primary"
                              style={{ fontWeight: 600 }}
                            >
                              Add To Rx
                            </div>
                            <img src={arrow} alt="arrow" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Divider />
              <div className="p-14" style={{ paddingTop: 0 }}>
                <div
                  className="d-flex align-items-center"
                  style={{
                    paddingBottom: 10,
                    columnGap: 8,
                    cursor: "pointer",
                    width: "fit-content",
                  }}
                  onClick={handleDDxKnowMore}
                >
                  <div className="text-primary" style={{ fontWeight: 600 }}>
                    Know More About DDx
                  </div>
                  <img src={arrow} alt="arrow" />
                </div>
                <div
                  className="disclaimer-txt"
                  style={{
                    color: "#A2A2A8",
                    fontWeight: 500,
                    fontSize: 12,
                    paddingBottom: 20,
                  }}
                >
                  <b style={{ fontWeight: 700 }}>Disclaimer</b>: These results are
                  generated by AI and should be used as a guide, not the final
                  source for patient treatment decisions.
                </div>
              </div>
            </>
          )}

        </div>
      ),
    },
  ];

  return (
    <div>
      {isDDxLoading ? (
        <div
          className="d-flex flex-column align-items-center justify-content-center w-100 h-100"
          style={{
            background:
              "linear-gradient(rgba(119, 66, 254, 0.4) 0%, rgba(119, 66, 254, 0.2) 50%, rgba(119, 66, 254, 0.1) 100%)",
            borderRadius: 18,
            padding: "10px 0 20px",
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
        <div>
          <Collapse
            items={accordionItems}
            // defaultActiveKey={["1"]}
            onChange={handlePanelChange}
            className="tatvaAi-accordian cdss-collapse"
            expandIconPosition={"end"}
          />
        </div>
      )}
    </div>
  );
};

export default DDxList;

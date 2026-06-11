import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Container, Navbar, Row, Col } from "react-bootstrap";
import axios from "axios";
import {
  Button,
  Dropdown,
  Tooltip,
  Popover,
  Input,
  Spin,
  Tabs,
  Select,
  Drawer,
  message,
  Switch,
  Tour,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { isMobile } from "react-device-detect";
import { v4 as uuidv4 } from "uuid";

import CustomizeSetting from "./CustomizeSetting";

import CashManagerContext from "../context/CashManagerContext";
import ProfilePopover from "./ProfilePopover";
import CommonModal from "./CommonModal";

import api from "../api/services/axiosService";

import { errorMessage, removeBeforeWhiteSpace } from "../utils/utils";

import { useSelector, useDispatch } from "react-redux";

import { addCaseManager, editCaseManager } from "../redux/caseManagerSlice";
import VideoModal from "./VideoModal";
import { getDecodedToken } from "../utils/localStorage";
import { env } from "../EnvironmentConfig";
import {
  RX_DIGITIZATION,
  IS_RX_DIGI_API_CALL,
  WS_CONTROL_URL,
  MESSAGE_KEY,
  GB_PILLUP_MEDICINE,
  GB_CVT_EXT_HOS,
} from "../utils/constants";
import ReconnectingWebSocket from "reconnectingwebsocket";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_SMARTSYNC_CONNECT } from "../utils/constants";
import { upsertDoctorSettingFlag } from "../redux/doctorsSlice";
import { setDefaultCustomSyncPadTemplate } from "../pages/smartSync/services/uploadService";
import { assignCarePlan, updateCarePlanName } from "../pages/smartSync/services/carePlanService";
import VideoConsultButton from "../components/VideoConsultButton";
import { ASSETS } from "../assets";
const {
  alerticon: alertIcon,
  icReload: reload,
  tutorial,
  tubeIcon: playIcons,
  devicePad,
  smartSyncConnected,
  smartSyncDisconnected,
  tagNew,
  pillup: Pillup,
  eazydoseLogo: EazyDoseLogo,
  video: videoSvg,
} = ASSETS.images;

function HeaderPrescription({
  prescription,
  onClear,
  onSubmit,
  smartRxData,
  loader,
  isVaccinationEnabled,
  isGrowthChartEnabled,
  caseManagerData,
  isCustomSSRX,
  selectedTemplateId,
  prepareMetadataForSubmissionData,
  selectedCarePlan,
  hasExistingCarePlan = false,
  setBuildNumber,
  handleVideoConsult,
  isVideoConsultLoading,
  showTeleconsultIcon,
  onTeleconsultClick,
  isTeleconsultJoinLoading,
  isTeleconsultActive,
}) {
  const { templates, loading } = useSelector((state) => state.caseManager);
  const { profile, videoList } = useSelector((state) => state.doctors);
  const [videoLink, setVideoLink] = useState(null);

  const dispatch = useDispatch();

  const navigate = useNavigate();
  const {
    patient_data,
    tcmId,
    pamId,
    consultationDate,
    symptomsData,
    examinationData,
    surgeriesData,
    diagnosisData,
    adviceData,
    investigationData,
    medicationData,
    vitalsData,
    setVitalsData,
    medicalHistoryData,
    followUpDate,
    setFollowUpDate,
    additionalNote,
    pillupSwitch,
    setPillupSwitch,
    setMedicalHistoryData,
  } = useContext(CashManagerContext);

  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [popOverVideo, setPopOverVideo] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [isDisconnect, setIsDisconnect] = useState(null);
  const [showDiconnectPopup, setShowDiconnectPopup] = useState(false);
  const [status, setStatus] = useState(null);
  const [customizeDrawer, setCustomizeDrawer] = useState(false);
  const intervalRef = useRef(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [popOver3, setPopOver3] = useState(false);
  const [versionNumber, setVersionNumber] = useState("")

  const baseUrl = { customBaseUrl: env.rx_digitization };
  const isSmartSyncConnectAccessableFromGB =
    useFeatureIsOn(GB_SMARTSYNC_CONNECT);

  const isPillUpAccessableFromGB = useFeatureIsOn(GB_PILLUP_MEDICINE);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);

  const { isAutofillSelected, selectedSymptomsCollector } = useSelector(
    (state) => state.ddx
  );

  const items = [
    {
      label: <div onClick={onResetClick}>Clear</div>,
      key: "clear",
    },
  ];

  useEffect(() => {
    if (
      isAutofillSelected &&
      selectedSymptomsCollector?.medicalHistory &&
      selectedSymptomsCollector.medicalHistory.length > 0
    ) {
      // Create a new array to store the updated medical history
      let updatedMedicalHistory = [...medicalHistoryData];

      if (updatedMedicalHistory.length === 0) {
        updatedMedicalHistory = selectedSymptomsCollector.medicalHistory?.map(
          (e, i) => {
            return {
              title: e?.title,
              tmmhs_id: e?.tmmhs_id,
              no_know_history: false,
              tags: [],
            };
          }
        );
      }

      // Process each section from selectedSymptomsCollector
      selectedSymptomsCollector.medicalHistory.forEach((section) => {
        // Find the matching section in medicalHistoryData
        const sectionIndex = updatedMedicalHistory.findIndex(
          (item) => item.title.toLowerCase() === section.title.toLowerCase()
        );

        if (sectionIndex !== -1) {
          // Process each item in the section
          section.items.forEach((newItem) => {
            // Create tag based on section type
            const newTag = {
              tmmhst_id: Math.floor(Math.random() * 10000),
              title: newItem.name,
              pms_default: 0,
              enable: "Y",
              note: newItem.notes || "",
            };

            // Add specific fields based on section type
            switch (section.title) {
              case "Medical Condition":
                newTag.since = newItem.duration || "";
                newTag.status = "Active";
                newTag.medication = "Yes";
                newTag.MonthYear = "April 2025"; // Or use dynamic date
                newTag.oldSince = newItem.duration || "";
                break;

              case "Allergies":
                newTag.since = newItem.duration || "";
                newTag.status = "Active";
                newTag.MonthYear = "April 2025";
                newTag.oldSince = newItem.duration || "";
                break;

              case "Family History":
                newTag.relationship = newItem.relation || "";
                newTag.newSince = "";
                newTag.MonthYear = "";
                break;

              case "Lifestyle":
                newTag.since = newItem.duration || "";
                newTag.status = "Active";
                newTag.MonthYear = "April 2025";
                newTag.oldSince = newItem.duration || "";
                break;

              case "Additional History":
                // Handle additional history items if needed
                break;
            }

            // Add the new tag to the section
            updatedMedicalHistory[sectionIndex].tags.push(newTag);
          });
        }
      });

      // Update the medical history state
      setMedicalHistoryData(updatedMedicalHistory);
    }
  }, [isAutofillSelected, selectedSymptomsCollector]);

  async function onResetClick() {
    setVitalsData([]);
    setFollowUpDate(null);
  }

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);

  const showHideClearModal = useCallback(() => {
    setIsClearModalOpen(!isClearModalOpen);
  }, [isClearModalOpen]);

  const checkDataFillOrNot = () => {
    if (
      symptomsData.length > 0 ||
      examinationData.length > 0 ||
      surgeriesData.length > 0 ||
      diagnosisData.length > 0 ||
      medicationData.length > 0 ||
      adviceData.length > 0 ||
      investigationData.length > 0 ||
      vitalsData.length > 0 ||
      medicalHistoryData.length > 0
    ) {
      showHideBackModal();
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleClearClick = () => {
    setIsClearModalOpen(!isClearModalOpen);
    onClear(); // Call the parent's clear handler
  };

  const handleSubmitClick = async () => {
    if (!clicked) {
      onSubmit(versionNumber);
    }
  };

  //PopOverVideo function
  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  //Video Componet
  const VIDEO_CONTENT = useCallback(() => {
    return (
      <>
        <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
          <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
            <div className="title-common lh-base">Video Tutorial</div>
            <Button
              className="btn btn-videoClose p-0"
              onClick={showHideVideoListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          {videoList
            ?.filter((e) => e.category_id === 9)[0]
            ?.video?.map((item1, i1) => {
              return (
                <div
                  key={i1}
                  className={`d-flex ${
                    i1 !==
                      videoList?.filter((e) => e.category_id === 9)[0]?.video
                        ?.length -
                        1 && "pb-3 mb-15 border-bottom"
                  }`}
                >
                  <div className="tutorial-play me-14">
                    <button type="button" onClick={() => setVideoLink(item1)}>
                      <img src={playIcons} />
                    </button>
                    <span className="tutorial-thumb">
                      <img src={item1.thumbnail} />
                    </span>
                  </div>
                  <div>
                    <h3 className="title-common text-welcome">
                      {item1?.tmv_title}
                    </h3>
                    <div className="fs-12 fontroboto fw-normal text-main">
                      {item1?.tmv_description}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </>
    );
  }, [popOverVideo]);

  useEffect(() => {
    if (isSmartSyncConnectAccessableFromGB) {
      const ws = new ReconnectingWebSocket(WS_CONTROL_URL, null, {
        debug: true,
        reconnectInterval: 2000,
      });

      ws.onopen = () => {
        console.log("WebSocket connection opened");
        setSocket(ws);
        checkDeviceStatus(ws);
        checkAppVersion(ws);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setSocket(null);
      };

      ws.onmessage = (event) => {
        handleSocketMessage(event.data);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error", error);
        // this will be handle once all the user get migrated to new build(with 2 WS connection)
        setError("WebSocket connection error");
      };

      // Check device status every 5 seconds
      const intervalId = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          checkDeviceStatus(ws);
        }
      }, 5000);

      return () => {
        ws.close();
        clearInterval(intervalId); // Clear the interval on cleanup
      };
    }
  }, [isSmartSyncConnectAccessableFromGB]);

  const checkDeviceStatus = (ws) => {
    ws.send("DeviceStatus");
  };

  const checkAppVersion = (ws) => {
    ws.send("AppVersion");
  };

  const wsError = (error) => {
    message.open({
      key: MESSAGE_KEY,
      type: "error",
      className: "error-red",
      content: (
        <div className="d-flex align-items-center">
          <div>
            <div className="title-common text-start fontroboto">{error}</div>
          </div>
        </div>
      ),
      duration: 3,
    });
  };

  const handleSocketMessage = (message) => {
    if (message.startsWith("DeviceStatus:")) {
      const statusMessage = message.split(":")[1];

      if (statusMessage === "True") {
        setIsConnected(true);
        setConnectLoading(false);
      } else {
        // Handle the case where additional information is provided in the message
        if (isDisconnect === true || isDisconnect === null) {
          setShowDiconnectPopup(false);
        } else {
          setShowDiconnectPopup(true);
        }
        setIsConnected(false);
        setConnectLoading(false);
        // wsError(`${statusMessage}`);
      }
    } else if (message.startsWith("DeviceConnect:")) {
      const statusMessage = message.split(":")[1] === "True";
      setIsConnected(statusMessage);
      setConnectLoading(false);
      if (!statusMessage)
        setError("Failed to connect device. Please try again.");
    } else if (message.startsWith("DeviceDisconnect:")) {
      const statusMessage = message.split(":")[1] === "True";
      setIsConnected(!statusMessage);
      setConnectLoading(false);
      if (!statusMessage) setError("Failed to disconnect device");
    } else if (message.startsWith("AppVersion")) {
      const versionMessage = message.split(":")[1];
      setVersionNumber(versionMessage);
    }
  };

  const handleConnectButtonClick = () => {
    if (!socket) {
      // this will be handle once all the user get migrated to new build(with 2 WS connection)
      setError("WebSocket connection is not established");
      return;
    }

    if (isConnected) {
      setIsDisconnect(true);
      return;
    }

    setConnectLoading(true);
    setError(null);
    setShowDiconnectPopup(false);
    const action = "DeviceConnect";
    socket.send(action);
  };

  const handleDisconnectConfirm = () => {
    if (!socket) {
      setError("WebSocket connection is not established");
      return;
    }

    setConnectLoading(true);
    setShowDiconnectPopup(false);
    setError(null);
    const action = "DeviceDisconnect";
    socket.send(action);
    setIsDisconnect(null);
  };

  const handleDisconnectPopup = () => {
    setIsDisconnect(true);
  };

  //Disconnect Modal function
  const showHideDisconnectModal = () => {
    setIsDisconnect(null);
    setShowDiconnectPopup(false);
  };

  // Effect to handle updated data from parent
  useEffect(() => {
    if (smartRxData?.length || vitalsData.length > 0 || followUpDate) {
      onEndVisitClick();
      setClicked(true);
      
      // Call setDefaultCustomSyncPadTemplate if selectedTemplateId is available
      if (selectedTemplateId && selectedTemplateId !== "none") {
        setDefaultCustomSyncPadTemplate(selectedTemplateId);
      }
    }
  }, [smartRxData]);

  // Handle the data upate and end the visit
  async function onEndVisitClick() {
    const smartRxFiles = smartRxData?.map((file) => file.name);
    const files = smartRxData?.map((file) => file);
    const sendData = {
      action: tcmId == 0 ? "add" : "edit",
      tcm_id: tcmId,
      patient_unique_id:
        patient_data !== undefined ? patient_data.patient_unique_id : 0,
      pam_id:
        patient_data !== undefined
          ? patient_data.hasOwnProperty("pam_id")
            ? patient_data.pam_id
            : pamId
          : 0,
      consultation_date: consultationDate,
      symptoms: symptomsData,
      examination: examinationData,
      surgeries: surgeriesData,
      diagnosis: diagnosisData,
      medicine: medicationData.map(({ medicineUnit, ...rest }) => rest),
      advice: adviceData,
      investigation: investigationData,
      vitals: vitalsData,
      follow_up_date: followUpDate,
      visit_advice: additionalNote,
      medical_history: medicalHistoryData,
      smart_prescription_filename: smartRxFiles || [],
      pillup_fulfilment: isPillUpAccessableFromGB && pillupSwitch ? 1 : 0,
      isCustomSSRX: isCustomSSRX ? "1" : "0",
      custom_ss_data: prepareMetadataForSubmissionData?.custom_ss_data || null,
    };

    const action =
      tcmId == 0
        ? await dispatch(addCaseManager(sendData))
        : await dispatch(editCaseManager(sendData));

    if (action.meta.requestStatus === "fulfilled") {
      // After we have a confirmed consultation, ensure care plan is synced with the generated tcm_id
      try {
        const decodedToken = getDecodedToken();
        const tokenData = decodedToken?.result;
        const generatedTcmId = action?.payload?.tcm_id ?? tcmId;

        if (generatedTcmId > 0 && selectedCarePlan) {
          if (hasExistingCarePlan && selectedCarePlan?.plan_name) {
            await updateCarePlanName(parseInt(generatedTcmId), selectedCarePlan.plan_name);
          } else if (
            !hasExistingCarePlan &&
            selectedCarePlan?.plan_id &&
            patient_data?.patient_unique_id &&
            tokenData?.user_id &&
            tokenData?.clinic_id
          ) {
            await assignCarePlan({
              plan_id: selectedCarePlan.plan_id,
              um_id: tokenData.user_id,
              patient_unique_id: patient_data.patient_unique_id,
              hm_id: tokenData.clinic_id,
              tcm_id: parseInt(generatedTcmId),
            });
          }
        }
      } catch (cpErr) {
        console.error('Care plan sync (assign/update) after SmartRx submit failed:', cpErr);
      }

      navigate("/print-smart-rx", {
        replace: true,
        state: {
          ...action.payload,
          patient_data: patient_data,
          smartRxFile: (files && files.length > 0) ? files : smartRxFiles,
          page: "prescription",
        },
      });
    } else {
      errorMessage(action.error);
    }
  }

  // Handle Customize Drawer
  const handleDrawerCustomize = useCallback(() => {
    setCustomizeDrawer(!customizeDrawer);
  }, [customizeDrawer]);

  const CUSTOMIZE_CONTENT_TAB = useMemo(() => {
    return (
      <CustomizeSetting
        handleDrawerCustomize={handleDrawerCustomize}
        isVaccinationEnabled={isVaccinationEnabled}
        isGrowthChartEnabled={isGrowthChartEnabled}
        page="smart-rx-page"
      />
    );
  }, [customizeDrawer]);

    // Tour Pillup
    const tourRef = useRef(null);
  
    useEffect(() => {
      if(isPillUpAccessableFromGB && profile?.userSettingFlag?.find(e => e?.type === 'pillup')?.status !== 1){
        tourRef?.current?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          setTourOpen(true)
        }, 1000);
      }
    }, [isPillUpAccessableFromGB]);

    
  const PILLUP_CONTENT = useCallback(() => {
    const decodedToken = getDecodedToken();
    const tokenData = decodedToken?.result;
    const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
    
    const serviceName = isZydusUser ? "eaZY Dose" : "PillUp";
    const serviceNameTitle = isZydusUser ? "eaZY Dose Fulfilment" : "Pillup Fulfilment";
    
    return (
      <div className="p-2">
        <div className="fs-18 fw-semibold text-black">{serviceNameTitle} <img className="img-fluid ms-2" src={tagNew} /></div>
        <div className="pt-1">You can now activate <b>{serviceName}</b> medicine <br /> fulfilment for the patient by enabling <br /> the toggle</div>
      </div>
    );
  }, [popOver3]);

  //PopOver3 function
  const showHidePillUpPopover = useCallback(() => {
    setPopOver3(!popOver3);
  }, [popOver3]);

  const onTourHandle = () => {
    dispatch(upsertDoctorSettingFlag({ type: 'pillup', status: 1 }))
    setTourOpen(!tourOpen)
  }
  
    const steps = [
      {
        description:
          <>
            <div className="fs-18 fw-semibold pt-3 text-black">
              {(() => {
                const decodedToken = getDecodedToken();
                const tokenData = decodedToken?.result;
                const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
                return isZydusUser ? "eaZY Dose Fulfilment" : "Pillup Fulfilment";
              })()} <img className="img-fluid ms-2" src={tagNew} />
            </div>
            <div className="pt-1">You can now activate <b>
              {(() => {
                const decodedToken = getDecodedToken();
                const tokenData = decodedToken?.result;
                const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
                return isZydusUser ? "eaZY Dose" : "PillUp";
              })()}</b> medicine <br /> fulfilment for the patient by enabling <br /> the toggle</div>
          </>,
        target: () => tourRef.current,
        nextButtonProps: {
          children: 'Okay',
          onClick: onTourHandle
        }
      }
    ];
  
    const pillUpChange = (checked) => {
      setPillupSwitch(checked)
    };

    useEffect(() => {
      if (caseManagerData !== undefined) {
        setPillupSwitch(caseManagerData?.pillup_fulfilment)
      }
    }, []);

  return (
    <Navbar className="justify-content-between headerprescription p-0">
      <Container fluid className="h-100 gx-0 w-100">
        <Row className="h-100 align-items-center w-100 justify-content-between">
          <Col lg="auto" className="h-100">
            <div className="align-items-center d-flex h-100">
              <div className="border-end h-100 text-center">
                <div
                  onClick={checkDataFillOrNot}
                  className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
                >
                  <i className="icon-right"></i>
                </div>
                <CommonModal
                  isModalOpen={isBackModalOpen}
                  onCancel={showHideBackModal}
                  modalWidth={500}
                  title={"You may lose your data"}
                  modalBody={
                    <>
                      <div className="alert-warning rounded-10px p-2 patient-details">
                        <div className="d-flex align-items-center">
                          <img className="me-3" src={alertIcon} alt="Warning" />
                          <span>
                            Are you sure you want to leave? <br />
                            You will permanently lose your data.
                          </span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="d-flex align-items-center mt-2 justify-content-end">
                          <div
                            onClick={() => navigate("/", { replace: true })}
                            className="me-4 text-decoration-underline btn p-0 text-main"
                          >
                            Yes Leave
                          </div>
                          <Button
                            onClick={showHideBackModal}
                            className="lh-lg btn btn-primary3 btn-41 px-4"
                          >
                            <span>No, Stay</span>
                          </Button>
                        </div>
                      </div>
                    </>
                  }
                />
                <CommonModal
                  isModalOpen={showDiconnectPopup}
                  // onCancel={showHideBackModal}
                  modalWidth={500}
                  title={"Please click on connect button"}
                  modalBody={
                    <>
                      <div className="alert-warning rounded-10px p-2 patient-details">
                        <div className="d-flex align-items-center">
                          <img className="me-3" src={alertIcon} alt="Warning" />
                          <span>
                            Device is not connected. This can be due to: <br />
                            1. Cable not connected <br />
                            2. Cable damaged / loose connection
                          </span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="d-flex align-items-center mt-2 justify-content-end">
                          <Button
                            onClick={handleConnectButtonClick}
                            className="lh-lg btn btn-primary3 btn-41 px-4"
                          >
                            <span>Connect</span>
                          </Button>
                        </div>
                      </div>
                    </>
                  }
                />
              </div>
              <ProfilePopover patient_data={patient_data} />
            </div>
          </Col>
          <Col lg="auto">
            <div className="align-items-center d-flex h-100">
              {/*Will be utilising this code in future, once the video is available */}
              {isSmartSyncConnectAccessableFromGB && (
                <Button
                  type="button"
                  className="btn align-items-center d-flex btn-device-connect rounded-5 pe-3 bg-white shadow2 me-2"
                  onClick={
                    isConnected
                      ? handleDisconnectPopup
                      : handleConnectButtonClick
                  }
                  disabled={connectLoading}
                >
                  <span>
                    {connectLoading
                      ? "SmartSync Connecting..."
                      : isConnected
                      ? "SmartSync Connected"
                      : "SmartSync Disconnected"}
                  </span>

                  <div
                    style={{
                      width: "48px",
                      height: "26px",
                      borderRadius: "32px",
                      backgroundColor: isConnected
                        ? "rgb(109 225 178)"
                        : "white",
                      boxShadow: "rgba(0, 0, 0, 0.3) 0px 0px 3px inset",
                      display: "flex",
                      alignItems: "center",
                      padding: "4px",
                      transition: "background-color 0.3s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        backgroundColor: connectLoading
                          ? "#4B4AD5"
                          : isConnected
                          ? "#fff"
                          : "rgb(255 181 181)",
                        transform: isConnected
                          ? "translateX(21px)"
                          : "translateX(0)",
                        transition:
                          "transform 0.3s ease, background-color 0.3s ease",
                      }}
                    >
                      <img
                        src={
                          connectLoading
                            ? devicePad
                            : isConnected
                            ? smartSyncConnected
                            : smartSyncDisconnected
                        }
                        alt="devicePad"
                        style={{
                          transition: "opacity 0.3s ease",
                          opacity: connectLoading ? 0.5 : 1,
                          width: "16px",
                          height: "16px",
                        }}
                      />
                    </div>
                  </div>
                </Button>
              )}
              {isPillUpAccessableFromGB && !isCvtExtHosAccessableFromGB && (
                <div
                  ref={tourRef}
                  className="ms-2 border rounded-20px px-2 py-1 d-flex align-items-center"
                  style={{ backgroundColor: "rgb(226, 226, 234, 0.2)" }}
                >
                  {(() => {
                    const decodedToken = getDecodedToken();
                    const tokenData = decodedToken?.result;
                    const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
                    return isZydusUser ? <img src={EazyDoseLogo} alt="eaZY Dose" style={{ height: '20px' }} /> : <img src={Pillup} />;
                  })()}
                  <Popover
                    open={popOver3}
                    onOpenChange={showHidePillUpPopover}
                    content={profile?.userSettingFlag?.find(e => e?.type === 'pillup')?.status === 1 ? PILLUP_CONTENT() : null}
                    trigger="hover"
                    placement="bottom"
                  >
                    <i className="icon-info opacity-50 fs-18 mx-1"></i>
                  </Popover>
                  <Switch
                    className="switch-custom"
                    value={pillupSwitch}
                    onChange={pillUpChange}
                  />
                  <Tour
                    placement="bottom"
                    closeIcon={false}
                    open={tourOpen}
                    steps={steps}
                    onClose={onTourHandle}
                  />
                </div>
              )}
              <CommonModal
                isModalOpen={isDisconnect}
                onCancel={showHideDisconnectModal}
                modalWidth={500}
                title={"Disconnect Device"}
                modalBody={
                  <>
                    <div className="alert-warning rounded-10px p-2 patient-details">
                      <div className="d-flex align-items-center">
                        <img className="me-3" src={alertIcon} alt="Warning" />
                        <span>
                          Are you sure you want to Disconnect <br />
                          SmartSync device.
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="d-flex align-items-center mt-2 justify-content-end">
                        <div
                          onClick={handleDisconnectConfirm}
                          className="me-4 text-decoration-underline btn p-0 text-main"
                        >
                          Disconnect
                        </div>
                        <Button
                          onClick={showHideDisconnectModal}
                          className="lh-lg btn btn-primary3 btn-41 px-4"
                        >
                          <span>No, Stay Connected</span>
                        </Button>
                      </div>
                    </div>
                  </>
                }
              />
              { !isCvtExtHosAccessableFromGB &&
                <button
                  className="btn d-flex align-items-center btn-text"
                  onClick={handleDrawerCustomize}
                >
                  <i className="icon-setting me-2"></i> <span>Customize</span>
                </button>
              }

              <Drawer
                placement="right"
                closeIcon={false}
                onClose={handleDrawerCustomize}
                open={customizeDrawer}
                className="modalWidth-900"
                width="auto"
              >
                {CUSTOMIZE_CONTENT_TAB}
              </Drawer>
              { !isCvtExtHosAccessableFromGB &&
                <Popover
                  open={popOverVideo}
                  onOpenChange={showHideVideoListPopover}
                  content={VIDEO_CONTENT}
                  trigger="click"
                  overlayClassName="pop-430 pp-0 videoTutorial"
                  placement="bottom"
                >
                  {/* <button className='btn d-flex align-items-center btn-text mx-3 tutorial p-0'> */}
                  <span
                    className="text-decoration-none rounded-5 mx-3"
                    style={{ cursor: "pointer" }}
                  >
                    <img height={42} src={tutorial} />
                  </span>
                  {/* </button> */}
                </Popover>
              }

              {videoLink && !isCvtExtHosAccessableFromGB && (
                <VideoModal
                  videoLink={videoLink}
                  onCancel={() => setVideoLink(null)}
                />
              )}


              { !isCvtExtHosAccessableFromGB && 
                (<Button
                    type="button"
                    className="btn align-items-center d-flex btn-41 btn-clear me-20"
                    onClick={() => setIsClearModalOpen(!isClearModalOpen)}
                    loading={loading}
                    disabled={!prescription}
                  >
                    <img
                      className="align-items-center d-flex"
                      src={reload}
                      alt="clear"
                    />
                    <span>Clear All</span>
                  </Button>
                )
              }

              <CommonModal
                isModalOpen={isClearModalOpen}
                onCancel={showHideClearModal}
                modalWidth={500}
                title={"You may lose your data"}
                modalBody={
                  <>
                    <div className="alert-warning rounded-10px p-2 patient-details">
                      <div className="d-flex align-items-center">
                        <img className="me-3" src={alertIcon} alt="Warning" />
                        <span>
                          Are you sure you want to clear all the <br />
                          prescription pages data?
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="d-flex align-items-center mt-2 justify-content-end">
                        <div
                          onClick={() => handleClearClick()}
                          className="me-4 text-decoration-underline btn p-0 text-main"
                        >
                          Clear
                        </div>
                        <Button
                          onClick={showHideClearModal}
                          className="lh-lg btn btn-primary3 btn-41 px-4"
                        >
                          <span>No</span>
                        </Button>
                      </div>
                    </div>
                  </>
                }
              />
              {handleVideoConsult && (
                <VideoConsultButton 
                  onClick={handleVideoConsult} 
                  loading={isVideoConsultLoading}
                />
              )}
              {showTeleconsultIcon && (
                <Tooltip
                  placement="bottom"
                  title={isTeleconsultActive ? "Meeting in progress" : "Tele-Consultation"}
                  destroyTooltipOnHide
                >
                  <span className={isTeleconsultActive ? "d-inline-block" : ""}>
                    <button
                      type="button"
                      className="btn align-items-center justify-content-center d-flex btn-41 teleconsult-video-btn me-20"
                      onClick={onTeleconsultClick}
                      disabled={isTeleconsultJoinLoading || isTeleconsultActive}
                    >
                      {isTeleconsultJoinLoading ? (
                        <LoadingOutlined style={{ fontSize: 24 }} />
                      ) : (
                        <img src={videoSvg} alt="Tele-Consultation" width={26} height={26} />
                      )}
                    </button>
                  </span>
                </Tooltip>
              )}
              <Button
                type="button"
                className="btn align-items-center d-flex btn-41 btn-primary3 me-20"
                onClick={handleSubmitClick}
                loading={loading || loader}
                disabled={(!prescription && clicked) || loader}
              >
                Submit
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </Navbar>
  );
}

export default React.memo(HeaderPrescription);

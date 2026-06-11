import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "../pages/smartSync/smartSync.css";
import { Button, Drawer, message, Tooltip } from "antd";
import { useLocation } from "react-router-dom";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import {
  getClinic,
  getTokenData,
  trackEvent,
} from "../utils/utils";

import {
  ADD,
  EDIT,
  GB_SMARTSYNC_CVT,
  SMART_RX_UPLOAD,
  WEBSOCKET_ERROR_MESSAGE,
  PAEDIATRICS,
  GB_ZYDUS_USER,
  NEO_NATOLOGISTS_DP_ID,
  GB_CARE_PLAN,
  GB_TELE_CONSULT,
  GB_CVT_EXT_HOS,
} from "../utils/constants";

import ReconnectingWebSocket from "reconnectingwebsocket";
import CashManagerContext from "../context/CashManagerContext";
import HeaderSmartPrescription from "../common/HeaderSmartPrescription";

import VitalsBox from "../components/VitalsBox";
import VitalsList from "../components/VitalsList";

import MedicalHistoryBox from "../components/MedicalHistoryBox";
import MedicalHistoryList from "../components/MedicalHistoryList";

import PrivateNotesBox from "../components/PrivateNotesBox";
import PrivateNotesList from "../components/PrivateNotesList";

import SmartRxFollowUpBox from "../components/SmartRxFollowUpBox";
import CarePlanDropdown from "../components/CarePlanDropdown";
import CarePlanList from "../components/CarePlanList";
import { getCarePlanAssignments } from "./smartSync/services/carePlanService";
import { assignCarePlan } from "./smartSync/services/carePlanService";

import {
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  WEBSOCKET_ADDRESS,
} from "../utils/constants";

import { getPatientBirthWeight, getVitals } from "../redux/vitalsSlice";
import {
  getPatientLastHistory,
  listPrivateNotes,
} from "../redux/medicalhistorySlice";

import api from "../api/services/axiosService";
import { env } from "../EnvironmentConfig";
import { errorMessage } from "../utils/utils";
import { MESSAGE_KEY } from "../utils/constants";
import CommonModal from "../common/CommonModal";

import LoopingVideo from "../components/common/LoopingVideo";
import FullPageLoader from "./vaccination/components/Loader";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import CvtKnowMore from "./smartSync/components/CvtKnowMore";
import RxTemplateUploadDrawer from "./smartSync/components/RxTemplateUploadDrawer";
import RxTemplateManager from "./smartSync/components/RxTemplateManager";
import CustomCanvasSelector from "./smartSync/components/CustomCanvasSelector";
import EditTemplateModal from "./smartSync/components/EditTemplateModal";
import { getCustomSyncPadTemplates } from "./smartSync/services/uploadService";
import { Content } from "antd/es/layout/layout";

import Vaccination from "./vaccination/Vaccination";
import GrowthChart from "./growthChart/GrowthChart";
import { viewPatient } from "../redux/appointmentsSlice";
import { useAccess } from "./vaccination/useAccess";
import { getGynecDetails } from "../api/services/ApiGynec";
import Obstetric from "./obstetric/Obstetric";
import ObstetricList from "./obstetric/components/obstetricList/ObstetricList";
import { fetchObstetricDetails } from "./obstetric/service";
import {
  addObstetricDetails,
  navigateToObstetric,
} from "../redux/obstetricSlice";
import { getClinicName } from "../utils/utils";
import UploadDocument from "./medicalRecords/UploadDocument";
import MedicalRecords from "./medicalRecords/MedicalRecords";
import {
  fetchAllDocumentCategories,
  fetchAllPatientDocs,
  fetchDocsUploadedByPatient,
} from "./medicalRecords/service";
import {
  setAllUploadedDocs,
  setPatientUploadedDocs,
  setUploadDocCategories,
} from "../redux/uploadDocSlice";
import UploadDocumentList from "./medicalRecords/components/uploadDocumentList/UploadDocumentList";
import {
  generateUniqueFileName,
  getCorrectedFileName,
  mergeDocuments,
} from "./medicalRecords/utils/helper";
import LabParametersList from "../components/LabParametersList";
import LabParams from "../components/LabParams";
import ViewLabParam from "../components/ViewLabParams";
import { setSelectAutofill, setShowSCPopup, setSymptomCollector } from "../redux/ddxSlice";
import { fetchSymptomsCollectorData, setAddToRx } from "../api/services/ApiGenRx";
import SCBanner from "../components/SCBanner";
import SCPopup from "../components/SCPopup";
import { getDecodedToken } from "../utils/localStorage";
import CustomSSknowMore from "./smartSync/components/CustomSSknowMore";

import VideoConsultButton from "../components/VideoConsultButton";
import VideoConsultModal from "../components/VideoConsultModal";
import { GB_VIDEO_CONSULT } from "../utils/constants";
import ApiVideoConsult from "../api/services/ApiVideoConsult";
import ApiTeleconsult from "../api/services/ApiTeleconsult";
import { generateMissionHosTemplateBackground } from "./smartSync/services/missionHosTemplateHelper";
import {
  configureCanvasContext,
  hardwarePointToCanvas,
} from "./smartSync/services/canvasUtils";
import {
  resolveSelectedTemplateById,
  resolveTemplatePageSources,
  isStandardTemplate,
} from "./smartSync/services/templateUtils";
import {
  setAppointmentTeleconsultStatus,
  setActiveTeleconsultAppointmentId,
  setActiveTeleconsultConsultationId,
  setJoinToken,
} from "../redux/teleconsultNotificationSlice";
import { ASSETS } from "../assets";
import {
  hasVitalsAndBodyCompositionData,
  mapVitalsAndBodyCompositionToRowPatch,
  mergeVitalsRowsWithSymptomCollectorPatch,
  VITALS_ROW_DATE_FORMAT,
} from "../utils/symptomCollectorVitalsMerge";
import { computeRxPadVitalsDerivedMetrics } from "../utils/vitalsCalculations";
const {
  vitals,
  medicalHistory: MedicalHistory,
  privateNotes,
  carePlanActive: carePlanIcon,
  alerticon: alertIcon,
  textLogo,
  aisparkleloader_2: sparkleWebm,
  aisparkleloader: sparkleMp4,
  vaccination: vaccinationImg,
  growthChartDark: growthChartImg,
  obstetricDark: obstetricImg,
  uploadDocDark: uploadDocImg,
  symptoms: symptomsImg,
  lab: labResultImg,
  customModule: others,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

function SmartPrescription() {
  const {
    userId,
    profile,
    customizedPadLeftList,
    customizedPadRightList,
    frequencyList,
    timingList,
  } = useSelector((state) => state.doctors);
  const { selectedVitalsList, vitalsPastList, patientBirthWeight } =
    useSelector((state) => state.vitals);
  const { privateNotesList } = useSelector((state) => state.medicalhistory);
  const { obstetricDetails: allObstetricDetails, isObstetricDetailsFetched, isNavigateToObstetric } =
    useSelector((state) => state.obstetric);
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const examinationHistory = obstetricDetails?.examinationHistory || [];
  const { allUploadedDocs, uploadDocCategories } = useSelector(
    (state) => state.uploadDoc
  );
  const shouldShowAncHistory = obstetricDetails?.ancHistory?.find(
  (item) =>
    !item?.deleted &&
    (item?.dueDate ||
      item?.status === "Completed" ||
      item?.notes ||
      item?.enablePrint)
  );
  const shouldShowImmunisation = obstetricDetails?.immunisationHistory?.find(
  (item) =>
    !item?.deleted &&
    (item?.givenDate ||
      item?.status === "Given" ||
      item?.notes ||
      item?.enablePrint)
  );
  const dispatch = useDispatch();
  const joinToken = useSelector((state) => state.teleconsultNotification?.joinToken);
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const isCarePlanEnabled = useFeatureIsOn(GB_CARE_PLAN);

  const { state } = useLocation();
  const { patient_data, send_path, caseManagerData, smartRxFilesData, pam_id, videoConsultData, fromRepeatRx } = state;
  const chartType = state?.chartType;

  // If fromRepeatRx is true, force tcmId to 0 to treat it as new consultation
  const tcmId = (fromRepeatRx || caseManagerData === undefined) ? 0 : (caseManagerData.tcm_id || 0);
  const pamId = fromRepeatRx ? 0 : pam_id ? pam_id : caseManagerData !== undefined ? caseManagerData.pam_id : 0;
  const consultationDate =
    caseManagerData !== undefined
      ? caseManagerData.consultation_date
      : moment().format("YYYY-MM-DD HH:mm:ss");
  const decodedToken = getDecodedToken();
  const [symptomsData, setSymptomsData] = useState([]);
  const [examinationData, setExaminationData] = useState([]);
  const [surgeriesData, setSurgeriesData] = useState([]);
  const [diagnosisData, setDiagnosisData] = useState([]);
  const [adviceData, setAdviceData] = useState([]);
  const [investigationData, setInvestigationData] = useState([]);
  const [medicationData, setMedicationData] = useState([]);
  const [followUpDate, setFollowUpDate] = useState(null);
  const [selectedCarePlan, setSelectedCarePlan] = useState(null);
  const [carePlanPlaceholder, setCarePlanPlaceholder] = useState(undefined);
  const [hasExistingCarePlan, setHasExistingCarePlan] = useState(false);
  const [vitalsData, setVitalsData] = useState([]);
  const [medicalHistoryData, setMedicalHistoryData] = useState([]);
  const [addlabparamsDrawer, setAddlabparamsDrawer] = useState(false);
  const [viewlabparamsDrawer, setViewlabparamsDrawer] = useState(false);
  const [privateNotesData, setPrivateNotesData] = useState(null);
  const [additionalNote, setAdditionalNote] = useState("");
  const [isGrowthChart, setIsGrowthChart] = useState(false);
  const [labParamsData, setLabParamsData] = useState([]);
  // const [token, setToken] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [prescription, setPrescription] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalColor, setModalColor] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [connected, setConnected] = useState(false);
  const [smartRxDetails, setSmartRxDetails] = useState(null);
  const [hasError, setHasError] = useState(false);
  const socketRef = useRef(null);
  const ctxGlobalRefs = useRef([]);
  const newPageRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const selectedPageRef = useRef(null); // Add a ref for selectedPage
  const canvasRefs = useRef([]);
  const blankCanvasPreparedRef = useRef({});
  const [newPageText, setNewPageText] = useState("");
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [deletePopupMsg, setDeletePopupMsg] = useState("");
  const [isClearPopup, setIsClearPopup] = useState(false);
  const [updatedIndex, setUpdatedIndex] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(null);
  const [imageLoaded, setImageLoaded] = useState({});
  const [drawFunction, setDrawFunction] = useState(null);
  const [smartRxFiles, setSmartRxFiles] = useState([]);
  const [imageRefs, setImageRefs] = useState({});
  const [loading, setLoading] = useState(false); // State to track loading
  const drawRef = useRef(null);
  const [dataPresentInCanvas, setDataPresentInCanvas] = useState([]);
  const [loader, setLoader] = useState(false);
  const [customModuleContents, setCustomModuleContents] = useState([]);
  const startTime = moment().format("YYYY-MM-DD HH:mm:ss");
  const [pillupSwitch, setPillupSwitch] = useState(true);
  // Add state for custom RX management (unified with templates)
  const [isCustomSSRX, setIsCustomSSRX] = useState(false);
  const [customRxImages, setCustomRxImages] = useState([]);
  // Add state for page addition dropdown
  const [showPageDropdown, setShowPageDropdown] = useState({});
  const [pageDropdownPosition, setPageDropdownPosition] = useState({});
  const [buildNumber, setBuildNumber] = useState(null); //state for iscribe build version number
  
  // Add state for disclaimer visibility
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [knowMoreDrawer, setKnowMoreDrawer] = useState(false);

  const isVideoConsultAccessible = useFeatureIsOn(GB_VIDEO_CONSULT);
  const isTeleConsultEnabled = useFeatureIsOn(GB_TELE_CONSULT);
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
  const [videoConsultUrl, setVideoConsultUrl] = useState(null);
  const [videoConsultAction, setVideoConsultAction] = useState(null);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [isTeleconsultJoinLoading, setIsTeleconsultJoinLoading] = useState(false);

  const isVideoConsultAvailable = isVideoConsultAccessible && videoConsultData?.pam_status_type_appointment === 1;
  const isTeleConsultAvailableType2 =
    isTeleConsultEnabled && videoConsultData?.pam_status_type_appointment === 2;

  const handleKnowMoreDrawer = useCallback(() => {
    setKnowMoreDrawer((prev) => !prev);
  }, []);

  // Resolve care plan placeholder from tcm_id for Smart Rx edit
  useEffect(() => {
    const resolvePlaceholder = async () => {
      try {
        if (!isCarePlanEnabled) return;
        if (!patient_data?.patient_unique_id) return;
        if (!tcmId || Number(tcmId) === 0) return;

        const resp = await getCarePlanAssignments(patient_data?.patient_unique_id);
        const list = Array.isArray(resp) ? resp : [];

        const match = list.find(x => Number(x?.tcm_id) === Number(tcmId));
        setHasExistingCarePlan(Boolean(match));
        setCarePlanPlaceholder(match?.plan_name || undefined);
      } catch (e) {
        setCarePlanPlaceholder(undefined);
      }
    };

    resolvePlaceholder();
  }, [isCarePlanEnabled, patient_data?.patient_unique_id, tcmId]);

  // Helper function for unified template/RX selection
  const isTemplateSelected = (templateId) => {
    return templateId && templateId !== 'none';
  };

  const contextApi = {
    patient_data,
    send_path,
    tcmId,
    pamId,
    consultationDate,
    symptomsData,
    setSymptomsData,
    examinationData,
    setExaminationData,
    surgeriesData,
    setSurgeriesData,
    diagnosisData,
    setDiagnosisData,
    adviceData,
    setAdviceData,
    investigationData,
    setInvestigationData,
    medicationData,
    setMedicationData,
    vitalsData,
    setVitalsData,
    medicalHistoryData,
    setMedicalHistoryData,
    privateNotesData,
    setPrivateNotesData,
    followUpDate,
    setFollowUpDate,
    additionalNote,
    setAdditionalNote,
    customModuleContents,
    setCustomModuleContents,
    startTime,
    pillupSwitch, 
    setPillupSwitch,
    isCustomSSRX,
    setIsCustomSSRX,
    selectedCarePlan,
    setSelectedCarePlan
  };

  const baseUrl = { customBaseUrl: env.casemanager_api_url };

  const isSmartSyncCVTAccessableFromGB = useFeatureIsOn(GB_SMARTSYNC_CVT);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);

  const [vitalDrawer, setVitalDrawer] = useState(false);
  const [medicalHistoryDrawer, setMedicalHistoryDrawer] = useState(false);
  const [privateNotesDrawer, setPrivateNotesDrawer] = useState(false);
  const [selectPrivateNotes, setSelectPrivateNotes] = useState(null);
  const [vaccinationDrawer, setVaccinationDrawer] = useState(false);
  const [growthDrawer, setGrowthDrawer] = useState(false);
  const [updatedGynecHistory, setUpdatedGynecHistory] = useState(null);
  const [obstetricDrawer, setObstetricDrawer] = useState(false);
  const [uploadDocDrawer, setUploadDocDrawer] = useState(false);
  const [medicalReportDrawer, setMedicalReportDrawer] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [filesData, setFilesData] = useState([]);
  const [isEditDocument, setIsEditDocument] = useState(false);
  const fileInputRef = useRef(null);
  const [cvtDrawer, setCvtDrawer] = useState(false);
  const [uploadCanvasDrawer, setUploadCanvasDrawer] = useState(false);
  const [showSCBanner, setShowSCBanner] = useState(false);
  
  // Template management state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [refreshTemplatesTrigger, setRefreshTemplatesTrigger] = useState(0);
  const [templateManagerDrawer, setTemplateManagerDrawer] = useState(false);
  const [editTemplateModal, setEditTemplateModal] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState(null);
  const getSelectedTemplateById = useCallback((templateId) => {
    return resolveSelectedTemplateById(templateId, templates);
  }, [templates]);

  const getTemplatePageSources = useCallback(async (template) => {
    return resolveTemplatePageSources({
      template,
      profile,
      patientData: patient_data,
      generateMissionHosTemplateBackground,
      forceBlankAddress: true,
      outputWidth: 720,
      outputHeight: 980,
    });
  }, [profile, patient_data]);

  // When Mission / standard-style templates are active, regenerate pages if patient fields load or change.
  const missionTemplatePatientKey = useMemo(() => {
    const template = getSelectedTemplateById(selectedTemplateId);
    if (!template || !isStandardTemplate(template)) {
      return null;
    }
    return [
      patient_data?.patient_unique_id,
      patient_data?.pam_id,
      patient_data?.pm_pid,
      patient_data?.pm_fullname,
      patient_data?.pm_contact_no,
      patient_data?.pm_gender,
      patient_data?.appointment_time,
      patient_data?.patient_age,
      patient_data?.ageYears,
    ]
      .map((v) => (v !== undefined && v !== null ? String(v) : ""))
      .join("|");
  }, [
    selectedTemplateId,
    templates,
    getSelectedTemplateById,
    patient_data?.patient_unique_id,
    patient_data?.pam_id,
    patient_data?.pm_pid,
    patient_data?.pm_fullname,
    patient_data?.pm_contact_no,
    patient_data?.pm_gender,
    patient_data?.appointment_time,
    patient_data?.patient_age,
    patient_data?.ageYears,
  ]);
  
  // Track page metadata including template pages and blank pages
  // page_type can only be: "template" or "blank"
  const [pagesMetaData, setPagesMetaData] = useState([]);
  const [isEditingBackendData, setIsEditingBackendData] = useState(false);
  
  // Add state to store canvas image data for preserving drawings
  const [canvasImageData, setCanvasImageData] = useState({});
  
  // Track the number of pages from original Rx when fromRepeatRx is true
  const originalRxPagesCount = fromRepeatRx && smartRxFilesData?.length ? smartRxFilesData.length : 0;

  const { showSCPopup, isAutofillSelected, selectedSymptomsCollector, symptomCollector } =
    useSelector((state) => state.ddx);

  const {
    isVaccinationAccessable,
    isGrowthChartAccessable,
    isGynaecHistoryAccessable,
  } = useAccess(patient_data?.ageYears);

  const vitalsCalculate = useCallback(
    (H, W) => computeRxPadVitalsDerivedMetrics(H, W, patient_data),
    [patient_data]
  );

  const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const baseUrlLabParams = env.lab_params_api_url;

  const getAllObstetricDetails = async () => {
    const obstetricResponse = await fetchObstetricDetails(patient_data.patient_unique_id);
    if (obstetricResponse) {
      dispatch(addObstetricDetails(obstetricResponse));
    }
  };

  const getAllPatientDocs = async () => {
    const doctorUploadedDocs = await fetchAllPatientDocs(
      patient_data.patient_unique_id
    );
    const patientUploadedDocs = await fetchDocsUploadedByPatient(
      patient_data.patient_unique_id
    );
    dispatch(setPatientUploadedDocs(patientUploadedDocs));
    dispatch(
      setAllUploadedDocs(
        mergeDocuments(doctorUploadedDocs, patientUploadedDocs)
      )
    );
  };

  const getAllDocumentCategories = async () => {
    const response = await fetchAllDocumentCategories();
    dispatch(setUploadDocCategories(response));
  };

  const handleVideoConsult = async () => {
    setIsInitiatingCall(true);
    
    try {
      const response = await ApiVideoConsult.initiateTeleCall(videoConsultData?.pam_id);      
      if (response.message === "success") {
        if (response.action === "join-video-call" && response.callJoinUrlForDoctor) {
          setVideoConsultUrl(response.callJoinUrlForDoctor);
          setVideoConsultAction(response.action);
          setIsVideoModalVisible(true);
        } else if (response.action === "join-audio-call") {
          message.info(response.displayMessage || "Audio call initiated successfully");
        }
        
        trackEvent("TP_VideoConsult_Started_SmartRx", {
          patient_id: patient_data?.patient_unique_id || "",
          doctor_unique_id: profile?.doctor_unique_id,
          page: "Smart Prescription",
          call_type: response.action,
        });
      } else {
        message.error("Failed to initiate consultation");
      }
    } catch (error) {
      console.error('VC Error initiating call:', error);
      message.error("Failed to start video consultation. Please try again.");
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const handleTeleconsultClick = async () => {
    if (joinToken) return;
    const appointmentId = pamId || patient_data?.pam_id || videoConsultData?.pam_id;
    if (!appointmentId) {
      message.error("No appointment selected");
      return;
    }
    setIsTeleconsultJoinLoading(true);
    try {
      const response = await ApiTeleconsult.checkVideoAvailability(appointmentId);
      const data = response?.data ?? response;
      const token = data?.joinPayload?.token ?? data?.token;
      if (token) {
        dispatch(setJoinToken(token));
        dispatch(setActiveTeleconsultAppointmentId(appointmentId));
        if (data?.consultationId) {
          dispatch(setActiveTeleconsultConsultationId(data.consultationId));
        }

        window.Moengage.track_event("TP_TC_StartCall", {
          doctor_name: profile?.um_name,
          doctor_number: profile?.um_contact,
          doctor_specialty: profile?.dp_name,
          doctor_um_id: tokenData?.user_id,
        });

        if (data?.status) {
          dispatch(setAppointmentTeleconsultStatus({ appointmentId, status: data.status }));
        }
      } else {
        message.error("Teleconsult unavailable as appointment time has passed");
      }
    } catch (_error) {
      message.error("Teleconsult unavailable at the moment.");
    } finally {
      setIsTeleconsultJoinLoading(false);
    }
  };

  useEffect(() => {
    if (isGynaecHistoryAccessable) {
      getAllObstetricDetails();
    }
  }, [isGynaecHistoryAccessable]);

  useEffect(() => {
    if (uploadDocCategories?.length === 0) {
      getAllDocumentCategories();
    }
    if (patient_data?.patient_unique_id && allUploadedDocs?.length === 0) {
      getAllPatientDocs();
    }
  }, []);

  // Load templates when component mounts
  useEffect(() => {
    // Only load templates if there are no smartRxFiles
    // smartRxFiles should take priority over templates
    // if (!smartRxFilesData || smartRxFilesData.length === 0) {
      loadCustomTemplates();
    // }
  }, [smartRxFilesData]);

  // Auto-load template images when selection changes, or when patient context updates for Mission-style templates
  useEffect(() => {
    // Only load template images if there are no smartRxFiles
    // smartRxFiles should take priority over templates
    if (selectedTemplateId && selectedTemplateId !== 'none' && 
        (!smartRxFiles || smartRxFiles.length === 0)) {
      const selectedTemplate = getSelectedTemplateById(selectedTemplateId);
      if (selectedTemplate) {
        void loadTemplateImages(selectedTemplate).catch((e) =>
          console.error("Auto-load template images failed", e)
        );
      }
    }
  }, [
    selectedTemplateId,
    smartRxFiles.length,
    getSelectedTemplateById,
    missionTemplatePatientKey,
    templates.length,
  ]);

  // Monitor changes to pagesMetaData for debugging
  useEffect(() => {
    console.log("pagesMetaData changed:", {
      length: pagesMetaData.length,
      metadata: pagesMetaData,
      pages: pages,
      isEditingBackendData: isEditingBackendData
    });
  }, [pagesMetaData]);

  // Simple useEffect to monitor pages changes and update metadata
  useEffect(() => {
    if (pages.length > 0 && pagesMetaData.length !== pages.length) {
      
      // Only update metadata if we're not editing backend data
      if (!isEditingBackendData || !hasBackendMetadata()) {
        updatePagesMetadata();
      } else {
        console.log("Skipping metadata update - preserving backend metadata");
      }
    }
  }, [pages]);

  // Function to manually sync metadata (for debugging)
  const syncMetadata = () => {
    updatePagesMetadata();
  };

  // Function to check page ID synchronization
  const checkPageIdSync = () => {
    
    const pageIds = pages;
    const metadataPageIds = pagesMetaData.map(meta => meta.page_id);
    
    const mismatched = pageIds.filter((pageId, index) => pageId !== metadataPageIds[index]);
    
    // if (mismatched.length === 0) {
    //   console.log("✅ Page IDs are perfectly synchronized!");
    // } else {
    //   console.log("❌ Page ID mismatches found:", mismatched);
    //   console.log("Mismatch details:", mismatched.map(pageId => {
    //     const pageIndex = pageIds.indexOf(pageId);
    //     const metadataIndex = metadataPageIds.indexOf(pageId);
    //     return {
    //       pageId,
    //       pageIndex,
    //       metadataIndex,
    //       pageOrder: pageIndex + 1,
    //       metadataOrder: metadataIndex + 1
    //     };
    //   }));
    // }
    
    return mismatched.length === 0;
  };

  // Sync backend metadata when smartRx files are loaded
  useEffect(() => {
    if (smartRxFilesData?.length > 0 && 
        isCustomSSRX && 
        hasBackendMetadata()) {
            
      // Get backend pages metadata
      const backendPages = caseManagerData?.custom_ss_data?.custom_ss_data?.pages || caseManagerData?.custom_ss_data?.pages;
      
      // First, create page IDs from backend metadata (preserve existing UUIDs)
      const backendPageIds = backendPages.map((meta, index) => {
        // If we have existing pages with the same order, use that page ID
        const existingPage = pages.find((_, pageIndex) => pageIndex === index);
        return existingPage || uuidv4();
      });
      
      // Set the pages array with backend page IDs
      if (backendPageIds.length > 0) {
        setPages(backendPageIds);
      }
      
      // Then sync the metadata using the same page IDs
      const syncedMetadata = backendPages.map((meta, index) => ({
        page_order: meta.page_order || index + 1,
        page_type: meta.page_type,
        template_page_index: meta.page_type === "blank" ? null : meta.template_page_index,
        page_id: backendPageIds[index]
      }));
      
      setPagesMetaData(syncedMetadata);
      
      // Also update the selected template from backend data
      updateSelectedTemplateFromBackend();
    }
  }, [smartRxFilesData, isCustomSSRX, caseManagerData?.custom_ss_data?.custom_ss_data?.pages, caseManagerData?.custom_ss_data?.pages]);

  // useEffect to track caseManagerData changes
  useEffect(() => {  
    // If we have backend template data, update the selected template
    if (caseManagerData?.custom_ss_data?.custom_ss_data?.template_id || caseManagerData?.custom_ss_data?.template_id) {
      updateSelectedTemplateFromBackend();
    }
  }, [caseManagerData, smartRxFilesData, isCustomSSRX]);

  // Function to load templates from API
  const loadCustomTemplates = async (preserveSelection = false) => {
    try {
      const result = await getCustomSyncPadTemplates();
      if (result.success && result.data && result.data.length > 0) {

        setTemplates(result.data);
        
        // Only auto-select template if there are no smartRxFiles
        // smartRxFiles should take priority over templates
        if (!smartRxFiles || smartRxFiles.length === 0) {
          // Find the default template and set it as selected
          const defaultTemplate = result.data.find(template => template.default === true);
          if (defaultTemplate) {
            setSelectedTemplateId(defaultTemplate.id);
          } else if (!selectedTemplateId && !preserveSelection) {
            // Fallback to first template if no default template found
            setSelectedTemplateId(result.data[0].id);
          }
        } else {
          // Keep template selection as 'none' when smartRxFiles are present
          setSelectedTemplateId('none');
        }
      } else {
        setTemplates([]);
        setSelectedTemplateId(null);
      }
    } catch (error) {
      message.error('Error loading templates:', error);
      setTemplates([]);
    }
  };

  useEffect(() => {
    if (caseManagerData !== undefined) {
      if (
        caseManagerData.vitals?.length > 0 &&
        customizedPadLeftList.findIndex(
          (e) => e.tmdpm_id === 1 && e.tmdpm_status === 0
        ) !== -1
      ) {
        const updatedData = caseManagerData.vitals.map((e, i) => {
          return {
            ...e,
            systolic: e.blood_press ? e.blood_press.split("/")[0] : "",
            diastolic: e.blood_press ? e.blood_press.split("/")[1] : "",
          };
        });
        setVitalsData(updatedData);
      }
      if (
        caseManagerData.medical_history?.length > 0 &&
        customizedPadLeftList.findIndex(
          (e) => e.tmdpm_id === 3 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setMedicalHistoryData(
          JSON.parse(JSON.stringify(caseManagerData.medical_history))
        );
      }
      if (
        caseManagerData.symptoms?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 5 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setSymptomsData(caseManagerData.symptoms);
      }
      if (
        caseManagerData.examination?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 10 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setExaminationData(caseManagerData.examination);
      }
      if (
        caseManagerData.surgeries?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 21 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setSurgeriesData(caseManagerData.surgeries);
      }
      if (
        caseManagerData.diagnosis?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 11 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setDiagnosisData(caseManagerData.diagnosis);
      }
      if (
        caseManagerData.medicine?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 12 && e.tmdpm_status === 0
        ) !== -1
      ) {
        const updatedData = caseManagerData.medicine.map((e) => {
          const unitObj = e?.medicineUnit
            ? e?.medicineUnit.find((x) => x.tmu_id === e.tmm_unit)
            : null;
          const frequencyObj = frequencyList.find(
            (x) => x.tmf_id === e.tmm_freq_type
          );
          const timingObj = timingList.find((x) => x.tmt_id === e.tmm_time);

          return {
            ...e,
            tmm_unit_name:
              unitObj && unitObj !== undefined ? unitObj.tmu_title : "",
            tmm_freq_type_name:
              e.tmf_block === 0
                ? `${
                    e.tcm_tmm_freq_morning
                      ? e.tcm_tmm_freq_morning + " - "
                      : "0 -"
                  }${
                    e.tcm_tmm_freq_afternoon
                      ? e.tcm_tmm_freq_afternoon + " - "
                      : "0 -"
                  }${
                    e.tcm_tmm_freq_evening
                      ? e.tcm_tmm_freq_evening + " - "
                      : "0 -"
                  }${e.tcm_tmm_freq_night ? e.tcm_tmm_freq_night : "0"}`
                : frequencyObj !== undefined
                ? frequencyObj.tmf_title
                : "",
            tmf_block_val:
              frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
            tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
            tmm_dosage_unit_name: `${
              e.tmm_dosage
                ? `${e.tmm_dosage} ${
                    unitObj && unitObj !== undefined ? unitObj.tmu_title : ""
                  }`
                : ""
            }`,
            tmm_days_duration_type: `${
              e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : ""
            }`,
            unique_id: uuidv4(),
          };
        });
        setMedicationData([...updatedData]);
      }
      if (
        caseManagerData.advice?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 13 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setAdviceData(caseManagerData.advice);
      }
      if (
        caseManagerData.investigation?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 14 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setInvestigationData(caseManagerData.investigation);
      }
      if (
        !fromRepeatRx &&
        caseManagerData.follow_up_date &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 15 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setFollowUpDate(caseManagerData.follow_up_date);
      }
      if (
        caseManagerData.visit_advice &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 15 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setAdditionalNote(caseManagerData.visit_advice);
      }
    }
  }, []);

  useEffect(() => {
    getSymptomsCollectorData();
  }, []);

  const getSymptomsCollectorData = async () => {
    const payload = {
      um_id: String(userId),
      patient_unique_id: String(patient_data?.patient_unique_id),
      hm_id: String(decodedToken?.result?.clinic_id),
      pam_id:
        patient_data !== undefined && patient_data.pam_id !== undefined
          ? String(patient_data.pam_id)
          : caseManagerData !== undefined
          ? String(caseManagerData.pam_id)
          : 0,
    };
    const response = await fetchSymptomsCollectorData(payload);
    if (response && Object.keys(response)?.length > 0) {
      dispatch(
        setSymptomCollector({
          ...response?.summary_json_doctor,
          _id: response?._id,
        })
      );
      setShowSCBanner(true);
      if (patient_data?.pam_status === "0") {
        dispatch(setShowSCPopup(true));
      }
    }
  };

  // Drawer Vitals
  const handleDrawerVital = useCallback(() => {
    setVitalDrawer(!vitalDrawer);
  }, [vitalDrawer]);

  // Drawer Medical History
  const handleDrawerMedicalHistory = useCallback(() => {
    setMedicalHistoryDrawer(!medicalHistoryDrawer);
  }, [medicalHistoryDrawer]);

  // Drawer Private Notes
  const handleDrawerPrivateNotes = useCallback(
    (data) => {
      setSelectPrivateNotes(data);
      setPrivateNotesDrawer(!privateNotesDrawer);
    },
    [privateNotesDrawer, selectPrivateNotes]
  );

  // Drawer Vaccination
  const handleDrawerVaccination = (chartType) => {
    setVaccinationDrawer(!vaccinationDrawer);
    if (!vaccinationDrawer) {
      trackEvent("TP_Vac_Module", {
        patientName: patient_data?.pm_fullname || "",
        patientId: patient_data?.patient_unique_id || "",
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        doctorName: profile?.um_name,
        source: chartType ? "Patient Details" : "Smart Rx",
      });
    }
  };

  // Drawer Growth Chart
  const handleDrawerGrowth = () => {
    setGrowthDrawer(!growthDrawer);
    setIsGrowthChart(!isGrowthChart);
  };

  // Drawer Upload Document
  const handleDrawerUploadDoc = () => {
    setUploadDocDrawer(!uploadDocDrawer);
  };

  const handleDeletePopup = () => {
    setShowDeletePopup(true);
  };

  // Drawer Medical Report
  const handleDrawerMedicalReport = () => {
    setMedicalReportDrawer(!medicalReportDrawer);
  };

  // Drawer Obstetric
  const handleDrawerObstetric = () => {
    setObstetricDrawer(!obstetricDrawer);
  };

  // Drawer Upload Canvas
  const handleDrawerUploadCanvas = () => {
    setUploadCanvasDrawer(!uploadCanvasDrawer);
  };

  // Handle Canvas Upload - Updated to refresh templates from API and auto-select new template
  const handleCanvasUploaded = async (templateData) => {
    message.open({
      key: MESSAGE_KEY,
      type: '',
      className: 'message-appointment',
      content: (
          <div className='d-flex align-items-center'>
              <img src={visitEnd} className='me-3' />
              <div>
                  <div className='title-common text-start fontroboto'>{`Template "${templateData.title}" uploaded successfully!`}</div>
              </div>
              <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
          </div>
      ),
      duration: 5,
  });
    
    // Check if user had unsaved changes on current canvas
    // const hasUnsavedChanges = checkForUnsavedChanges();
    // if (hasUnsavedChanges) {
    //   message.warning('Previous canvas changes were cleared when loading the new template.');
    // }
    
    // Refresh the templates list to show the newly uploaded template
    // Preserve selection so we can manually set the new template
    await loadCustomTemplates(true);
    
    // Auto-select the newly created template
    if (templateData && templateData.id) {
      setSelectedTemplateId(templateData.id);
      // Load the template images immediately
      await loadTemplateImages(templateData);
    }
    
    // Close the upload drawer
    setUploadCanvasDrawer(false);
  };

  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    
    // Clear old canvas refs to prevent accumulation of previous template canvases
    canvasRefs.current = {};
    ctxGlobalRefs.current = {};
    
    if (templateId === 'none') {
      // Clear template images and reset to blank canvas
      setCustomRxImages([]);
      setImageLoaded({});
      setImageRefs({});
      
      // Replace all pages with a single blank page
      const newPageId = uuidv4();
      setPages([newPageId]);
      setDataPresentInCanvas([false]);
      setSelectedPage(0);
      blankCanvasPreparedRef.current = { [newPageId]: false };
      
      // Initialize pages metadata for blank page
      const blankPageMetadata = [{
        page_order: 1,
        page_type: "blank",
        page_id: newPageId
      }];
      
      // Use the safe metadata setting function
      setMetadataSafely(blankPageMetadata, "handleTemplateSelect blank");
    } else {
      // Handle template selection
      const selected = templates.find(t => t.id === templateId);
      if (selected) {
        message.success(`Template "${selected.title}" activated`);
        // Load template images - this will create pages and set template image indices
        loadTemplateImages(selected);
      }
    }
  };

  // Handle add/edit canvas action - Updated to open template manager
  const handleAddEditCanvas = () => {
    if(templates.length === 0){
      setUploadCanvasDrawer(true);
    }else {
      setTemplateManagerDrawer(true);
    }
  };

  // Handle opening upload drawer from template manager
  const handleUploadNewTemplate = () => {
    window.Moengage.track_event("TP_CC_Add_Custom_Rx", {
      "Doctor_specialty": profile?.dp_name,
      "Doctor_unique_id": profile?.doctor_unique_id,
      "Doctor_Name": profile?.um_name,
      "Doctor_mobile_No": profile?.um_contact,
    });
    setTemplateManagerDrawer(false);
    setUploadCanvasDrawer(true);
  };

  // Handle template edit
  const handleEditTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setTemplateToEdit(template);
      setTemplateManagerDrawer(false); // Close template manager
      setEditTemplateModal(true); // Open edit modal
    } else {
      message.error('Template not found');
    }
  };

  // Handle template delete
  const handleDeleteTemplate = async (templateId) => {
    // Check if the deleted template was the currently selected one
    if (selectedTemplateId === templateId) {
      // Clear the selection and template images
      setSelectedTemplateId(null);
      setCustomRxImages([]);
      setImageLoaded({});
      setImageRefs({});
      
      // Replace all pages with a single blank page
      const newPageId = uuidv4();
      setPages([newPageId]);
      setDataPresentInCanvas([false]);
      setSelectedPage(0);
      
      // Initialize pages metadata for blank page
      const blankPageMetadata = [{
        page_order: 1,
        page_type: "blank",
        page_id: newPageId
      }];
      
      // Use the safe metadata setting function
      setMetadataSafely(blankPageMetadata, "handleDeleteTemplate blank");
      
      message.info('Selected template was deleted. Switched to blank canvas.');
    }
    
    // Refresh the templates list
    await loadCustomTemplates(true);
  };

  const handleDownloadTemplate = async (templateId) => {
    setDownloadingTemplateId(templateId);
    
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        message.error('Template not found');
        return;
      }

      if (!template.uploaded_files || template.uploaded_files.length === 0) {
        message.error('Template has no files to download');
        return;
      }

      const fileName = `${template.title.replace(/[^a-z0-9]/gi, '_')}_template.pdf`;
      
      try {
        // message.info(`Converting ${template.uploaded_files.length} image(s) to PDF...`, 2);
        const pdfBlob = await convertImagesToPDF(template.uploaded_files, template.title);
        saveAs(pdfBlob, fileName);
        message.success(`Downloaded PDF: ${fileName}`, 3);
        
      } catch (conversionError) {
        message.error(`Failed to convert template to PDF: ${conversionError.message}`, 6);
        
        try {
          const totalFiles = template.uploaded_files.length;
          message.info(`Downloading ${totalFiles} image(s) individually...`, 2);
          
          let successCount = 0;
          let failureCount = 0;
          
          for (let i = 0; i < totalFiles; i++) {
            const file = template.uploaded_files[i];
            const imageFileName = `${template.title.replace(/[^a-z0-9]/gi, '_')}_page_${i + 1}.jpg`;
            
            try {
              await downloadSingleFile(file.file_url, imageFileName);
              successCount++;
              
              if (i < totalFiles - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (error) {
              failureCount++;
            }
          }
          
          if (successCount === totalFiles) {
            message.success(`All ${totalFiles} images downloaded successfully`, 3);
          } else if (successCount > 0) {
            message.warning(`Downloaded ${successCount}/${totalFiles} images. ${failureCount} failed`, 4);
          } else {
            message.error('Failed to download images. Please try again', 4);
          }
        } catch (fallbackError) {
          message.error('Failed to download template images. Please try again', 4);
        }
      }
      
    } catch (error) {
      message.error(`Failed to download template: ${error.message}. Please try again`);
    } finally {
      setDownloadingTemplateId(null);
    }
  };

  const convertImagesToPDF = async (files, templateTitle) => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imageWidth = pageWidth - (margin * 2);
      const imageHeight = pageHeight - (margin * 2);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const response = await axios({
            url: file.file_url,
            method: 'GET',
            responseType: 'blob'
          });

          const blob = response.data;
          const reader = new FileReader();
          
          const imageData = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          if (i > 0) {
            pdf.addPage();
          }

          pdf.addImage(
            imageData, 
            'JPEG', 
            margin, 
            margin, 
            imageWidth, 
            imageHeight,
            undefined,
            'FAST'
          );
          
        } catch (imageError) {
          // Continue with other images
        }
      }

      const pdfBlob = pdf.output('blob');
      return pdfBlob;
      
    } catch (error) {
      throw new Error(`Failed to convert images to PDF: ${error.message}`);
    }
  };

  // Helper function to download a single file
  const downloadSingleFile = async (fileUrl, fileName) => {
    
    try {
      // Method 1: Try axios download with authentication
      const payload = {
        url: fileUrl,
        method: "GET",
        responseType: "blob",
      };

      // Add authorization header if needed (following medical records pattern)
      const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      if (token) {
        payload.headers = {
          Authorization: `Bearer ${JSON.parse(token)}`,
        };
      }

      const response = await axios(payload);

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/pdf",
      });
      
      saveAs(blob, fileName);
      
    } catch (error) {
      
      // Method 2: Fallback to window.open for CORS issues
      if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        try {
          // Create a temporary link with download attribute
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = fileName;
          link.target = '_blank';
          
          // Add to DOM temporarily
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          message.info(`Download started: ${fileName}`);
          return;
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      
      // Method 3: Last resort - try direct fetch
      try {
        const response = await fetch(fileUrl, {
          headers: token ? {
            'Authorization': `Bearer ${JSON.parse(token)}`
          } : {}
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        saveAs(blob, fileName);
        return;
      } catch (fetchError) {
        console.error('Fetch also failed:', fetchError);
      }
      
      // If all methods fail, throw the original error
      throw error;
    }
  };

  // Handle edit template save
  const handleEditSave = async (updatedTemplateData) => {
    // Check if user had unsaved changes on current canvas
    // const hasUnsavedChanges = checkForUnsavedChanges();
    // if (hasUnsavedChanges) {
    //   message.warning('Previous canvas changes were cleared when loading the updated template.');
    // }
    
    // Refresh templates to show updated data
    // Preserve selection so we can manually set the updated template
    await loadCustomTemplates(true);
    
          // Auto-select the updated template
      if (updatedTemplateData && updatedTemplateData.id) {
        setSelectedTemplateId(updatedTemplateData.id);
        // Load the updated template images immediately
        await loadTemplateImages(updatedTemplateData);
      }
    
    // Reset edit state
    setEditTemplateModal(false);
    setTemplateToEdit(null);
    // Reopen template manager to show updated list
    setTemplateManagerDrawer(true);
  };

  useEffect(() => {
    if (chartType === "vaccination") {
      handleDrawerVaccination(chartType);
    } else if (chartType === "growthChart") {
      handleDrawerGrowth();
    }
  }, [chartType]);

  useEffect(() => {
    if (isNavigateToObstetric) {
      handleDrawerObstetric();
      dispatch(navigateToObstetric());
    }
  }, [isNavigateToObstetric]);

  useEffect(() => {
    const clinic_name = getClinicName(profile?.hospital_data);
    tcmId === 0 ?
      window.Moengage.track_event("TP_Consultation_Started", {
        clinic_name,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
        tcm_id: tcmId,
      })
      :
      window.Moengage.track_event("TP_Consultation_edit_started", {
        clinic_name,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
      })
    const sendData = {
      patient_unique_id: patient_data?.patient_unique_id,
    };
    dispatch(viewPatient(sendData));
  }, []);

  //Handle Sider
  const handleCollapsed = useCallback(
    (flag) => {
      if (flag === 1) {
        handleDrawerVital();
      } else if (flag === 2) {
        handleDrawerMedicalHistory();
      } else if (flag === 3) {
        handleDrawerVaccination();
      } else if (flag === 4) {
        handleDrawerPrivateNotes();
      } else if (flag === 5) {
        handleDrawerCvtKnowMore();
      }
    },
    [
      vitalDrawer,
      medicalHistoryDrawer,
      vaccinationDrawer,
      privateNotesDrawer,
      cvtDrawer,
    ]
  );

  useEffect(() => {
    const patientLastHistory = async () => {
      const V_action = await dispatch(
        getVitals({
          patient_unique_id:
            patient_data !== undefined ? patient_data.patient_unique_id : 0,
          pam_id:
            patient_data !== undefined && patient_data.pam_id !== undefined
              ? patient_data.pam_id
              : 0,
          mode: caseManagerData !== undefined && tcmId !== 0 ? EDIT : ADD,
          pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0,
          pm_id: patient_data !== undefined ? patient_data.pm_id : 0,
        })
      );

      if (
        (profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) &&
        patient_data?.ageMonths <= 12 &&
        patient_data?.ageYears === 0
      ) {
        dispatch(
          getPatientBirthWeight({
            patient_unique_id:
              patient_data !== undefined ? patient_data.patient_unique_id : 0,
            pam_id:
              patient_data !== undefined && patient_data.pam_id !== undefined
                ? patient_data.pam_id
                : 0,
          })
        );
      }

      const PN_action = await dispatch(
        listPrivateNotes({
          patient_unique_id:
            patient_data !== undefined ? patient_data.patient_unique_id : 0,
          mode: caseManagerData !== undefined ? EDIT : ADD,
          
          pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0, //extra
          pm_id: patient_data !== undefined ? patient_data.pm_id : 0, //extra
        })
      );

      if (caseManagerData === undefined) {
        const MH_action = await dispatch(
          getPatientLastHistory({
            patient_unique_id:
              patient_data !== undefined ? patient_data.patient_unique_id : 0,
          })
        );
        if (MH_action.meta.requestStatus === "fulfilled") {
          setMedicalHistoryData(JSON.parse(JSON.stringify(MH_action.payload)));
        }
      }
    };
    patientLastHistory();
  }, []);

  useEffect(() => {
    if (!(caseManagerData === undefined || tcmId === 0)) return;
    const updatedData = selectedVitalsList.map((e) => {
      return {
        ...e,
        systolic: e.blood_press ? e.blood_press.split("/")[0] : "",
        diastolic: e.blood_press ? e.blood_press.split("/")[1] : "",
      };
    });
    const patch = isAutofillSelected
      ? mapVitalsAndBodyCompositionToRowPatch(
          selectedSymptomsCollector?.vitalsAndBodyComposition,
          vitalsCalculate
        )
      : null;
    setVitalsData((prev) =>
      mergeVitalsRowsWithSymptomCollectorPatch(
        prev,
        updatedData,
        patch,
        vitalsCalculate,
        VITALS_ROW_DATE_FORMAT
      )
    );
  }, [
    selectedVitalsList,
    caseManagerData,
    tcmId,
    isAutofillSelected,
    selectedSymptomsCollector,
    vitalsCalculate,
  ]);

  useEffect(() => {
    if (caseManagerData !== undefined) {
      if (
        caseManagerData.private_notes &&
        customizedPadLeftList.findIndex(
          (e) => e.tmdpm_id === 8 && e.tmdpm_status === 0
        ) !== -1 &&
        privateNotesList.findIndex(
          (e) => e.id === caseManagerData.private_notes.id
        ) !== -1 &&
        tcmId
      ) {
        setPrivateNotesData(caseManagerData.private_notes);
      }
    }
  }, [privateNotesList]);

  const handleSaveGynecHistory = (updatedGynecHistory) => {
    setUpdatedGynecHistory(updatedGynecHistory);
  };

  useEffect(() => {
    if (isGynaecHistoryAccessable) {
      fetchGynecHistory();
    }
  }, [isGynaecHistoryAccessable]);

  useEffect(() => {
    getLabParams();
  }, []);

  const fetchGynecHistory = async () => {
    try {
      const data = await getGynecDetails(
        patient_data.patient_unique_id,
        userId
      );
      // Destructure to remove createdAt and createdBy
      const { createdAt, createdBy, ...updatedData } = data;

      setUpdatedGynecHistory(updatedData);
    } catch (error) {
      console.error("Error fetching gynec history:", error);
    }
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files) {
      const filesData = Array.from(files);
      if (filesData.length > 0) {
        const updatedFiles = [];
        filesData.forEach((file) => {
          const cleanFileName = getCorrectedFileName(file?.name || "");
          // Check if the file is an image and if its name follows typical camera-captured file patterns
          const isCapturedFromCamera =
            (file.type === "image/jpeg" ||
              file.type === "image/png" ||
              file.type === "image/jpg") &&
            (cleanFileName === "image.webp" ||
              cleanFileName === "image.webp" ||
              cleanFileName === "image.webp");

          let newFile = file;

          if (isCapturedFromCamera) {
            // Generate a unique file name for camera-captured images
            const uniqueFileName = generateUniqueFileName(file);
            newFile = new File([file], uniqueFileName, { type: file.type });
          } else {
            // If the file name had spaces, create a new file with spaces removed
            newFile = new File([file], cleanFileName, { type: file.type });
          }

          updatedFiles.push(newFile);
        });
        setFilesData(updatedFiles);
        handleDrawerUploadDoc();
      }
    }
    event.target.value = null;
  };

  // Handle Add button click
  const handleAddClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddLabParamsDrawer = useCallback(() => {
    setAddlabparamsDrawer(!addlabparamsDrawer);
  }, [addlabparamsDrawer]);

  const handleViewLabParamsDrawer = useCallback(() => {
    setViewlabparamsDrawer(!viewlabparamsDrawer);
  }, [viewlabparamsDrawer]);

  // Function to close "View Lab Params" and open "Add Lab Params"
  const handleSwitchToAddLabParams = () => {
    setViewlabparamsDrawer(false);
    setAddlabparamsDrawer(true);
  };

  // Function to update lab params data in parent component when saved
  const handleLabParamsUpdate = () => {
    getLabParams(); // Update state with the new lab params data
  };

  const showHideBackModal = () => {
    setIsBackModalOpen(!isBackModalOpen);
  };

  const getLabParams = async () => {
    try {
      const cleanedToken = token.replace(/['"]+/g, "");
      const response = await axios.get(
        `${baseUrlLabParams}/api/v1/lab-parameters/results/${patient_data?.patient_unique_id}`,
        {
          headers: {
            Authorization: `Bearer ${cleanedToken}`,
          },
        }
      );
      setLabParamsData(response.data?.data?.results || []);
    } catch (error) {
      console.error("Error fetching lab params:", error);
    }
  };

  // Function to load RX images based on selected RX type
  const loadRxImages = () => {
    if (!smartRxFilesData?.length) return;
    
    const loadedImages = {};
    const totalImages = smartRxFilesData.length;
    let loadedCount = 0;

    // Generate unique IDs for each Rx image page
    const newPageIds = smartRxFilesData.map(() => uuidv4());
    setPages(newPageIds);
    setDataPresentInCanvas(Array(smartRxFilesData.length).fill(true));
    
    // Use metadata from caseManagerData.custom_ss_data if available, otherwise initialize default
    const backendPages = caseManagerData?.custom_ss_data?.custom_ss_data?.pages || caseManagerData?.custom_ss_data?.pages;
    if (backendPages && Array.isArray(backendPages)) {
      
      // Map backend metadata to our internal structure
      const newPagesMetaData = backendPages.map((meta, index) => ({
        page_order: meta.page_order || index + 1,
        page_type: meta.page_type || "blank", // Default to blank, not smartRx
        template_page_index: meta.template_page_index,
        page_id: newPageIds[index]
      }));
      // Use the safe metadata setting function
      setMetadataSafely(newPagesMetaData, "loadRxImages backend");
      
      // Validate that the metadata is properly set
      setTimeout(() => {
        if (pagesMetaData.length !== newPageIds.length) {
          console.warn("Metadata length mismatch after setting from backend, forcing validation");
          // Only validate if we don't have backend metadata
          if (!hasBackendMetadata()) {
            validatePagesMetadata();
          } else {
            console.log("Backend metadata exists, skipping validation to preserve template/blank structure");
          }
        }
      }, 100);
    } else {
      // Fallback to default metadata if backend metadata is not available
      const newPagesMetaData = newPageIds.map((pageId, index) => ({
        page_order: index + 1,
        page_type: "blank", // Default to blank, not smartRx
        page_id: pageId
      }));
      // Use the safe metadata setting function
      setMetadataSafely(newPagesMetaData, "loadRxImages default");
      
      // Validate that the metadata is properly set
      setTimeout(() => {
        if (pagesMetaData.length !== newPageIds.length) {
          console.warn("Metadata length mismatch after setting default, forcing validation");
          validatePagesMetadata();
        }
      }, 100);
    }
    
    smartRxFilesData.forEach((imageObj, index) => {
      const { smart_prescription_file: imageUrl } = imageObj;
      const img = new Image();
      img.src = imageUrl;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        loadedImages[newPageIds[index]] = img;
        setImageRefs((prevState) => ({
          ...prevState,
          [newPageIds[index]]: img,
        }));
        setImageLoaded((prevState) => ({
          ...prevState,
          [newPageIds[index]]: true,
        }));
        loadedCount++;

        // Hide loader when all images are loaded
        if (loadedCount === totalImages) {
          setLoading(false);
        }
      };
    });
  };

  // Function to check if there are unsaved changes on the current canvas
  const checkForUnsavedChanges = () => {
    // Check if there are any custom RX images loaded (indicating user has been working on canvas)
    if (customRxImages && customRxImages.length > 0) {
      return true;
    }
    
    // Check if there are any canvas refs with data (indicating user has drawn/written something)
    if (canvasRefs.current && Object.keys(canvasRefs.current).length > 0) {
      // Check if any canvas has actual content (not just empty)
      for (const canvasId in canvasRefs.current) {
        const canvas = canvasRefs.current[canvasId];
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          // This is a basic check - in a real implementation you might want to check actual pixel data
          return true;
        }
      }
    }
    
    return false;
  };

  // Function to load template images
  const loadTemplateImages = async (template) => {
    let templatePageSources = [];
    try {
      templatePageSources = await getTemplatePageSources(template);
    } catch (e) {
      console.error("loadTemplateImages: failed to resolve template pages", e);
      setLoading(false);
      return;
    }
    if (templatePageSources.length === 0) {
      return;
    }
    
    // Set loading state
    setLoading(true);
    
    // Don't clear existing canvas refs - preserve user drawings
    // Only clear if we're switching to a completely different template
    if (selectedTemplateId !== template.id) {
      canvasRefs.current = {};
      ctxGlobalRefs.current = {};
    }
    
    const totalImages = templatePageSources.length;
    let loadedCount = 0;

    // Generate unique IDs for each template image page
    const newPageIds = templatePageSources.map(() => uuidv4());
    setPages(newPageIds);
    setDataPresentInCanvas(Array(templatePageSources.length).fill(true));
    setSelectedPage(0); // Select the first page
    
    // Initialize pages metadata for template pages
    const newPagesMetaData = newPageIds.map((pageId, index) => ({
      page_order: index + 1,
      page_type: "template",
      template_page_index: index,
      page_id: pageId
    }));
    
    // Use the safe metadata setting function
    setMetadataSafely(newPagesMetaData, "loadTemplateImages");
    
    // Clear previous custom RX images since we're loading templates
    setCustomRxImages([]);
    
    templatePageSources.forEach((templateImageSrc, index) => {
      const img = new Image();
      if (templateImageSrc && !String(templateImageSrc).startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.src = templateImageSrc;
      img.onload = () => {
        setImageRefs((prevState) => ({
          ...prevState,
          [newPageIds[index]]: img,
        }));
        setImageLoaded((prevState) => ({
          ...prevState,
          [newPageIds[index]]: true,
        }));
        loadedCount++;

        // Hide loader when all images are loaded
        if (loadedCount === totalImages) {
          setLoading(false);
        }
      };
      img.onerror = () => {
        loadedCount++;
        
        // Still hide loader even if some images fail
        if (loadedCount === totalImages) {
          setLoading(false);
        }
      };
    });
  };

  const CUSTOMIZED_PAD_LEFT_LIST = () => {
    return customizedPadLeftList?.map((e, i) => {
      if (isCvtExtHosAccessableFromGB && e.tmdpm_id !== 1) return null;

      return e.tmdpm_id === 1 && e.tmdpm_status === 0 ? (
        <div key={i} className="prescription-box-sm p-14">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img src={vitals} alt="vitals" className="me-3" />
              <div className="title-common">Vitals & Body Composition</div>
            </div>
            <button
              className="btn d-flex align-items-center btn-text"
              onClick={handleDrawerVital}
            >
              {" "}
              <i
                className={`${
                  vitalsData.length > 0 ? "icon-Edit" : "icon-Add"
                } me-1 fs-5`}
              ></i>{" "}
              <span>{`${vitalsData.length > 0 ? "Edit" : "Add"}`}</span>
            </button>
          </div>
          {(vitalsData.length > 0 ||
            vitalsPastList.length > 0 ||
            patientBirthWeight ||
            (isAutofillSelected &&
              hasVitalsAndBodyCompositionData(
                selectedSymptomsCollector?.vitalsAndBodyComposition
              ))) && (
            <VitalsList mode={caseManagerData !== undefined ? EDIT : ADD} />
          )}
        </div>
      ) : e.tmdpm_id === 3 && e.tmdpm_status === 0 ? (
        <div key={i} className="prescription-box-sm p-14">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img
                src={MedicalHistory}
                alt="Medical History"
                className="me-3"
              />
              <div className="title-common">
                {isGynaecHistoryAccessable
                  ? `Gynec History`
                  : `Medical History`}
              </div>
            </div>

            <button
              className="btn d-flex align-items-center btn-text"
              onClick={handleDrawerMedicalHistory}
            >
              {" "}
              <i
                className={`${
                  medicalHistoryData.length > 0 ||
                  (updatedGynecHistory &&
                    Object.keys(updatedGynecHistory).length > 0)
                    ? "icon-Edit"
                    : "icon-Add"
                } me-1 fs-5`}
              ></i>{" "}
              <span>{`${
                medicalHistoryData.length > 0 ||
                (updatedGynecHistory &&
                  Object.keys(updatedGynecHistory).length > 0)
                  ? "Edit"
                  : "Add"
              }`}</span>
            </button>
          </div>
          {(medicalHistoryData.length > 0 ||
            (updatedGynecHistory &&
              Object.keys(updatedGynecHistory).length > 0)) && (
            <MedicalHistoryList gynecHistory={updatedGynecHistory} />
          )}
        </div>
      ) : e.tmdpm_id === 7 &&
        e.tmdpm_status === 0 &&
        isVaccinationAccessable ? (
        <div className="prescription-box-sm p-14">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img src={vaccinationImg} alt="vitals" className="me-3" />
              <div className="title-common">Vaccination</div>
            </div>
            <button
              className="btn d-flex align-items-center btn-text"
              onClick={handleDrawerVaccination}
            >
              {" "}
              <i className={`icon-Add me-1 fs-5`}></i> <span>Add</span>
            </button>
          </div>
        </div>
      ) : e.tmdpm_id === 16 &&
        e.tmdpm_status === 0 &&
        isGrowthChartAccessable ? (
        <div className="prescription-box-sm p-14">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img src={growthChartImg} alt="growth" className="me-3" />
              <div className="title-common">Growth Chart</div>
            </div>
            <button
              className="btn d-flex align-items-center btn-text"
              onClick={handleDrawerGrowth}
            >
              <i className={`icon-Add me-1 fs-5`}></i> <span>Add</span>
            </button>
          </div>
        </div>
      ) : e.tmdpm_id === 8 && e.tmdpm_status === 0 ? (
        <div key={i} className="prescription-box-sm p-14">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img src={privateNotes} alt="Private Notes" className="me-3" />
              <div className="title-common">Private Notes</div>
            </div>
            {!privateNotesData && (
              <button
                className="btn d-flex align-items-center btn-text"
                onClick={handleDrawerPrivateNotes}
              >
                <i className="icon-Add me-1 fs-5"></i>
                <span>Add</span>
              </button>
            )}
          </div>
          {privateNotesList.length > 0 && (
            <PrivateNotesList
              handleDrawerPrivateNotes={handleDrawerPrivateNotes}
            />
          )}
        </div>
      ) : e.tmdpm_id === 17 &&
        e.tmdpm_status === 0 &&
        isGynaecHistoryAccessable ? (
        <div className="prescription-box-sm p-14">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img src={obstetricImg} alt="obstetric" className="me-3" />
              <div className="title-common">Obstetric History</div>
            </div>
            <button
              className="btn d-flex align-items-center btn-text"
              onClick={handleDrawerObstetric}
            >
              <i
                className={`${
                  examinationHistory?.length > 0 ? "icon-Edit" : "icon-Add"
                } me-1 fs-5`}
              ></i>
              <span>{`${examinationHistory?.length > 0 ? "Edit" : "Add"}`}</span>
            </button>
          </div>
          {(obstetricDetails?.lmp ||
            obstetricDetails?.edd ||
            obstetricDetails?.ceed ||
            obstetricDetails?.gravidity ||
            obstetricDetails?.parity ||
            obstetricDetails?.livingChildren ||
            obstetricDetails?.abortion ||
            obstetricDetails?.ectopicPregnancies ||
            examinationHistory?.length > 0 ||
            shouldShowAncHistory ||
            shouldShowImmunisation) && <ObstetricList obstetricDrawer={obstetricDrawer} handleDrawerObstetric={handleDrawerObstetric} />}
        </div>
      ) : e.tmdpm_id === 18 && e.tmdpm_status === 0 ? (
        <>
          <div className="prescription-box-sm p-14">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <img
                  src={uploadDocImg}
                  alt="upload-document"
                  className="me-3"
                />
                <div className="title-common">
                  Medical Records{" "}
                  {allUploadedDocs?.length > 0
                    ? `(${allUploadedDocs?.length})`
                    : ""}
                </div>
              </div>
              <button
                className="btn d-flex align-items-center btn-text"
                style={{
                  paddingRight: allUploadedDocs.length > 0 ? 0 : 12,
                }}
                onClick={
                  allUploadedDocs.length > 0
                    ? handleDrawerMedicalReport
                    : handleAddClick
                }
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg, image/jpg, image/gif, application/pdf, video/mp4, video/quicktime, video/x-msvideo"
                  style={{ display: "none" }}
                />
                {allUploadedDocs.length === 0 && (
                  <i className="icon-Add me-1 fs-5" />
                )}
                <span>{`${
                  allUploadedDocs.length > 0 ? "View All" : "Add"
                }`}</span>
                {allUploadedDocs.length > 0 && (
                  <i className="icon-right iconrotate180 ms-auto me-1 fs-5" />
                )}
              </button>
            </div>
            <UploadDocumentList
              handleDrawerUploadDoc={handleDrawerUploadDoc}
              setFilesData={setFilesData}
              setIsEditDocument={setIsEditDocument}
              setUploadDocDrawer={setUploadDocDrawer}
            />
          </div>
        </>
      ) : e.tmdpm_id === 19 && e.tmdpm_status === 0 ? (
        <>
          <div className="prescription-box-sm" style={{ overflow: "hidden" }}>
            <div
              className="d-flex align-items-center justify-content-between p-14"
              style={{ borderBottom: "1px solid #ddd" }}
            >
              <div className="d-flex align-items-center">
                <img
                  src={labResultImg}
                  alt="upload-document"
                  className="me-3"
                />
                <div className="title-common">Lab Results</div>
              </div>
              <button
                className="btn d-flex align-items-center btn-text"
                style={{
                  paddingRight: labParamsData?.length > 0 ? 0 : 12,
                }}
                onClick={
                  labParamsData?.length > 0
                    ? handleViewLabParamsDrawer
                    : handleAddLabParamsDrawer
                }
              >
                {labParamsData?.length === 0 && (
                  <i className="icon-Add me-1 fs-5" />
                )}
                <span>{`${
                  labParamsData?.length > 0 ? "View All" : "Add"
                }`}</span>
                {labParamsData?.length > 0 && (
                  <i className="icon-right iconrotate180 ms-auto me-1 fs-5" />
                )}
              </button>
            </div>
            <LabParametersList
              labParamsData={labParamsData}
              patient_unique_id={patient_data?.patient_unique_id}
              doc_id={userId}
            />
          </div>
        </>
      ) : e.tmdpm_id === 22 && e.tmdpm_status === 0 && isCarePlanEnabled ? (
          <div key={i} className="prescription-box-sm p-14">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <img
                  src={carePlanIcon}
                  alt="Care Plans"
                  className="me-3"
                  style={{ width: '20px', height: '20px' }}
                />
                <div className="title-common">Care Plans</div>
              </div>
            </div>
            
            {/* Care Plan List - Show assigned care plans */}
            <CarePlanList
              patientId={patient_data?.patient_unique_id}
              selectedTcmId={tcmId}
              readOnly={true}
              title="Assigned Care Plans"
              hideWhenEmpty={true}
              onCarePlanSelect={(plan) => {
                setSelectedCarePlan(plan);
              }}
            />
            
            <div className="mt-3">
              <CarePlanDropdown 
                onCarePlanSelect={(plan) => {
                  setSelectedCarePlan(plan);
                }}
                selectedCarePlan={selectedCarePlan}
                patientId={patient_data?.patient_unique_id}
                doctorId={userId}
                clinicId={decodedToken?.result?.clinic_id}
                placeholder={carePlanPlaceholder}
              />
            </div>
          </div>
        ) : null;
    });
  };

  // Drawer CVT Know more page
  const handleDrawerCvtKnowMore = useCallback(() => {
    setCvtDrawer(!cvtDrawer);
  }, [cvtDrawer]);

  useEffect(() => {
    if (caseManagerData === undefined) {
      const updatedData = selectedVitalsList.map((e, i) => {
        return {
          ...e,
          systolic: e.blood_press ? e.blood_press.split("/")[0] : "",
          diastolic: e.blood_press ? e.blood_press.split("/")[1] : "",
        };
      });
      setVitalsData(updatedData);
    }
  }, [selectedVitalsList]);

  useEffect(() => {
    // const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    // setToken(token);
    if (token !== undefined) {
      try {
        var decoded = jwtDecode(token);
        setTokenData(decoded.result);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    // Only add a blank page if we don't have custom RX or templates selected
    if (pages.length === 0 && 
        (selectedTemplateId === 'none' || !selectedTemplateId) &&
        (!smartRxFilesData || smartRxFilesData.length === 0)) {
      handleAddPage();
    }
    if (smartRxFilesData?.length > 0) {
      setLoading(true);
      setSmartRxFiles(smartRxFilesData);
      
      // Load smartRx images and metadata
      loadRxImages();
      

    } else {
      // Prevent stale smartRx state from blocking template auto-load.
      setSmartRxFiles([]);
    }

    if(selectedTemplateId === "none" || !selectedTemplateId ){
      setIsCustomSSRX(false)
    } else{
      setIsCustomSSRX(true)
    }
  }, [selectedTemplateId, smartRxFilesData]);

  const toggleDeletePopup = () => {
    setShowDeletePopup((prev) => !prev);
  };

  const getCanvas = (id, index) => (
    <canvas
      key={id}
      id={id}
      width={720}
      height={980}
      className={`canvas-style ${
        selectedPage === index ? "canvas-active" : ""
      }`}
      ref={(el) => {
        if (el) {
          canvasRefs.current[id] = el;
          if (blankCanvasPreparedRef.current[id] === undefined) {
            blankCanvasPreparedRef.current[id] = false;
          }
          const ctx = configureCanvasContext(el.getContext("2d"));
          ctxGlobalRefs.current[id] = ctx;
        }
      }}
      onClick={() => handlePageChange(index)}
    />
  );

  useEffect(() => {
    if (pages.length > 0 && selectedPage !== null && selectedPage < pages.length) {
      selectedPageRef.current = pages[selectedPage]; // Update the ref when selectedPage changes
    }
  }, [selectedPage, refreshTrigger, selectedTemplateId, pages]);

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

  useEffect(() => {
    // Determine which draw function to use based on scenario
    const hasSmartRxImages = smartRxFiles?.length >= selectedPage + 1;
    const hasTemplateImages = selectedTemplateId && selectedTemplateId !== 'none';

    // Use editDraw if either smart RX or template images are loaded
    drawRef.current = (hasSmartRxImages || hasTemplateImages) ? editDraw : draw;
  }, [selectedPage, smartRxFiles, selectedTemplateId]);

  // Handles Websocket Connection
  const connectWebSocket = () => {
    // WebSocket initialization (reconnectingwebsocket : this package handles the reconnection)
    try {
      socketRef.current = new ReconnectingWebSocket(WEBSOCKET_ADDRESS, null, {debug: true, reconnectInterval: 3000});
      socketRef.current.onopen = () => {
        console.log("WebSocket connection opened");
        setConnected(true);
        setHasError(false); // Clear any previous error messages
      };
      socketRef.current.onclose = () => {
        console.log("WebSocket connection closed");
        setConnected(false);
      };
      socketRef.current.onmessage = (event) => {
        const o = event.data.split("|");
        drawRef.current(o[0], o[1], o[2], o[3], selectedPageRef.current);
      };
      socketRef.current.onerror = (error) => {
        // Handle WebSocket errors
        if (!hasError) {
          wsError(WEBSOCKET_ERROR_MESSAGE);
          setHasError(true); // Mark that an error has been displayed
        }
        console.log("WebSocket error", error);
      };
    } catch (error) {
      // Handle errors during WebSocket initialization
      console.error("WebSocket connection failed", error);
      wsError(WEBSOCKET_ERROR_MESSAGE);
    }
  };

  const handleAddPage = () => {
    
    // Prevent adding blank page if we have custom RX or templates selected
    if (selectedTemplateId && selectedTemplateId !== 'none') {
      return;
    }
    
    // Preserve canvas drawings for all existing pages before adding new page
    const preservedCanvasData = {};
    pages.forEach((pageId) => {
      const canvas = canvasRefs.current[pageId];
      if (canvas) {
        try {
          // Save the current canvas state as image data
          preservedCanvasData[pageId] = canvas.toDataURL();
        } catch (error) {
          console.error('Failed to preserve canvas data for page:', pageId, error);
        }
      }
    });
    
    // Store the preserved canvas data
    setCanvasImageData(preservedCanvasData);
    
    const newPageId = uuidv4();
    setPages([...pages, newPageId]);
    setDataPresentInCanvas([...dataPresentInCanvas, false]);
    blankCanvasPreparedRef.current[newPageId] = false;
    
    // Add page metadata using simple function - add at the end of pages array
    addPageMetadata(newPageId, pages.length, "blank", null);
    
    // Restore canvas drawings after the new page is added
    setTimeout(() => {
      restoreCanvasDrawings(preservedCanvasData);
    }, 100);
    
    if (pages.length === 0) {
      setSelectedPage(0);
    } else {
      setSelectedPage(pages.length);
      setTimeout(() => {
        newPageRef?.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100); // Adjust timeout as needed
    }
    setNewPageText("");
  };

  const handleDeletePage = (index) => {
    if (smartRxFiles) {
      setSmartRxFiles(
        smartRxFiles.filter((_, fileIndex) => fileIndex !== index)
      );
    }
    if (customRxImages) {
      setCustomRxImages(
        customRxImages.filter((_, fileIndex) => fileIndex !== index)
      );
    }
    
    // Preserve canvas drawings for remaining pages before deleting
    const preservedCanvasData = {};
    pages.forEach((pageId, pageIndex) => {
      if (pageIndex !== index) { // Don't preserve the page being deleted
        const canvas = canvasRefs.current[pageId];
        if (canvas) {
          try {
            // Save the current canvas state as image data
            preservedCanvasData[pageId] = canvas.toDataURL();
          } catch (error) {
            console.error('Failed to preserve canvas data for page:', pageId, error);
          }
        }
      }
    });
    
    // Store the preserved canvas data
    setCanvasImageData(preservedCanvasData);
    
    // Get the page ID that will be deleted
    const deletedPageId = pages[index];
    delete blankCanvasPreparedRef.current[deletedPageId];
    
    const newPages = pages.filter((_, pageIndex) => pageIndex !== index);
    setDataPresentInCanvas(
      dataPresentInCanvas.filter((_, pageIndex) => pageIndex !== index)
    );
    setPages(newPages);
    
      // Use simple function to delete page metadata
      deletePageMetadata(deletedPageId);
    
    // Restore canvas drawings after the page is deleted
    setTimeout(() => {
      restoreCanvasDrawings(preservedCanvasData);
    }, 100);
    
    setRefreshTrigger(!refreshTrigger);
    if (selectedPage >= newPages.length) {
      setSelectedPage(
        newPages.length ? Math.min(selectedPage, newPages.length - 1) : 0
      );
    }
  };

  const handlePageChange = (index) => {
    setSelectedPage(index);
  };

  const handleRefresh = () => {
    setSelectedPage(updatedIndex);
    setRefreshTrigger(!refreshTrigger);

    if ((smartRxFiles?.length >= selectedPage + 1) || (customRxImages?.length >= selectedPage + 1)) {
      setDrawFunction(true);
    }

    const canvas = canvasRefs.current[pages[updatedIndex]];
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      blankCanvasPreparedRef.current[pages[updatedIndex]] = true;
      ctx.beginPath();
      ctxGlobalRefs.current[pages[updatedIndex]] = ctx;
      canvasRefs.current[pages[updatedIndex]] = ctx;
    }
  };

  const handleClearAllPages = () => {
    // If fromRepeatRx is true, preserve original Rx pages and only clear pages added after
    if (fromRepeatRx && originalRxPagesCount > 0) {
      // Only clear pages that are not from the original Rx
      const pagesToKeep = pages.slice(0, originalRxPagesCount);
      const dataPresentToKeep = dataPresentInCanvas.slice(0, originalRxPagesCount);
      const metadataToKeep = pagesMetaData.slice(0, originalRxPagesCount);
      
      // Clear canvas refs only for pages after original Rx
      pages.slice(originalRxPagesCount).forEach((pageId) => {
        const canvas = canvasRefs.current[pageId];
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        delete canvasRefs.current[pageId];
        delete ctxGlobalRefs.current[pageId];
      });
      
      setPages(pagesToKeep);
      setDataPresentInCanvas(dataPresentToKeep);
      setPagesMetaData(metadataToKeep);
      setSelectedPage(Math.min(selectedPage, pagesToKeep.length - 1));
      return;
    }
    
    // Clear old canvas refs since we're resetting
    canvasRefs.current = {};
    ctxGlobalRefs.current = {};
    
    // Reload the selected template that was loaded on mount
    if (selectedTemplateId && selectedTemplateId !== 'none') {
      const selectedTemplate = getSelectedTemplateById(selectedTemplateId);
      if (selectedTemplate) {
        // Reload the template images - this will recreate pages and load template images
        void loadTemplateImages(selectedTemplate).catch((e) =>
          console.error("loadTemplateImages after clear all failed", e)
        );
        return; // Exit early after reloading template
      }
    }
    
    // Fallback: If no template is selected, reset to a single blank page
    setPages([pages[0]]);
    setDataPresentInCanvas([false]);
    setSelectedPage(0);
    
    // Reset pages metadata for the remaining page
    const remainingPageId = pages[0];
    const resetMetadata = [{
      page_order: 1,
      page_type: "template",
      template_page_index: 0,
      page_id: remainingPageId
    }];
    
    // Use the safe metadata setting function
    setMetadataSafely(resetMetadata, "handleClearAllPages");
    
    const canvas = canvasRefs.current[pages[0]];
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      blankCanvasPreparedRef.current[pages[0]] = true;
      ctx.beginPath();
    }
  };

  // Function to clear current page and reload template image
  const handleClearCurrentPage = async () => {

    const currentPageId = pages[selectedPage];
    const canvas = canvasRefs.current[currentPageId];
    
    if (canvas) {
      const ctx = canvas.getContext("2d");
      
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Determine page meta for smartRx edit flow
      const currentPageMeta = getPageMetadata(currentPageId);
      const templateImageIndex = currentPageMeta?.template_page_index;
      const isTemplateMetaPage = currentPageMeta?.page_type === "template";
      const isBlankMetaPage = currentPageMeta?.page_type === "blank";

      if (isTemplateMetaPage) {
        // This is a template page - try to reload template image first
        if (isTemplateSelected(selectedTemplateId)) {
          // We have the template loaded, use it
          const selectedTemplate = getSelectedTemplateById(selectedTemplateId);
          let templatePageSources = [];
          try {
            templatePageSources = await getTemplatePageSources(selectedTemplate);
          } catch (e) {
            console.error("handleClearCurrentPage: template sources failed", e);
          }
          const templateImage = templatePageSources[templateImageIndex || 0];
          if (templateImage) {
            const img = new Image();
            if (!String(templateImage).startsWith("data:")) {
              img.crossOrigin = "anonymous";
            }
            img.src = templateImage;
            img.onload = () => {
              configureCanvasContext(ctx);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              setImageRefs((prevState) => ({
                ...prevState,
                [currentPageId]: img,
              }));
              setImageLoaded((prevState) => ({
                ...prevState,
                [currentPageId]: true,
              }));
            };
            return; // Exit early after loading template image
          }
        }
        
        // If template loading failed or template not available, fallback to SmartRx image
        const smartRxImage = smartRxFiles[selectedPage]?.smart_prescription_file;
        if (smartRxImage) {
          const img = new Image();
          img.src = smartRxImage;
          img.crossOrigin = "anonymous";
          img.onload = () => {
            configureCanvasContext(ctx);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setImageRefs((prevState) => ({
              ...prevState,
              [currentPageId]: img,
            }));
            setImageLoaded((prevState) => ({
              ...prevState,
              [currentPageId]: true,
            }));
          };
        } else {
          // Last resort: white background
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else if (isBlankMetaPage) {
        // Reset to blank white page
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        blankCanvasPreparedRef.current[currentPageId] = true;
      } else {
        // Fallback: if no metadata available, reload smartRx image if exists
        const smartRxImage = smartRxFiles[selectedPage]?.smart_prescription_file;
        if (smartRxImage) {
          const img = new Image();
          img.src = smartRxImage;
          img.crossOrigin = "anonymous";
          img.onload = () => {
            configureCanvasContext(ctx);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setImageRefs((prevState) => ({
              ...prevState,
              [currentPageId]: img,
            }));
            setImageLoaded((prevState) => ({
              ...prevState,
              [currentPageId]: true,
            }));
          };
        } else {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      
      // Reset the drawing context
      ctx.beginPath();
      ctxGlobalRefs.current[currentPageId] = ctx;
    } else {
      console.error('⚠️ Canvas not found for page:', selectedPage);
    }
  };

  function draw(t, n, a, c, pageIndex) {
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Check if this is a template page or has smart RX images
    const hasSmartRxImages = smartRxFiles?.length >= pageIndex + 1;
    const hasTemplateImages = selectedTemplateId && selectedTemplateId !== 'none';
    const isTemplatePage = hasTemplateImages && getPageMetadata(pages[pageIndex])?.page_type === "template";
    
    // Only fill with white if this is NOT a template page and has no smart RX images
    if (!hasSmartRxImages && !isTemplatePage) {
      // Fill once per blank canvas to avoid full canvas repaint on every stroke.
      if (!blankCanvasPreparedRef.current[pageIndex]) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        blankCanvasPreparedRef.current[pageIndex] = true;
      }
    } 
    
    const p0 = hardwarePointToCanvas(t, n);
    const p1 = hardwarePointToCanvas(a, c);

    // Draw each incoming segment as an isolated path to avoid
    // cumulative re-stroking artifacts (jagged/darker edges).
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineJoin = ctx.lineCap = "round";
    ctx.stroke();
    if (!dataPresentInCanvas[selectedPage]) {
      let newDataPresentInCanvas = [...dataPresentInCanvas];
      newDataPresentInCanvas[selectedPage] = true;
      setDataPresentInCanvas(newDataPresentInCanvas);
    }
  }

  function editDraw(t, n, a, c, pageIndex) {
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return;
    const p0 = hardwarePointToCanvas(t, n);
    const p1 = hardwarePointToCanvas(a, c);

    ctxGlobalRefs.current[pageIndex].strokeStyle = "#000";
    ctxGlobalRefs.current[pageIndex].beginPath();
    ctxGlobalRefs.current[pageIndex].moveTo(p0.x, p0.y);
    ctxGlobalRefs.current[pageIndex].lineTo(p1.x, p1.y);
    ctxGlobalRefs.current[pageIndex].lineJoin = ctxGlobalRefs.current[
      pageIndex
    ].lineCap = "round";
    ctxGlobalRefs.current[pageIndex].stroke();
    if (!dataPresentInCanvas[selectedPage]) {
      let newDataPresentInCanvas = [...dataPresentInCanvas];
      newDataPresentInCanvas[selectedPage] = true;
      setDataPresentInCanvas(newDataPresentInCanvas);
    }
  }

  const convertCanvasToJPEG = (canvas) => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas to Blob conversion failed."));
        }
      }, "image/jpeg");
    });
  };

  
  const handleSubmit = async (versionNumber) => {
    const type = isCustomSSRX ? 1 : 0;
    const tokenData = getTokenData();
    const clinic = getClinic(profile?.hospital_data);
    window.Moengage.track_event("TP_SmartRx_Submit", {
      patient_id: patient_data?.patient_unique_id || "",
      patient_name: patient_data?.pm_fullname,
      doctor_id: profile?.doctor_unique_id,
      doctor_name: profile?.um_name,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      clinic_name: clinic?.hm_name,
      source: "Submit rx button",
      type: type,
      device_details: navigator.userAgent,
    });
    // Only get canvases that correspond to current pages
    const currentCanvasArray = pages.map(pageId => canvasRefs.current[pageId]).filter(
      (canvas) => canvas !== null
    );

    let blobs = [];
    let files = [];

    try {
      // Convert only current page canvases to JPEG blobs and files
      for (let i = 0; i < currentCanvasArray.length; i++) {
        const canvas = currentCanvasArray[i];
        if (!canvas) continue;
        const blob = await convertCanvasToJPEG(canvas);
        const name =
          smartRxFiles && smartRxFiles[i] && !fromRepeatRx
            ? smartRxFiles[i].smart_prescription_filename
            : `${uuidv4()}.jpeg`;
        // Create the File object
        const file = new File([blob], name, { type: "image/jpeg" });

        // Check if the file has meaningful content (not just a blank canvas)
        const hasContent = file.size > 5 * 1000; // 5KB threshold for meaningful content

        if (!hasContent && vitalsData.length === 0 && !followUpDate) {
          // Only show error if this is the first page and no other data exists
          if (i === 0) {
            errorMessage("Please fill your prescription to submit");
          }
          // Skip this page if it's blank and no other data
          continue;
        } else if (hasContent) {
          blobs.push(blob);
          files.push(new File([blob], name, { type: "image/jpeg" }));
        }
      }

      // // Convert all canvases to JPEG blobs and files
      // for (let i = 0; i < canvasArray.length; i++) {
      //   const canvas = canvasArray[i];
      //   if (!canvas) continue;
      //   const blob = await convertCanvasToJPEG(canvas);
      //   const name =
      //     smartRxFiles && smartRxFiles[i]
      //       ? smartRxFiles[i].smart_prescription_filename
      //       : `${uuidv4()}.jpeg`;
      //   // Create the File object
      //   const file = new File([blob], name, { type: "image/jpeg" });

      //   if (file.size < 5 * 1000 && vitalsData.length === 0 && !followUpDate) {
      //     errorMessage("Please fill your prescription to submit");
      //   } else if (file.size > 5 * 1000) {
      //     blobs.push(blob);
      //     files.push(new File([blob], name, { type: "image/jpeg" }));
      //   }
      // }
    } catch (error) {
      console.error("Error converting canvas to JPEG:", error);
      errorMessage("Failed to generate image, Please Submit again");
    }
    setLoader(true);
    // FormData to handle file upload
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append("smart_prescription_files", file);
      formData.append("smart_prescription_filename[]", file.name);
    });
    formData.append("doctor_unique_id", tokenData?.doctor_unique_id);
    formData.append("patient_unique_id", patient_data?.patient_unique_id);
    formData.append("um_id", String(userId));
    formData.append("buildNumber", versionNumber || "0");

    try {
      if (files.length > 0) {
        const response = await api.post(SMART_RX_UPLOAD, formData, baseUrl);
        const data = response?.message;
      }
      setSmartRxDetails(files || []);
      if (isAutofillSelected) {
        await setAddToRx({
          _id: symptomCollector?._id,
          addToRx: true,
        });
        dispatch(setSelectAutofill(false));
      }

      // Care plan assignment/update is handled post-submit in HeaderSmartPrescription
    } catch (error) {
      errorMessage("Error Uploading the prescription, Please try again");
      console.error("Error Submitting the prescription:", error);
    }
    setLoader(false);
  };

  const handleWrite = () => {
    setPrescription(true);
    connectWebSocket();
  };

  useEffect(() => {
    // Set the first page as the default selected page on initial render
    setSelectedPage(0);
    // this is to remove the click from the right container.
    handleWrite();

    if (smartRxFilesData?.length > 0) {
      imageLoad();
    }

    return () => {
      // Cleanup WebSocket connection on component unmount
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const openModal = (success, message) => {
    setShowModal(true);
    setUploadSuccess(success);
    setUploadMessage(message);
    setModalColor(success ? "green" : "red");
    // Start the progress animation
    if (success) {
      animateProgress();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    // Reset progress and success state when the modal is closed
    setProgress(0);
    setUploadSuccess(false);
  };

  const animateProgress = () => {
    // Simulate an upload process
    const duration = 2000;
    const interval = 10;
    const steps = duration / interval;

    let step = 0;

    const progressInterval = setInterval(() => {
      step++;
      const currentProgress = (step / steps) * 100;
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(progressInterval);

        // Show success message after reaching 100%
        setUploadSuccess(true);

        // Close the modal after a delay (you can adjust the delay as needed)
        setTimeout(() => {
          closeModal();
        }, 1500);
      }
    }, interval);
  };

  // Load images for the edit flow - now handled by loadRxImages
  const imageLoad = () => {
    // This function is now deprecated, use loadRxImages instead
    loadRxImages();
  };

  useEffect(() => {
    
    // Draw images on canvases when images are getting loaded
    pages.forEach((pageId) => {
      if (imageLoaded[pageId] && canvasRefs.current[pageId]) {
        // Only draw template images if they haven't been drawn before
        // This prevents overwriting user drawings when imageLoaded state changes
        const ctx = configureCanvasContext(canvasRefs.current[pageId].getContext("2d"));
        
        // Check if this canvas already has content (user drawings)
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const hasContent = imageData.data.some(pixel => pixel !== 0);
        
        if (!hasContent) {
          // Only draw template image if canvas is empty
          ctx.drawImage(imageRefs[pageId], 0, 0, ctx.canvas.width, ctx.canvas.height);
          ctxGlobalRefs.current[pageId] = ctx;
        }
      }
    });
    
    // Restore canvas drawings if we have preserved data
    if (Object.keys(canvasImageData).length > 0) {
      setTimeout(() => {
        restoreCanvasDrawings(canvasImageData);
        // Clear the preserved data after restoration
        setCanvasImageData({});
      }, 50);
    }
  }, [imageLoaded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (Object.values(showPageDropdown).some(show => show)) {
        setShowPageDropdown({});
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showPageDropdown]);

  // Function to handle page addition dropdown
  const handlePageDropdownToggle = (pageIndex, event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPageDropdownPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    setShowPageDropdown(prev => ({
      ...prev,
      [pageIndex]: !prev[pageIndex]
    }));
    
    // Update selected page to the current page index
    setSelectedPage(pageIndex);
  };

  // Function to add same canvas page (with current template or RX type)
  const handleAddSameCanvasPage = async (pageIndex) => {
    // Preserve canvas drawings for all existing pages before adding new page
    const preservedCanvasData = {};
    pages.forEach((pageId) => {
      const canvas = canvasRefs.current[pageId];
      if (canvas) {
        try {
          // Save the current canvas state as image data
          preservedCanvasData[pageId] = canvas.toDataURL();
        } catch (error) {
          console.error('Failed to preserve canvas data for page:', pageId, error);
        }
      }
    });
    
    // Store the preserved canvas data
    setCanvasImageData(preservedCanvasData);
    
    const newPageId = uuidv4();
    const newPages = [...pages];
    newPages.splice(pageIndex + 1, 0, newPageId);
    
    setPages(newPages);
    
    // Verify that the page was actually added
    setTimeout(() => {
      const currentPages = pages;
      const addedPage = currentPages.find(pageId => pageId === newPageId);
    }, 100);
    
    // Add data present flag for new page
    const newDataPresentInCanvas = [...dataPresentInCanvas];
    newDataPresentInCanvas.splice(pageIndex + 1, 0, true); // Set to true since it will have image
    setDataPresentInCanvas(newDataPresentInCanvas);
    
    // Get the current page's metadata
    const currentPageId = pages[pageIndex];
    const currentPageMeta = getPageMetadata(currentPageId);
    
    // Use simple function to add page metadata
    const pageType = currentPageMeta?.page_type || "blank";
    const templatePageIndex = currentPageMeta?.template_page_index;
    
    addPageMetadata(newPageId, pageIndex + 1, pageType, templatePageIndex);
    
    // Load the same image for the new page
    if (isTemplateSelected(selectedTemplateId) && currentPageMeta?.page_type === "template") {
      // For template images - use the same template image index as the current page
      const selectedTemplate = getSelectedTemplateById(selectedTemplateId);
      const currentTemplateImageIndex = currentPageMeta?.template_page_index || 0;

      let templatePageSources = [];
      try {
        templatePageSources = await getTemplatePageSources(selectedTemplate);
      } catch (e) {
        console.error("handleAddSameCanvasPage: template sources failed", e);
      }
      if (templatePageSources.length > currentTemplateImageIndex) {
        const imageToUse = templatePageSources[currentTemplateImageIndex];

        const img = new Image();
        if (imageToUse && !String(imageToUse).startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }
        img.src = imageToUse;
        img.onload = () => {
          setImageRefs((prevState) => ({
            ...prevState,
            [newPageId]: img,
          }));
          setImageLoaded((prevState) => ({
            ...prevState,
            [newPageId]: true,
          }));
          
          // Restore canvas drawings after the new page is loaded
          setTimeout(() => {
            restoreCanvasDrawings(preservedCanvasData);
          }, 100);
        };
      }
    } else if (smartRxFiles && smartRxFiles.length > 0) {
      // For smart RX files - use the same image as the current page
      const imageToUse = smartRxFiles[pageIndex]?.smart_prescription_file;
      
      if (imageToUse) {
        const img = new Image();
        img.src = imageToUse;
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setImageRefs((prevState) => ({
            ...prevState,
            [newPageId]: img,
          }));
          setImageLoaded((prevState) => ({
            ...prevState,
            [newPageId]: true,
          }));
          
          // Restore canvas drawings after the new page is loaded
          setTimeout(() => {
            restoreCanvasDrawings(preservedCanvasData);
          }, 100);
        };
      }
    }
    
    // Select the new page
    setSelectedPage(pageIndex + 1);
    
    // Close dropdown
    setShowPageDropdown(prev => ({
      ...prev,
      [pageIndex]: false
    }));
  };
  
  // Function to restore canvas drawings from preserved data
  const restoreCanvasDrawings = (preservedData) => {
    Object.keys(preservedData).forEach((pageId) => {
      const canvas = canvasRefs.current[pageId];
      if (canvas && preservedData[pageId]) {
        try {
          const ctx = canvas.getContext("2d");
          
          // Create a new image from the preserved data
          const img = new Image();
          img.onload = () => {
            // Clear the canvas first
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the preserved image data back to the canvas
            ctx.drawImage(img, 0, 0);
            
            // Update the global context reference
            ctxGlobalRefs.current[pageId] = ctx;
          };
          img.src = preservedData[pageId];
        } catch (error) {
          console.error('Failed to restore canvas data for page:', pageId, error);
        }
      }
    });
  };

  // Function to add blank page
  const handleAddBlankPage = (pageIndex) => {
    // Preserve canvas drawings for all existing pages before adding new page
    const preservedCanvasData = {};
    pages.forEach((pageId) => {
      const canvas = canvasRefs.current[pageId];
      if (canvas) {
        try {
          // Save the current canvas state as image data
          preservedCanvasData[pageId] = canvas.toDataURL();
        } catch (error) {
          console.error('Failed to preserve canvas data for page:', pageId, error);
        }
      }
    });
    
    // Store the preserved canvas data
    setCanvasImageData(preservedCanvasData);
    
    const newPageId = uuidv4();
    const newPages = [...pages];
    newPages.splice(pageIndex + 1, 0, newPageId);
    setPages(newPages);
    blankCanvasPreparedRef.current[newPageId] = false;
    
    // Add data present flag for new page
    const newDataPresentInCanvas = [...dataPresentInCanvas];
    newDataPresentInCanvas.splice(pageIndex + 1, 0, false);
    setDataPresentInCanvas(newDataPresentInCanvas);
    
    // Use simple function to add page metadata
    addPageMetadata(newPageId, pageIndex + 1, "blank", null);
    
    // Initialize the new canvas with white background
    setTimeout(() => {
      const newCanvas = canvasRefs.current[newPageId];
      if (newCanvas) {
        const ctx = newCanvas.getContext('2d');
        // Fill with white background
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        blankCanvasPreparedRef.current[newPageId] = true;
      }
      
      // Restore canvas drawings after the new page is added
      restoreCanvasDrawings(preservedCanvasData);
    }, 100);
    

    
    // Select the new page
    setSelectedPage(pageIndex + 1);
    
    // Close dropdown
    setShowPageDropdown(prev => ({
      ...prev,
      [pageIndex]: false
    }));
  };

  // Function to check if we should show the + button on all pages
  const shouldShowAddButtonOnAllPages = () => {
    return isTemplateSelected(selectedTemplateId) || (smartRxFiles && smartRxFiles.length > 0);
  };

  // Helper function to get page metadata by page ID
  // Returns metadata with page_type: "template" or "blank"
  const getPageMetadata = (pageId) => {
    return pagesMetaData.find(page => page.page_id === pageId);
  };

  // Function to check if a specific page is a template page
  const isTemplatePage = (pageIndex) => {
    const pageId = pages[pageIndex];
    // A page is a template page if it has template metadata defined
    const pageMeta = getPageMetadata(pageId);
    return pageMeta?.page_type === "template" && pageMeta?.template_page_index !== undefined;
  };

  // Function to check if a specific page is a blank page
  const isBlankPage = (pageIndex) => {
    const pageId = pages[pageIndex];
    const pageMeta = getPageMetadata(pageId);
    return pageMeta?.page_type === "blank";
  };

  // Function to check if a specific page is a smartRx page (legacy - now just checks if it's not blank)
  const isSmartRxPage = (pageIndex) => {
    const pageId = pages[pageIndex];
    const pageMeta = getPageMetadata(pageId);
    // Since we only have template or blank, smartRx pages are essentially template pages
    return pageMeta?.page_type === "template";
  };

  // Function to get the current pages metadata structure
  const getCurrentPagesMetadata = () => {
    return pagesMetaData;
  };

  // Simplified function to set metadata - used for backend sync operations
  const setMetadataSafely = (newMetadata, reason = "manual") => {
    setPagesMetaData(newMetadata);
  };

  // Function to get page metadata by page index
  const getPageMetadataByIndex = (pageIndex) => {
    if (pageIndex < 0 || pageIndex >= pages.length) return null;
    const pageId = pages[pageIndex];
    return getPageMetadata(pageId);
  };

  // Function to update page metadata
  const updatePageMetadata = (pageId, updates) => {
    setPagesMetaData(prev => {
      const updated = prev.map(page => 
        page.page_id === pageId 
          ? { ...page, ...updates }
          : page
      );
      
      return updated;
    });
  };

  // Function to reorder pages metadata (useful for drag and drop)
  const reorderPagesMetadata = (startIndex, endIndex) => {
    setPagesMetaData(prev => {
      const newMetaData = [...prev];
      const [removed] = newMetaData.splice(startIndex, 1);
      newMetaData.splice(endIndex, 0, removed);
      
      // Update page_order for all pages
      return newMetaData.map((page, index) => ({
        ...page,
        page_order: index + 1
      }));
    });
  };

  // Function to validate and fix pages metadata structure
  const validatePagesMetadata = () => {
    // CRITICAL: If we're editing backend data, NEVER run validation
    if (isEditingBackendData) {
      console.log("validatePagesMetadata: SKIPPING - we're editing backend data, preserving original metadata");
      return;
    }
    
    // CRITICAL: If we have backend metadata, don't override it with defaults
    if (hasBackendMetadata() && doPagesMatchBackendMetadata()) {
      console.log("validatePagesMetadata: Backend metadata exists and matches, preserving it");
      return; // Don't run validation if backend metadata is correct
    }
    
    setPagesMetaData(prev => {
      const validMetaData = [];
      
      pages.forEach((pageId, index) => {
        const existingMeta = prev.find(meta => meta.page_id === pageId);
        
        if (existingMeta) {
          // Preserve all existing metadata, only update page_order if it's incorrect
          // NEVER change page_type or template_page_index for existing pages
          validMetaData.push({
            ...existingMeta,
            page_order: index + 1
          });
        } else {
          // Only create default metadata for truly missing pages
          // Don't infer template type - let the specific functions handle that
          const defaultMeta = {
            page_order: index + 1,
            page_type: "blank", // Default to blank for missing pages
            page_id: pageId
          };
          validMetaData.push(defaultMeta);
        }
      });
      
      return validMetaData;
    });
  };

  // Function to get pages metadata in the requested format (without page_id)
  const getPagesMetadataForExport = () => {
    return pagesMetaData.map(({ page_id, ...metadata }) => metadata);
  };

  // Function to check if we have backend metadata for smartRx files
  const hasBackendMetadata = () => {
    // Check for nested custom_ss_data structure
    const pages = caseManagerData?.custom_ss_data?.custom_ss_data?.pages || caseManagerData?.custom_ss_data?.pages;
    const hasData = pages && Array.isArray(pages) && pages.length > 0;
    
    // Set the editing flag if we have backend data
    if (hasData && !isEditingBackendData) {
      setIsEditingBackendData(true);
    } else if (!hasData && isEditingBackendData) {
      setIsEditingBackendData(false);
    }

    return hasData;
  };

  // Function to get backend metadata for a specific page
  const getBackendPageMetadata = (pageIndex) => {
    if (!hasBackendMetadata()) return null;
    const pages = caseManagerData?.custom_ss_data?.custom_ss_data?.pages || caseManagerData?.custom_ss_data?.pages;
    return pages[pageIndex];
  };

  // Function to sync current metadata with backend metadata
  const syncMetadataWithBackend = () => {
    if (hasBackendMetadata()) {
      const backendPages = caseManagerData?.custom_ss_data?.custom_ss_data?.pages || caseManagerData?.custom_ss_data?.pages;
      if (pages.length === backendPages.length) {
        // CRITICAL: Only sync if current metadata is wrong or missing
        if (pagesMetaData.length === 0 || !doPagesMatchBackendMetadata()) {
          const syncedMetadata = backendPages.map((meta, index) => {
            return {
              page_order: meta.page_order || index + 1,
              page_type: meta.page_type || "blank", // Default to blank, not smartRx
              template_page_index: meta.template_page_index,
              page_id: pages[index] || uuidv4()
            };
          });
          setMetadataSafely(syncedMetadata, "syncMetadataWithBackend");
          return true;
        } else {
          return true; // Return true to prevent fallback to validation
        }
      }
    }
    return false;
  };

  // Function to check if current pages match backend metadata
  const doPagesMatchBackendMetadata = () => {
    if (!hasBackendMetadata()) return false;
    const backendPages = caseManagerData?.custom_ss_data?.custom_ss_data?.pages || caseManagerData?.custom_ss_data?.pages;
    const matches = pages.length === backendPages.length;
    return matches;
  };

  // Function to prepare metadata for submission to backend
  const prepareMetadataForSubmission = () => {
    
    // Format metadata for submission as custom_ss_data structure
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    
    const submissionData = {
      custom_ss_data: {
        template_id: selectedTemplateId || null,
        template_title: selectedTemplate?.title || null,
        pages: getPagesMetadataForExport()
      }
    };
        
    return submissionData;
  };

  // Function to get current template information
  const getCurrentTemplateInfo = () => {
    if (selectedTemplateId && selectedTemplateId !== 'none') {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      return {
        template_id: selectedTemplateId,
        template_title: selectedTemplate?.title || 'Unknown Template'
      };
    }
    return null;
  };

  // Function to check if we're using a custom template
  const isUsingCustomTemplate = () => {
    return selectedTemplateId && selectedTemplateId !== 'none';
  };

  // Function to update selected template from backend data
  const updateSelectedTemplateFromBackend = () => {
    if (caseManagerData?.custom_ss_data?.custom_ss_data?.template_id || caseManagerData?.custom_ss_data?.template_id) {
      const templateId = caseManagerData?.custom_ss_data?.custom_ss_data?.template_id || caseManagerData?.custom_ss_data?.template_id;
      const templateTitle = caseManagerData?.custom_ss_data?.custom_ss_data?.template_title || caseManagerData?.custom_ss_data?.template_title;
            
      // Update the selected template ID and title
      setSelectedTemplateId(templateId);
      
      // If we have a template title, we might want to update the templates list
      // or ensure the template is loaded
      if (templateId && templateId !== 'none') {
        setIsCustomSSRX(true);
      }
      
      return true;
    }
    return false;
  };

  // Function to handle disclaimer close
  const handleDisclaimerClose = () => {
    setShowDisclaimer(false);
    localStorage.setItem('customRxDisclaimerDismissed', 'true');
  };
  // Add debug functions globally for manual debugging
  useEffect(() => {
    window.syncSmartPrescriptionMetadata = syncMetadata;
    window.updateSmartPrescriptionMetadata = updatePagesMetadata;
    window.checkPageIdSync = checkPageIdSync;
    
    // Cleanup on unmount
    return () => {
      delete window.syncSmartPrescriptionMetadata;
      delete window.updateSmartPrescriptionMetadata;
      delete window.checkPageIdSync;
    };
  }, []);

  // Simple function to update pagesMetaData when pages change
  const updatePagesMetadata = () => {
    // If we have backend metadata and we're editing, don't override it
    if (isEditingBackendData && hasBackendMetadata()) {
      console.log("updatePagesMetadata: Skipping - we have backend metadata to preserve");
      return;
    }
    
    const newMetadata = pages.map((pageId, index) => {
      // Find existing metadata for this page
      const existingMeta = pagesMetaData.find(meta => meta.page_id === pageId);
      
      if (existingMeta) {
        // Keep existing metadata but update page_order
        // Ensure blank pages have null template_page_index
        const updatedMeta = {
          ...existingMeta,
          page_order: index + 1
        };
        
        if (updatedMeta.page_type === "blank") {
          updatedMeta.template_page_index = null;
        }
        
        return updatedMeta;
      } else {
        // Create new metadata for new pages
        return {
          page_order: index + 1,
          page_type: "blank", // Default type
          template_page_index: null,
          page_id: pageId
        };
      }
    });

    setPagesMetaData(newMetadata);
  };

  // Function to add page metadata
  const addPageMetadata = (newPageId, pageIndex, pageType = "blank", templatePageIndex = null) => {
    // For blank pages, ensure template_page_index is null
    const finalTemplatePageIndex = pageType === "blank" ? null : templatePageIndex;
    
    const newPageMeta = {
      page_order: pageIndex + 1,
      page_type: pageType,
      template_page_index: finalTemplatePageIndex,
      page_id: newPageId
    };

    // Insert new metadata at the correct position
    let newMetaData = [...pagesMetaData];
    
    newMetaData.splice(pageIndex, 0, newPageMeta);
    
    // Update page_order for all subsequent pages
    for (let i = pageIndex + 1; i < newMetaData.length; i++) {
      newMetaData[i].page_order = i + 1;
    }

    setPagesMetaData(newMetaData);
  };

  // Function to delete page metadata
  const deletePageMetadata = (deletedPageId) => {
    // Remove the deleted page metadata
    const newMetaData = pagesMetaData.filter(page => page.page_id !== deletedPageId);
    
    // Update page_order for remaining pages
    const updatedMetaData = newMetaData.map((page, index) => ({
      ...page,
      page_order: index + 1
    }));

    setPagesMetaData(updatedMetaData);
  };

  return (
    <CashManagerContext.Provider value={contextApi}>
      <>
        <HeaderSmartPrescription
          isVaccinationEnabled={isVaccinationAccessable}
          isGrowthChartEnabled={isGrowthChartAccessable}
          prescription={prescription}
          onClear={handleClearAllPages}
          onSubmit={handleSubmit}
          smartRxData={smartRxDetails}
          loader={loader}
          caseManagerData={caseManagerData}
          isCustomSSRX={isCustomSSRX}
          selectedTemplateId={selectedTemplateId}
          prepareMetadataForSubmissionData={prepareMetadataForSubmission()}
          selectedCarePlan={selectedCarePlan}
          hasExistingCarePlan={hasExistingCarePlan}
          setBuildNumber={setBuildNumber}
          handleVideoConsult={isVideoConsultAvailable ? handleVideoConsult : null}
          isVideoConsultLoading={isInitiatingCall}
          showTeleconsultIcon={!!isTeleConsultAvailableType2}
          onTeleconsultClick={handleTeleconsultClick}
          isTeleconsultJoinLoading={isTeleconsultJoinLoading}
          isTeleconsultActive={!!joinToken}
        />
        
        {loading && <FullPageLoader />}
        <div className="w-100 bg-body wrapper2 prescription-wrapper">
          <div className="row">
            <div
              className="col-lg-4 col-md-12 col-12"
              style={{
                marginLeft: "3rem",
                height: "100vh" /* Full height for independent scrolling */,
              }}
            >
              {isSmartSyncCVTAccessableFromGB && (
                <div className="know-more-cvt p-14">
                  <div className="sparkle">
                    <LoopingVideo
                      webm={sparkleWebm}
                      mp4={sparkleMp4}
                      className="sparkel-loader"
                      ariaLabel="Loading"
                    />
                    <img
                      src={textLogo}
                      alt="textLogo"
                      className="text-logo-white"
                    />
                  </div>
                  <div className="title-common">
                    <div>
                      <span className="me-2">
                        AI-Powered Smart Rx Digitisation
                      </span>
                      <span className="new-btn">New</span>
                    </div>
                    <button
                      className="know-more-btn"
                      onClick={handleDrawerCvtKnowMore}
                    >
                      View Tips
                    </button>
                  </div>
                </div>
              )}
              {/* add symptoms box if there is symptoms in SC */}
              {isAutofillSelected &&
                selectedSymptomsCollector?.symptoms?.length > 0 && (
                  <div className="prescription-box-sm p-14">
                    <div className="d-flex align-items-center">
                      <img src={symptomsImg} alt="symptoms" className="me-2" />
                      <div className="title-common">Symptoms</div>
                      <Tooltip
                        title={
                          <div>
                            The{" "}
                            <strong style={{ fontWeight: 600 }}>
                              symptoms
                            </strong>{" "}
                            shared by the patient is just for reference. To
                            include it in the{" "}
                            <strong style={{ fontWeight: 600 }}>Rx</strong>, you
                            have to
                            <strong style={{ fontWeight: 600 }}>
                              {" "}
                              write it manually using Smartsync.
                            </strong>
                          </div>
                        }
                        overlayClassName="sc-tooltip"
                        placement="topLeft"
                      >
                        <div
                          className="d-flex align-items-center justify-content-center gap-1"
                          style={{
                            backgroundColor: "rgba(181, 181, 255, 0.4)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginLeft: "4px",
                          }}
                        >
                          <span
                            className="text-primary"
                            style={{
                              fontSize: "14px",
                            }}
                          >
                            For reference only
                          </span>
                          <i
                            class="icon-info"
                            style={{
                              color: "#4B4AD5",
                              fontSize: 14,
                            }}
                          />
                        </div>
                      </Tooltip>
                    </div>

                    <div className="mt-3">
                      {selectedSymptomsCollector?.symptoms
                        ?.slice(0, showAllSymptoms ? undefined : 2)
                        .map((symptomsData, index) => (
                          <div className="symptoms-box mb-2">
                            <div className="symptoms-box-left">
                              <span
                                className="backbar"
                                style={{ fontSize: "14px" }}
                              >
                                • {symptomsData.name}
                                {symptomsData.duration &&
                                  ` (${symptomsData.duration}`}
                                {symptomsData.severity &&
                                  `, ${symptomsData.severity}`}
                                {symptomsData.notes &&
                                  `, ${symptomsData.notes}`}
                                {(symptomsData.duration ||
                                  symptomsData.severity ||
                                  symptomsData.notes) &&
                                  ")"}
                                {index === 1 &&
                                  !showAllSymptoms &&
                                  selectedSymptomsCollector?.symptoms?.length >
                                    2 && (
                                    <button
                                      className="btn-link text-primary ms-1"
                                      style={{
                                        border: "none",
                                        background: "none",
                                        padding: 0,
                                        textDecoration: "underline",
                                        display: "inline",
                                      }}
                                      onClick={() =>
                                        setShowAllSymptoms(!showAllSymptoms)
                                      }
                                    >
                                      {showAllSymptoms
                                        ? "View less"
                                        : "View more"}
                                    </button>
                                  )}
                              </span>
                            </div>
                          </div>
                        ))}

                      {showAllSymptoms &&
                        selectedSymptomsCollector?.symptoms?.length > 2 && (
                          <button
                            className="btn-link text-primary"
                            style={{
                              border: "none",
                              background: "none",
                              padding: 0,
                              textDecoration: "none",
                            }}
                            onClick={() => setShowAllSymptoms(false)}
                          >
                            View less
                          </button>
                        )}
                    </div>
                  </div>
                )}
              {showSCBanner && (
                <SCBanner handleBanner={() => setShowSCBanner(false)} />
              )}
              {CUSTOMIZED_PAD_LEFT_LIST()}
              {selectedSymptomsCollector?.notes && (
                <div className="prescription-box-sm p-14">
                  <div style={{ padding: "6px" }}>
                    <div className="d-flex align-items-center mb-14">
                      <img className="me-3" src={others} alt="others" />
                      <div className="title-common">Additional Notes</div>
                      <Tooltip
                        title={
                          <div>
                            The{" "}
                            <strong style={{ fontWeight: 600 }}>
                              Additional Notes
                            </strong>{" "}
                            shared by the patient is just for reference. To
                            include it in the{" "}
                            <strong style={{ fontWeight: 600 }}>Rx</strong>, you
                            have to
                            <strong style={{ fontWeight: 600 }}>
                              {" "}
                              write it manually using Smartsync.
                            </strong>
                          </div>
                        }
                        overlayClassName="sc-tooltip"
                        placement="topLeft"
                      >
                        <div
                          className="d-flex align-items-center justify-content-center gap-1"
                          style={{
                            backgroundColor: "rgba(181, 181, 255, 0.4)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginLeft: "4px",
                          }}
                        >
                          <span
                            className="text-primary"
                            style={{
                              fontSize: "14px",
                            }}
                          >
                            For reference only
                          </span>
                          <i
                            class="icon-info"
                            style={{
                              color: "#4B4AD5",
                              fontSize: 14,
                            }}
                          />
                        </div>
                      </Tooltip>
                    </div>
                    <div
                      className="d-flex calender-merge-input mt-3"
                      style={{ fontSize: 14 }}
                    >
                      {selectedSymptomsCollector?.notes}
                    </div>
                  </div>
                </div>
              )}
              { !isCvtExtHosAccessableFromGB &&
                <div className="prescription-box-sm p-14">
                  <SmartRxFollowUpBox />
                </div>
              }
            </div>
            <div
              className="col-lg-8 col-md-12 col-12 mt-lg-0 mt-3"
              style={{
                width: "61%",
                height: "100%",
                marginLeft: "10px",
              }}
            >
              <div>
                {/* Custom Canvas Section */}
                { smartRxFilesData?.length === 0 || smartRxFilesData === undefined &&
                  <CustomCanvasSelector
                    templates={templates}
                    selectedTemplateId={selectedTemplateId}
                    onTemplateSelect={handleTemplateSelect}
                    onAddEditCanvas={handleAddEditCanvas}
                    onUploadNew={handleUploadNewTemplate}
                    onKnowMore={handleKnowMoreDrawer}
                  />
                }

                <div
                  id="pdf"
                  style={{ border: prescription ? "none" : "lightgrey" }}
                >
                  {pages.map((page, index) => (
                    <div
                      key={page}
                      className="canvas-container"
                      ref={index === pages.length - 1 ? newPageRef : null}
                    >
                      <div
                        className={`canvas-header ${
                          selectedPage === index ? "active-page" : ""
                        }`}
                      >
                        <div className="canvas-header-left">
                          <span>Page {index + 1}</span>
                          {selectedPage === index && (
                            <span className="selected-text">Selected</span>
                          )}
                        </div>
                        <div className="d-flex">
                          <button
                            className="btn d-flex align-items-center btn-text"
                            disabled={fromRepeatRx && index < originalRxPagesCount}
                            onClick={() => {
                              // Prevent clearing original Rx pages when fromRepeatRx is true
                              if (fromRepeatRx && index < originalRxPagesCount) {
                                return;
                              }
                              toggleDeletePopup();
                              setIsClearPopup(true);
                              handlePageChange(index)
                              setDeletePopupMsg(
                                `Are you sure you want to clear page ${
                                  index + 1
                                } data`
                              );
                              setUpdatedIndex(index);
                            }}
                            style={fromRepeatRx && index < originalRxPagesCount ? { opacity: 0.5, cursor: 'not-allowed', border: 'none' } : {}}
                          >
                            <i className="icon-reload me-2 fs-5" />
                          </button>
                          {pages.length > 1 && (
                            <button
                              className="btn d-flex align-items-center btn-text"
                              disabled={fromRepeatRx && index < originalRxPagesCount}
                              onClick={() => {
                                // Prevent deleting original Rx pages when fromRepeatRx is true
                                if (fromRepeatRx && index < originalRxPagesCount) {
                                  return;
                                }
                                toggleDeletePopup();
                                setIsClearPopup(false);
                                setDeletePopupMsg(
                                  `Are you sure you want to delete page ${
                                    index + 1
                                  } data`
                                );
                                setUpdatedIndex(index);
                              }}
                              style={fromRepeatRx && index < originalRxPagesCount ? { opacity: 0.5, cursor: 'not-allowed', border: 'none' } : {}}
                            >
                              <i className="icon-delete me-2 fs-5" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Disclaimer for first page of templates */}
                      {index === 0 && showDisclaimer && isTemplateSelected(selectedTemplateId) && (
                        <div className="cvt-info" style={{
                          backgroundColor: "#FEF4E6",
                          padding: "14px 16px",
                          margin: "0",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          borderLeft: "2px solid #BA7DE9",
                          borderRight: "2px solid #BA7DE9",
                          borderTop: "1px solid #E2E2EA",
                          borderRadius: "0",
                          width: "720px"
                        }}>
                          <i className="icon-info" style={{ color: "#FF8C00", fontSize: "18px", flexShrink: "0" }}></i>
                          <span className="cvt-info-text" style={{ 
                            fontSize: "14px", 
                            color: "#333",
                            flex: "1",
                            lineHeight: "1.5"
                          }}>
                            <span style={{ fontWeight: "bold" }}>Disclaimer:</span> If the digital output doesn't align correctly with the canvas, please ensure the Rx paper is properly placed on the Smart Sync pad.
                          </span>
                          <i 
                            className='icon-Cross' 
                            style={{
                              color: "#FF8C00", 
                              fontSize: "18px",
                              cursor: "pointer",
                              padding: "4px",
                              flexShrink: "0"
                            }}
                            onClick={handleDisclaimerClose}
                          ></i>
                        </div>
                      )}
                      {getCanvas(page, index)}
                      <div
                        className={`canvas-footer ${
                          selectedPage === index ? "active-page" : ""
                        }`}
                      >
                        {/* Show + button based on RX type */}
                        {(index === pages.length - 1 || shouldShowAddButtonOnAllPages()) && (
                          <div style={{ position: "relative" }}>
                            <button
                              className="btn d-flex align-items-center justify-content-center newpage-btn"
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "12px",
                                backgroundColor: "#f0f0ff",
                                border: "none",
                                cursor: "pointer",
                                color: "#6b46c1",
                                fontSize: "18px",
                                fontWeight: "bold",
                                boxShadow: "0 2px 4px rgba(107, 70, 193, 0.2)",
                                transition: "all 0.2s ease",
                                position: "relative",
                                zIndex: 1001
                              }}
                              onClick={(e) => {
                                // Show dropdown if we have custom RX or templates, or if this is a template page
                                if (selectedTemplateId && selectedTemplateId !== 'none') {
                                  handlePageDropdownToggle(index, e);
                                } else {
                                  // Only add blank page if no custom RX or template is selected
                                  handleAddPage();
                                }
                              }}
                            >
                              <i className="icon-Add" style={{ fontSize: "20px" }} />
                              {newPageText && (
                                <span style={{
                                  position: "absolute",
                                  top: "-30px",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  backgroundColor: "#333",
                                  color: "white",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  whiteSpace: "nowrap",
                                  zIndex: 1002
                                }}>
                                  {newPageText}
                                </span>
                              )}
                            </button>
                            
                            {/* Dropdown for RX pages */}
                            {shouldShowAddButtonOnAllPages() && showPageDropdown[index] && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "calc(100% + 8px)",
                                  right: "0",
                                  backgroundColor: "white",
                                  border: "1px solid #e1e5e9",
                                  borderRadius: "12px",
                                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                  zIndex: 1000,
                                  minWidth: "15rem",
                                  padding: "8px 0",
                                  backdropFilter: "blur(10px)"
                                }}
                              >
                                {/* Show "Add Same Canvas Page" only for template pages */}
                                {isTemplatePage(index) && (
                                  <button
                                    className="btn w-100 text-start border-0"
                                    style={{
                                      fontSize: "14px",
                                      padding: "12px 16px",
                                      color: "#333",
                                      backgroundColor: "transparent",
                                      transition: "background-color 0.2s ease",
                                      fontWeight: "500"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.backgroundColor = "#f8f9fa";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.backgroundColor = "transparent";
                                    }}
                                    onClick={() => handleAddSameCanvasPage(index)}
                                  >
                                    Add Same Canvas Page
                                  </button>
                                )}
                                {/* Always show "Add Blank Page" */}
                                <button
                                  className="btn w-100 text-start border-0"
                                  style={{
                                    fontSize: "14px",
                                    padding: "12px 16px",
                                    color: "#333",
                                    backgroundColor: "transparent",
                                    transition: "background-color 0.2s ease",
                                    fontWeight: "500"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = "#f8f9fa";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "transparent";
                                  }}
                                  onClick={() => handleAddBlankPage(index)}
                                >
                                  Add Blank Page
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleDrawerVital}
          open={vitalDrawer}
          className="modalWidth-700"
          width="auto"
        >
          <VitalsBox
            handleDrawerVital={handleDrawerVital}
            handleCollapsed={(flag) => handleCollapsed(flag)}
          />
        </Drawer>
        <Drawer
          closeIcon={false}
          // placement="right"
          onClose={handleDrawerCvtKnowMore}
          open={cvtDrawer}
          className=".modalWidth-800"
          width={800}
        >
          <CvtKnowMore
            handleDrawerCvtKnowMore={handleDrawerCvtKnowMore}
            handleCollapsed={(flag) => handleCollapsed(flag)}
          />
        </Drawer>
        
        {/* Upload RX Template Drawer */}
        <RxTemplateUploadDrawer
          visible={uploadCanvasDrawer}
          onClose={handleDrawerUploadCanvas}
          onSave={handleCanvasUploaded}
        />

        {/* Template Manager Drawer */}
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={() => setTemplateManagerDrawer(false)}
          open={templateManagerDrawer}
          width="50%"
        >
          <RxTemplateManager
            onClose={() => setTemplateManagerDrawer(false)}
            templates={templates}
            onUploadNew={handleUploadNewTemplate}
            onEdit={handleEditTemplate}
            onDelete={handleDeleteTemplate}
            onDownload={handleDownloadTemplate}
            onRefresh={() => loadCustomTemplates(true)}
            downloadingTemplateId={downloadingTemplateId}
          />
        </Drawer>

        {/* Edit Template Modal */}
        <EditTemplateModal
          visible={editTemplateModal}
          onClose={() => {
            setEditTemplateModal(false);
            setTemplateToEdit(null);
            setTemplateManagerDrawer(true); // Reopen template manager
          }}
          template={templateToEdit}
          onSave={handleEditSave}
        />
        {vitalDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerVital}
            open={vitalDrawer}
            className="modalWidth-700"
            width="auto"
          >
            <VitalsBox
              handleDrawerVital={handleDrawerVital}
              handleCollapsed={(flag) => handleCollapsed(flag)}
              isGrowthChart={isGrowthChart}
            />
          </Drawer>
        )}
        <Drawer
          className="scroll-y-hidden"
          closeIcon={false}
          placement="right"
          onClose={handleDrawerMedicalHistory}
          open={medicalHistoryDrawer}
          width="75%"
        >
          <MedicalHistoryBox
            handleDrawerMedicalHistory={handleDrawerMedicalHistory}
            handleCollapsed={(flag) => handleCollapsed(flag)}
            onSave={handleSaveGynecHistory}
          />
        </Drawer>
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleDrawerPrivateNotes}
          open={privateNotesDrawer}
          className="modalWidth-563"
          width="auto"
        >
          <PrivateNotesBox
            handleDrawerPrivateNotes={handleDrawerPrivateNotes}
            handleCollapsed={(flag) => handleCollapsed(flag)}
            selectPrivateNotes={selectPrivateNotes}
          />
        </Drawer>
        {vaccinationDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerVaccination}
            open={vaccinationDrawer}
            width="100%"
          >
            <Vaccination handleDrawerVaccination={handleDrawerVaccination} source={chartType ? "Patient Details" : "Smart Rx"} />
          </Drawer>
        )}
        {growthDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerGrowth}
            open={growthDrawer}
            width="100%"
            push={false}
          >
            <GrowthChart handleDrawerVaccination={handleDrawerGrowth} />
          </Drawer>
        )}
        {obstetricDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerObstetric}
            open={obstetricDrawer}
            width="100%"
            push={false}
            zIndex={100}
          >
            <Obstetric obstetricDetails={obstetricDetails} obstetricDrawer={obstetricDrawer} handleDrawerObstetric={handleDrawerObstetric} handleDrawerMedicalReport={handleDrawerMedicalReport} />
          </Drawer>
        )}
        {uploadDocDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            bodyStyle={{ backgroundColor: "white" }}
            onClose={handleDeletePopup}
            open={uploadDocDrawer}
            className="modalWidth-700"
            width="auto"
            push={false}
          >
            <UploadDocument
              onClose={handleDeletePopup}
              handleDrawerUploadDoc={handleDrawerUploadDoc}
              shouldShowDeletePopup={shouldShowDeletePopup}
              setShowDeletePopup={setShowDeletePopup}
              filesData={filesData}
              setFilesData={setFilesData}
              isEditDocument={isEditDocument}
              setIsEditDocument={setIsEditDocument}
            />
          </Drawer>
        )}
        {medicalReportDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            bodyStyle={{ backgroundColor: "white" }}
            onClose={handleDrawerMedicalReport}
            open={medicalReportDrawer}
            width="50%"
            push={false}
          >
            <MedicalRecords
              medicalReportDrawer={medicalReportDrawer}
              onClose={handleDrawerMedicalReport}
              handleDrawerUploadDoc={handleDrawerUploadDoc}
              setFilesData={setFilesData}
              setIsEditDocument={setIsEditDocument}
              setUploadDocDrawer={setUploadDocDrawer}
            />
          </Drawer>
        )}
        {addlabparamsDrawer && (
          <Drawer
            closeIcon={false}
            width={880}
            placement="right"
            open={addlabparamsDrawer}
            onClose={showHideBackModal}
            bodyStyle={{ backgroundColor: "white" }}
          >
            <LabParams
              handleAddLabParamsDrawer={handleAddLabParamsDrawer}
              patient_unique_id={patient_data?.patient_unique_id}
              onSave={handleLabParamsUpdate}
              isBackModalOpen={isBackModalOpen}
              showHideBackModal={showHideBackModal}
              patientGender={patient_data?.pm_gender}
            />
          </Drawer>
        )}
        {viewlabparamsDrawer && (
          <Drawer
            closeIcon={false}
            className="modalWidth-700"
            placement="right"
            open={viewlabparamsDrawer}
            bodyStyle={{ backgroundColor: "white" }}
            onClose={handleViewLabParamsDrawer}
            width="auto"
          >
            <ViewLabParam
              handleViewLabParamsDrawer={handleViewLabParamsDrawer}
              labParamsData={labParamsData}
              handleSwitchToAddLabParams={handleSwitchToAddLabParams}
            />
          </Drawer>
        )}
        <CommonModal
          isModalOpen={shouldShowDeletePopup}
          onCancel={toggleDeletePopup}
          modalWidth={398}
          title={"You may lose your data"}
          modalBody={
            <>
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>{deletePopupMsg}</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-end">
                  <div
                    onClick={() => {
                      if (isClearPopup) {
                        handleClearCurrentPage(updatedIndex);
                      } else {
                        handleDeletePage(updatedIndex);
                      }
                      toggleDeletePopup();
                      setUpdatedIndex(null);
                    }}
                    className="me-4 text-decoration-underline btn p-0 text-main"
                  >
                    {isClearPopup ? "Clear" : "Delete"}
                  </div>
                  <Button
                    onClick={toggleDeletePopup}
                    className="lh-lg btn btn-primary3 btn-41 px-4"
                  >
                    <span>No, Stay</span>
                  </Button>
                </div>
              </div>
            </>
          }
        />
        {showSCPopup && (
          <SCPopup handlePopup={() => dispatch(setShowSCPopup(false))} />
        )}
        <Drawer
          open={knowMoreDrawer}
          onClose={handleKnowMoreDrawer}
          title="Custom Canvas"
          width={720}
          className="drawer-container"
          destroyOnClose
        >
          <CustomSSknowMore />
        </Drawer>
      </>
      {isVideoConsultAvailable && (
        <VideoConsultModal
          visible={isVideoModalVisible}
          onClose={() => {
            setIsVideoModalVisible(false);
            setVideoConsultUrl(null);
            setVideoConsultAction(null);
          }}
          videoUrl={videoConsultUrl}
          patientName={patient_data?.pm_fullname}
          appointmentId={videoConsultData?.pam_id}
          callAction={videoConsultAction}
        />
      )}
    </CashManagerContext.Provider>
  );
}

export default SmartPrescription;

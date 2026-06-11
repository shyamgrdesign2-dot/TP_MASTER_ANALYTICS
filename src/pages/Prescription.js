import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Drawer, Tabs, message } from "antd";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

import { useSelector, useDispatch } from "react-redux";

import { ADD, EDIT, EXTRA_OPTIONS, FAILED_VERIFICATION, FREE, GB_ZYDUS_USER, GB_CARE_PLAN, PAEDIATRICS, PERSISTANT_STORAGE_KEY_AUTH_TOKEN, S_DDX, NEO_NATOLOGISTS_DP_ID, OPTHAL_PAD_MODULE_ID, OPTHAL_PAD_MODULE, GB_VOICE_RX_FREE, GB_VOICE_RX_NEW_UI } from "../utils/constants";

import { getPatientBirthWeight, getVitals, resetVitalsState } from "../redux/vitalsSlice";
import {
  getPatientLastHistory,
  listPrivateNotes,
} from "../redux/medicalhistorySlice";

import CashManagerContext from "../context/CashManagerContext";
import HeaderPrescription from "../common/HeaderPrescription";
import SymptomsBox from "../components/SymptomsBox";
import ExaminationBox from "../components/ExaminationBox";
import OphthalmologyExamPanel from "../components/ophthalmology/OphthalmologyExamPanel";
import DiagnosisBox from "../components/DiagnosisBox";
import MedicationsBox from "../components/MedicationsBox";
import AdviceBox from "../components/AdviceBox";
import InvestigationBox from "../components/InvestigationBox";
import TabFollowUpBox from "../components/tab_design/TabFollowUpBox";

import VitalsBox from "../components/VitalsBox";
import VitalsList from "../components/VitalsList";

import MedicalHistoryBox from "../components/MedicalHistoryBox";
import MedicalHistoryList from "../components/MedicalHistoryList";

import PrivateNotesBox from "../components/PrivateNotesBox";
import PrivateNotesList from "../components/PrivateNotesList";

import { Content } from "antd/es/layout/layout";
import Vaccination from "./vaccination/Vaccination";
import GrowthChart from "./growthChart/GrowthChart";
import { viewPatient } from "../redux/appointmentsSlice";
import { useAccess } from "./vaccination/useAccess";
import { getGynecDetails } from "../api/services/ApiGynec";
import Obstetric from "./obstetric/Obstetric";
import ObstetricList from "./obstetric/components/obstetricList/ObstetricList";
import { fetchObstetricDetails } from "./obstetric/service";
import { addObstetricDetails } from "../redux/obstetricSlice";
import { errorMessage, getClinicName, shouldMonetizationDisabled, trackEvent, getTokenData, getDeviceSdkData, isVoiceRxFree, isValidMongoId } from "../utils/utils";
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
  zydusDocsList,
  zydusRadioList,
} from "../redux/uploadDocSlice";
import UploadDocumentList from "./medicalRecords/components/uploadDocumentList/UploadDocumentList";
import {
  generateUniqueFileName,
  getCorrectedFileName,
  mergeDocuments,
} from "./medicalRecords/utils/helper";
import LabParametersList from "../components/LabParametersList";
import axios from "axios";
import { env } from "../EnvironmentConfig";
import LabParams from "../components/LabParams";
import ViewLabParam from "../components/ViewLabParams";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import DDxKnowMore from "../components/DDxKnowMore";
import TabPane from "antd/es/tabs/TabPane";
import LoopingVideo from "../components/common/LoopingVideo";
import DifferentialDiagnosisDrawer from "../components/DifferentialDiagnosisDrawer";
import {
  setIsDDxReadyToGenerate,
  setShowSCPopup,
  setSymptomCollector,
} from "../redux/ddxSlice";
import { getDDxDetails } from "../api/services/ApiDDx";
import { getDecodedToken } from "../utils/localStorage";
import DDxList from "../components/medical_certificate/DDxList";
import SurgicalBox from "../components/SurgicalBox";
import CustomModule from "../components/CustomModule";
import CarePlanDropdown from "../components/CarePlanDropdown";
import CarePlanList from "../components/CarePlanList";
import { getCarePlanNames, getCarePlanAssignments } from "./smartSync/services/carePlanService";

import TatvaAiKnowMore from "../components/TatvaAiKnowMore";
import GenRxBox from "../components/GenRxBox";
import ConsultationDrawer from "../components/ConsultationDrawer";
import ExpiredSubModal from "./monetization/components/ExpiredSubModal";
import { checkCredits } from "../redux/monetizationSlice";
import { services, setCustomizedPadLists } from "../redux/doctorsSlice";
import { fetchSymptomsCollectorData } from "../api/services/ApiGenRx";
import SCPopup from "../components/SCPopup";
import SCBanner from "../components/SCBanner";
import ZydusLabParams from "../components/ZydusLabParams";
import ZydusLabParametersList from "../components/ZydusLabParametersList";
import GroundingKnowMore from "../components/GroundingKnowMore";
import GroundingBox from "../components/GroundingBox";
import VideoConsultModal from "../components/VideoConsultModal";
import { GB_VIDEO_CONSULT, GB_TELE_CONSULT } from "../utils/constants";
import {
  setAppointmentTeleconsultStatus, 
  setActiveTeleconsultAppointmentId, 
  setActiveTeleconsultConsultationId, 
  setJoinToken
} from "../redux/teleconsultNotificationSlice";
import ApiTeleconsult from "../api/services/ApiTeleconsult";
import ApiVideoConsult from "../api/services/ApiVideoConsult";
import GenRxKnowMore from "../components/GenRxKnowMore";
import {
  AddCustomModuleDrawer,
  AddCustomModuleV2,
  CustomModuleV2,
} from "../components/customModulesV2";
import { getModules, searchModulesByHospital } from "../redux/customModuleSlice";
import { getOpthalPrescriptionDetails } from "./ophthalmology/service";
import {
  resetOpthalForm,
  setLastOpthalPrescriptionData,
  setOpthalPrescriptionId,
} from "../redux/ophthalmologyExamSlice";
import { GB_OPTHAL_MODULE } from "../utils/constants";
import { ASSETS } from "../assets";
import {
  hasVitalsAndBodyCompositionData,
  mapVitalsAndBodyCompositionToRowPatch,
  mergeVitalsRowsWithSymptomCollectorPatch,
  VITALS_ROW_DATE_FORMAT,
} from "../utils/symptomCollectorVitalsMerge";
import { computeRxPadVitalsDerivedMetrics } from "../utils/vitalsCalculations";

function Prescription() {
  const {
    userId,
    customizedPadLeftList,
    customizedPadRightList: originalCustomizedPadRightList,
    frequencyList,
    timingList,
    opthalModuleAutoAdded,
  } = useSelector((state) => state.doctors);

  const {
    vitals,
    medicalHistory: MedicalHistory,
    privateNotes,
    bgHey: hey,
    vaccination: vaccinationImg,
    growthChartDark: growthChartImg,
    obstetricDark: obstetricImg,
    uploadDocDark: uploadDocImg,
    lab: labResultImg,
    apexai: apexAIImg,
    blinkingdot_3: blinkingDotWebm,
    blinkingdot_2: blinkingDotMp4,
    genRxBg_2: genRxBgWebm,
    genRxBg: genRxBgMp4,
    carePlanActive: carePlanIcon,
  } = ASSETS.images;

  console.log("vitals", hey);
  
  // Local state to manage customizedPadRightList with deleted modules for edit case
  const [customizedPadRightList, setCustomizedPadRightList] = useState(originalCustomizedPadRightList);
  // Track modules that have been explicitly removed from Rx pad to prevent re-adding
  const [removedModuleIds, setRemovedModuleIds] = useState(new Set());

  const { planDetails } = useSelector((state) => state.subscription);
  const { selectedVitalsList, vitalsPastList, patientBirthWeight } =
    useSelector((state) => state.vitals);
  const { privateNotesList } = useSelector((state) => state.medicalhistory);
  const {
    obstetricDetails: allObstetricDetails,
    isObstetricDetailsFetched,
    isNavigateToObstetric,
  } = useSelector((state) => state.obstetric);
  const obstetricDetails = allObstetricDetails?.currentPregnancy || {};
  const examinationHistory = obstetricDetails?.examinationHistory || [];
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
  const { allUploadedDocs, uploadDocCategories } = useSelector(
    (state) => state.uploadDoc
  );
  const { customModules, hospitalSearchResults } = useSelector((state) => state.customModules);
  const dispatch = useDispatch();
  
  const decodedToken = getDecodedToken();
  const tokenData = decodedToken?.result;

  const { state } = useLocation();
  const { patient_data, send_path, caseManagerData, videoConsultData, fromVoiceRecording, audioBlob, mode, digitizedData, inputText, teleconsultAutoJoin, isEditRx, fromRepeatRx } = state || {};

  const isPrescriptionVoiceOrGenRxFlow =
    Boolean(fromVoiceRecording) ||
    (typeof inputText === "string" && inputText.trim().length > 0) ||
    (caseManagerData?.smart_prescription_filename &&
      isValidMongoId(caseManagerData.smart_prescription_filename));

  const shouldApplyZydusVisibleRepeatEditFilter =
    tokenData?.hospital_business_id == env.zydus_business_id &&
    (Boolean(fromRepeatRx) || Boolean(isEditRx)) &&
    !isPrescriptionVoiceOrGenRxFlow;

  // Create a combined module list that includes both user's modules and hospital-wide modules
  // This ensures deleted modules are still available when editing a prescription
  const allAvailableModules = React.useMemo(() => {
    // Add userId to each module in customModules
    const modulesWithUserId = customModules.map((module) => ({
      ...module,
      userId: userId || module.userId, // Use existing userId if available, otherwise add from Redux
    }));
    
    const combined = [...modulesWithUserId];
    const existingIds = new Set(modulesWithUserId.map((m) => m.module_id));
    
    // Add hospital modules that aren't already in the user's list
    if (hospitalSearchResults?.modules) {
      hospitalSearchResults.modules.forEach((module) => {
        if (!existingIds.has(module.module_id)) {
          combined.push(module);
        }
      });
    }
    
    return combined;
  }, [customModules, hospitalSearchResults, userId]);

  useEffect(() => {
    dispatch(resetVitalsState());
  }, []);

  // Clear removedModuleIds for modules that are explicitly added back via Redux
  // This handles the case when a user adds a module back via "Add to Rx"
  useEffect(() => {
    if (removedModuleIds.size > 0 && originalCustomizedPadRightList?.length > 0) {
      const modulesInRedux = new Set(
        originalCustomizedPadRightList
          .filter((item) => item.is_custom_module)
          .map((item) => item.tmdpm_id)
      );
      
      // Check if any removed modules are now back in Redux (explicitly added)
      const needsUpdate = Array.from(removedModuleIds).some((moduleId) => modulesInRedux.has(moduleId));
      
      if (needsUpdate) {
        setRemovedModuleIds((prev) => {
          const newSet = new Set(prev);
          let hasChanges = false;
          modulesInRedux.forEach((moduleId) => {
            if (newSet.has(moduleId)) {
              newSet.delete(moduleId);
              hasChanges = true;
            }
          });
          return hasChanges ? newSet : prev;
        });
      }
    }
  }, [originalCustomizedPadRightList]);

  // Update local customizedPadRightList when Redux state changes
  // Filter out any modules that are in removedModuleIds to prevent them from reappearing
  useEffect(() => {
    const filteredList = originalCustomizedPadRightList.filter(
      (item) => !item.is_custom_module || !removedModuleIds.has(item.tmdpm_id)
    );
    setCustomizedPadRightList(filteredList);
  }, [originalCustomizedPadRightList, removedModuleIds]);

  // Reconstruct customizedPadRightList to include deleted modules when editing a prescription
  useEffect(() => {
    if (caseManagerData?.moduleContents?.length > 0 && allAvailableModules.length > 0) {
      // Get module IDs from the prescription content
      const moduleIdsInPrescription = caseManagerData.moduleContents.map(
        (content) => content.module_id
      );

      // Get module IDs already in the right list (check both Redux and local state)
      const existingModuleIdsInRedux = new Set(
        originalCustomizedPadRightList
          .filter((item) => item.is_custom_module)
          .map((item) => item.tmdpm_id)
      );
      const existingModuleIdsInLocal = new Set(
        customizedPadRightList
          .filter((item) => item.is_custom_module)
          .map((item) => item.tmdpm_id)
      );
      // Combine both sets to get all existing module IDs
      const existingModuleIds = new Set([...existingModuleIdsInRedux, ...existingModuleIdsInLocal]);

      // Find modules that are in the prescription but not in the right list (deleted modules)
      // Exclude modules that have been explicitly removed from Rx pad
      const missingModules = moduleIdsInPrescription.filter(
        (moduleId) => !existingModuleIds.has(moduleId) && !removedModuleIds.has(moduleId)
      );

      if (missingModules.length > 0) {
        // Create pad entries for missing modules
        const missingModuleEntries = missingModules
          .map((moduleId) => {
            // Try to find the module definition
            const moduleDefinition = allAvailableModules.find(
              (m) => m.module_id === moduleId
            );
            
            if (moduleDefinition) {
              return {
                tmdpm_id: moduleDefinition.module_id,
                tmdpm_name: moduleDefinition.name,
                tmdpm_type: "custom_module",
                tmdpm_status: 0, // Enabled
                is_custom_module: true,
              };
            }
            
            // If module definition not found, try to get name from moduleContents
            const moduleContent = caseManagerData.moduleContents.find(
              (content) => content.module_id === moduleId
            );
            
            if (moduleContent) {
              console.warn(
                `Module definition not found for ${moduleId}, using fallback from moduleContents`
              );
              return {
                tmdpm_id: moduleId,
                tmdpm_name: moduleContent.module_name || moduleId,
                tmdpm_type: "custom_module",
                tmdpm_status: 0, // Enabled
                is_custom_module: true,
              };
            }
            
            // Last resort: create entry with just the ID
            console.error(
              `Cannot find module ${moduleId} in allAvailableModules or moduleContents`
            );
            return {
              tmdpm_id: moduleId,
              tmdpm_name: `Module ${moduleId}`,
              tmdpm_type: "custom_module",
              tmdpm_status: 0,
              is_custom_module: true,
            };
          })
          .filter(Boolean);

        // Add missing modules to the right list
        // Merge with current local state to preserve any modules already added
        const currentModuleIds = new Set(
          customizedPadRightList
            .filter((item) => item.is_custom_module)
            .map((item) => item.tmdpm_id)
        );
        // Only add modules that aren't already in the local state
        const newModuleEntries = missingModuleEntries.filter(
          (entry) => !currentModuleIds.has(entry.tmdpm_id)
        );
        if (newModuleEntries.length > 0) {
          const updatedRightList = [...customizedPadRightList, ...newModuleEntries];
          setCustomizedPadRightList(updatedRightList);
        }
      }
    }
  }, [caseManagerData, allAvailableModules, originalCustomizedPadRightList, removedModuleIds, customizedPadRightList]);
  const chartType = state?.chartType;
  const rawTcmId =
    caseManagerData?.tcm_id ??
    caseManagerData?.tcmId ??
    state?.tcm_id ??
    state?.tcmId ??
    0;
  const tcmId = (fromRepeatRx || caseManagerData == null) ? 0 : Number(rawTcmId);
  const pamId = (fromRepeatRx || caseManagerData == null) ? 0 : caseManagerData.pam_id;
  const consultationDate =
    caseManagerData !== undefined
      ? caseManagerData.consultation_date
      : moment().format("YYYY-MM-DD HH:mm:ss");

  const { profile } = useSelector((state) => state.doctors);

  const [symptomsData, setSymptomsData] = useState([]);
  const [examinationData, setExaminationData] = useState([]);
  const [surgeriesData, setSurgeriesData] = useState([]);
  const [diagnosisData, setDiagnosisData] = useState([]);
  const [adviceData, setAdviceData] = useState([]);
  const [investigationData, setInvestigationData] = useState([]);
  const [medicationData, setMedicationData] = useState([]);
  const [vitalsData, setVitalsData] = useState([]);
  const [medicalHistoryData, setMedicalHistoryData] = useState([]);
  const [addlabparamsDrawer, setAddlabparamsDrawer] = useState(false);
  const [viewlabparamsDrawer, setViewlabparamsDrawer] = useState(false);
  const [privateNotesData, setPrivateNotesData] = useState(null);
  const [followUpDate, setFollowUpDate] = useState(null);
  const [additionalNote, setAdditionalNote] = useState("");
  const [isGrowthChart, setIsGrowthChart] = useState(false);
  const [labParamsData, setLabParamsData] = useState([]);
  const startTime = moment().format("YYYY-MM-DD HH:mm:ss");
  const [customModuleContents, setCustomModuleContents] = useState([]);
  const [isAddCustomModuleDrawerVisible, setIsAddCustomModuleDrawerVisible] = useState(false);
  const [isGenRxDrawerVisible, setIsGenRxDrawerVisible] = useState(
    caseManagerData?.smart_prescription_filename || 
    (inputText && typeof inputText === 'string' && inputText.trim().length > 0) ||
    (fromVoiceRecording && audioBlob) ||
    false
  );
  const isVideoConsultAccessible = useFeatureIsOn(GB_VIDEO_CONSULT);
  const isTeleConsultEnabled = useFeatureIsOn(GB_TELE_CONSULT);
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
  const [videoConsultUrl, setVideoConsultUrl] = useState(null);
  const [videoConsultAction, setVideoConsultAction] = useState(null);
  const [pillupSwitch, setPillupSwitch] = useState(true);
  const [showSCBanner, setShowSCBanner] = useState(false);
  const [zydusTestReportDrawer, setZydusTestReportDrawer] = useState(false);
  const [labReportID, setLabReportID] = useState(null);
  const [zydusSelectedLabParams, setZydusSelectedLabParams] = useState([]);
  const [selectedCarePlan, setSelectedCarePlan] = useState(null);
  const [carePlanPlaceholder, setCarePlanPlaceholder] = useState(undefined);
  const [hasExistingCarePlan, setHasExistingCarePlan] = useState(false);
  const [loadPrevOpthalSignal, setLoadPrevOpthalSignal] = useState(0);
  const [isTeleconsultJoinLoading, setIsTeleconsultJoinLoading] = useState(false);
  const joinToken = useSelector((state) => state.teleconsultNotification?.joinToken);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  const { servicesList } = useSelector((state) => state.doctors);

  const isNormalConsultFlow = !fromVoiceRecording && !send_path && !digitizedData;

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalData, setSubModalData] = useState(null);
  const [useVoiceRx, setUseVoiceRx] = useState(false);

  useEffect(() => {
    if (teleconsultAutoJoin?.token) {
      dispatch(setJoinToken(teleconsultAutoJoin.token));
      if (videoConsultData?.pam_id != null) {
        dispatch(setActiveTeleconsultAppointmentId(videoConsultData.pam_id));
      }
      if (teleconsultAutoJoin?.consultationId) {
        dispatch(setActiveTeleconsultConsultationId(teleconsultAutoJoin.consultationId));
      }
    }
  }, [teleconsultAutoJoin?.token, teleconsultAutoJoin?.consultationId, videoConsultData?.pam_id, dispatch]);

  useEffect(() => {
    let isMounted = true;
    const fetchOpthalPrescription = async () => {
      dispatch(resetOpthalForm());
      dispatch(setLastOpthalPrescriptionData(null));
      dispatch(setOpthalPrescriptionId(null));
      if (!tcmId) {
        return;
      }
      try {
        const response = await getOpthalPrescriptionDetails({
          tcm_id: tcmId,
          patientId: patient_data?.patient_unique_id,
        });
        const data = response?.data ?? response;
        const payload = Array.isArray(data) ? data[0] : data;
        if (!isMounted || !payload) {
          return;
        }
        dispatch(setLastOpthalPrescriptionData(payload));
        if (payload?._id) {
          dispatch(setOpthalPrescriptionId(payload._id));
        }
        setLoadPrevOpthalSignal((prev) => prev + 1);
      } catch (error) {
        console.error("Error fetching opthal prescription details:", error);
      }
    };
    fetchOpthalPrescription();
    return () => {
      isMounted = false;
    };
  }, [dispatch, tcmId]);
  const [useDDX, setUseDDX] = useState(false);

  const responsive = {
    desktop: {
      breakpoint: { max: 3000, min: 1024 },
      items: 1,
    },
    tablet: {
      breakpoint: { max: 1024, min: 464 },
      items: 1,
    },
    mobile: {
      breakpoint: { max: 464, min: 0 },
      items: 1,
    },
  };

  const showHideSubModal = (object) => {
    object && setSubModalData(object)
    setIsSubModalOpen(!isSubModalOpen);
  }

  const isVideoConsultAvailable = isVideoConsultAccessible && videoConsultData?.pam_status_type_appointment === 1;
  const isVideoConsultAvailableType2 = isTeleConsultEnabled && videoConsultData?.pam_status_type_appointment === 2;
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
    startTime,
    customModuleContents,
    setCustomModuleContents,
    pillupSwitch,
    setPillupSwitch,
    markModuleAsRemoved: (moduleId) => {
      setRemovedModuleIds((prev) => new Set([...prev, moduleId]));
      // Note: customModuleContents is already updated in the component's handleRemoveFromRxPad
      // We don't need to update it here to avoid double removal
    },
    markModuleAsAdded: (moduleId) => {
      // Remove module from removedModuleIds when explicitly added back to Rx pad
      setRemovedModuleIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
    },
    showHideSubModal,
    useVoiceRx,
    setUseVoiceRx,
    useDDX,
    setUseDDX,
    selectedCarePlan,
    setSelectedCarePlan,
    isDraft: caseManagerData?.is_draft
  };

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
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [filesData, setFilesData] = useState([]);
  const [isEditDocument, setIsEditDocument] = useState(false);
  const fileInputRef = useRef(null);
  const [shouldShowApexPopup, setShowApexPopup] = useState(true);
  const [shouldShowGenRxPopup, setShowGenRxPopup] = useState(true);
  const [shouldShowTatvaAiPopup, setShowTatvaAiPopup] = useState(true);
  const [ddxKnowMoreDrawer, setDDxKnowMoreDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState("basicInfo");
  const [generatedDDx, setGeneratedDDx] = useState({ results: [] });
  const [isDDxLoading, setIsDDxLoading] = useState(false);
  const [ddxDrawer, setDDxDrawer] = useState(false);
  const [likeDislike, setLikeDislike] = useState([]);
  const [isDDxGenerated, setIsDDxGenerated] = useState(false);
  const [genRxKnowMoreDrawer, setGenRxKnowMoreDrawer] = useState(false);
  const [tatvaAiKnowMoreDrawer, setTatvaAiKnowMoreDrawer] = useState(false);
  const [groundingKnowMoreDrawer, setGroundingKnowMoreDrawer] = useState(false);
  const tp_monetization_enable = !shouldMonetizationDisabled();
  const [showShimmer, setShowShimmer] = useState(false);
  const isApexAIAccessable = useFeatureIsOn("cdss");
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const isCarePlanEnabled = useFeatureIsOn(GB_CARE_PLAN);
  const isOpthalModuleAccessible = useFeatureIsOn(GB_OPTHAL_MODULE);
  const isGroundingAccessableForZydus =
    tokenData?.hospital_business_id == env.zydus_business_id &&
    isZydusUserAccessableFromGB;
  const {
    isVaccinationAccessable,
    isGrowthChartAccessable,
    isGynaecHistoryAccessable,
  } = useAccess(patient_data?.ageYears);
  const {
    isDDxReadyToGenerate,
    showSCPopup,
    isAutofillSelected,
    selectedSymptomsCollector,
  } = useSelector((state) => state.ddx);
  const vitalsCalculate = useCallback(
    (H, W) => computeRxPadVitalsDerivedMetrics(H, W, patient_data),
    [patient_data]
  );
  const [shouldShowGroundingBanner, setShowGroundingBanner] = useState(false);

  const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
  const baseUrl = env.lab_params_api_url;

  const getAllObstetricDetails = async () => {
    const obstetricResponse = await fetchObstetricDetails(
      patient_data.patient_unique_id
    );
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
    const tokenData = decodedToken?.result;
    if (
      tokenData?.hospital_business_id == env.zydus_business_id &&
      isZydusUserAccessableFromGB &&
      patient_data.mrno != null &&
      patient_data.mrno != undefined
    ) {
      dispatch(
        zydusDocsList({ mrno: patient_data.mrno, um_id: tokenData?.user_id })
      );
      dispatch(
        zydusRadioList({ mrno: patient_data.mrno, um_id: tokenData?.user_id })
      );
    }
  };

  const getAllDocumentCategories = async () => {
    const response = await fetchAllDocumentCategories();
    dispatch(setUploadDocCategories(response));
  };

  const handleVideoConsult = async () => {
    if (!videoConsultData?.pam_id) {
      message.error("Invalid appointment ID");
      return;
    }

    setIsInitiatingCall(true);
    
    try {
      const response = await ApiVideoConsult.initiateTeleCall(videoConsultData.pam_id);
      
      if (response.error) {
        message.error(response.error);
        return;
      }
      
      if (response.data?.message === "success") {
        if (response.data.action === "join-video-call" && response.data.callJoinUrlForDoctor) {
          setVideoConsultUrl(response.data.callJoinUrlForDoctor);
          setVideoConsultAction(response.data.action);
          setIsVideoModalVisible(true);
        } else if (response.data.action === "join-audio-call") {
          message.info(response.data.displayMessage || "Audio call initiated successfully");
        }
        
        trackEvent("TP_VideoConsult_Started", {
          patient_contact: patient_data?.pm_contact_no || "",
          patient_id: patient_data?.patient_unique_id || "",
          doctor_speciality: profile?.dp_name,
          doctor_unique_id: profile?.doctor_unique_id,
          clinic_name: getClinicName(profile?.hospital_data),
          page: "Prescription",
          call_type: response.data.action,
        });
      } else {
        message.error("Failed to initiate consultation");
      }
    } catch (error) {
      message.error("Failed to start video consultation. Please try again.");
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const handleTeleconsultClick = async () => {
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
    } catch (error) {
      message.error("Teleconsult unavailable at the moment.");
    } finally {
      setIsTeleconsultJoinLoading(false);
    }
  };

  useEffect(() => {
    if (isAutofillSelected) {
      setShowShimmer(true);
      const timer = setTimeout(() => {
        setShowShimmer(false);
      }, 1000); // 1 seconds

      return () => clearTimeout(timer); // Cleanup timeout
    }
  }, [isAutofillSelected]);

  useEffect(() => {
    const clinic_name = getClinicName(profile?.hospital_data);
    tcmId == 0
      ? window.Moengage.track_event("TP_Consultation_Started", {
          clinic_name,
          patient_number: patient_data?.pm_contact_no,
          patient_id: patient_data?.patient_unique_id,
          tcm_id: tcmId,
        })
      : window.Moengage.track_event("TP_Consultation_edit_started", {
          clinic_name,
          patient_number: patient_data?.pm_contact_no,
          patient_id: patient_data?.patient_unique_id,
        });
    const sendData = {
      patient_unique_id: patient_data?.patient_unique_id,
    };
    dispatch(viewPatient(sendData));
  }, []);

  // Fetch custom modules on component mount
  useEffect(() => {
    const fetchModules = async () => {
      if (userId) {
        // Always fetch user's own modules
        await dispatch(getModules(userId));
        

        // If editing a case with custom modules, also fetch hospital-wide modules
        // This ensures deleted modules are still available for rendering
        // if (caseManagerData?.moduleContents?.length > 0) {
          const hospitalId = decodedToken?.result?.clinic_id;
          if (hospitalId) {
            await dispatch(
              searchModulesByHospital({
                hospitalId,
                moduleName: "",
                page: 1,
                limit: 100,
                departmentId: profile?.dp_id
              })
            );
          }
        // }
      }
    };

    fetchModules();
  }, [userId, dispatch]);

  useEffect(() => {
    if (!isOpthalModuleAccessible) {
      return;
    }
    if (!Array.isArray(customizedPadRightList) || customizedPadRightList.length === 0) {
      return;
    }
    if (customizedPadRightList.some((item) => item?.tmdpm_id === OPTHAL_PAD_MODULE_ID)) {
      return;
    }
    if (opthalModuleAutoAdded) {
      return;
    }
    const medicationsIndex = customizedPadRightList.findIndex(
      (item) => item?.tmdpm_id === 12
    );
    const nextRightList = [...customizedPadRightList];
    if (medicationsIndex >= 0) {
      nextRightList.splice(medicationsIndex + 1, 0, { ...OPTHAL_PAD_MODULE });
    } else {
      nextRightList.push({ ...OPTHAL_PAD_MODULE });
    }
    dispatch(
      setCustomizedPadLists({
        right: nextRightList,
        opthalModuleAutoAdded: true,
      })
    );
  }, [
    customizedPadRightList,
    isOpthalModuleAccessible,
    opthalModuleAutoAdded,
  ]);

  useEffect(() => {
    if (isGynaecHistoryAccessable) {
      getAllObstetricDetails();
    }
  }, [isGynaecHistoryAccessable]);

  useEffect(() => {
    if (uploadDocCategories.length === 0) {
      getAllDocumentCategories();
    }
    if (patient_data?.patient_unique_id) {
      getAllPatientDocs();
    }
  }, [patient_data?.patient_unique_id, patient_data?.mrno, isZydusUserAccessableFromGB]);

  useEffect(() => {
    if (caseManagerData !== undefined) {
      if (
        caseManagerData.vitals?.length > 0 &&
        customizedPadLeftList.findIndex(
          (e) => e.tmdpm_id === 1 && e.tmdpm_status === 0
        ) !== -1
      ) {
        if (tcmId !== 0) {
          const updatedData = caseManagerData.vitals.map((e, i) => {
            return {
              ...e,
              systolic: e.blood_press ? e.blood_press.split("/")[0] : "",
              diastolic: e.blood_press ? e.blood_press.split("/")[1] : "",
            };
          });
          setVitalsData(updatedData);
        }
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
      const medicineListForHydration = (() => {
        const list = caseManagerData.medicine;
        if (!Array.isArray(list) || list.length === 0) return list;
        if (!shouldApplyZydusVisibleRepeatEditFilter) return list;
        return list.filter(
          (m) =>
            !Object.prototype.hasOwnProperty.call(m, "visible") ||
            m.visible === undefined ||
            m.visible === 1
        );
      })();

      if (
        medicineListForHydration?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 12 && e.tmdpm_status === 0
        ) !== -1
      ) {
        const updatedData = medicineListForHydration.map((e) => {
          const unitObj = e?.medicineUnit
            ? e?.medicineUnit.find((x) => x.tmu_id == e.tmm_unit)
            : null;
          const frequencyObj = frequencyList.find(
            (x) => x.tmf_id == e.tmm_freq_type
          );
          const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

          return {
            ...e,
            tmm_unit_name:
              unitObj && unitObj !== undefined ? unitObj.tmu_title : "",
            tmm_freq_type_name:
              e.tmf_block == 0
                ? `${
                    e.tcm_tmm_freq_morning && e.tcm_tmm_freq_morning != 0
                      ? e.tcm_tmm_freq_morning + " - "
                      : "0 -"
                  }${
                    e.tcm_tmm_freq_afternoon && e.tcm_tmm_freq_afternoon != 0
                      ? e.tcm_tmm_freq_afternoon + " - "
                      : "0 -"
                  }${
                    e.tcm_tmm_freq_evening && e.tcm_tmm_freq_evening != 0
                      ? e.tcm_tmm_freq_evening + " - "
                      : ""
                  }${
                    e.tcm_tmm_freq_night && e.tcm_tmm_freq_night != 0
                      ? e.tcm_tmm_freq_night
                      : "0"
                  }`
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
            tmm_days_duration_type: EXTRA_OPTIONS.some(
              (x) => x.value == e.tmm_duration_type
            )
              ? e.tmm_duration_type
              : e.tmm_days
              ? `${e.tmm_days} ${e.tmm_duration_type}`
              : "",
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
      const investigationListForHydration = (() => {
        const list = caseManagerData.investigation;
        if (!Array.isArray(list) || list.length === 0) return list;
        if (!shouldApplyZydusVisibleRepeatEditFilter) return list;
        return list.filter(
          (row) =>
            !Object.prototype.hasOwnProperty.call(row, "visible") ||
            row.visible === undefined ||
            row.visible === 1
        );
      })();

      if (
        investigationListForHydration?.length > 0 &&
        customizedPadRightList.findIndex(
          (e) => e.tmdpm_id === 14 && e.tmdpm_status === 0
        ) !== -1
      ) {
        setInvestigationData(investigationListForHydration);
      }
      if (
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
      if (caseManagerData?.moduleContents?.length) {
        // Don't filter out modules - they should all be rendered even if deleted
        // The allAvailableModules list will include deleted modules from hospital search
        setCustomModuleContents(caseManagerData.moduleContents);
      }
      setPillupSwitch(caseManagerData?.pillup_fulfilment == 1 ? true : false);

      // Initialize labReportID from caseManagerData if available
      if (caseManagerData?.labReportID) {
        setLabReportID(caseManagerData.labReportID);
      }
    }
  }, []);

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
        source: chartType ? "Patient Details" : "Consult",
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
  const handleDrawerObstetric = (obstetricKey) => {
    setObstetricDrawer(
      typeof obstetricKey === "string" ? obstetricKey : !obstetricDrawer
    );
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
      handleDrawerObstetric(isNavigateToObstetric);
    }
  }, [isNavigateToObstetric]);

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
      }
    },
    [vitalDrawer, medicalHistoryDrawer, vaccinationDrawer, privateNotesDrawer]
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

          pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0, //extra
          pm_id: patient_data !== undefined ? patient_data.pm_id : 0, //extra
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

  useEffect(() => {
    if (isCarePlanEnabled) {
      fetchCarePlanNames();
    }
  }, [isCarePlanEnabled]);

  // Derive placeholder plan name by fetching assignments and matching current tcm_id
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
      if (patient_data?.pam_status === "0" && caseManagerData === undefined) {
        dispatch(setShowSCPopup(true));
      }
    }
  };

  const fetchGynecHistory = async () => {
    try {
      const data = await getGynecDetails(
        patient_data.patient_unique_id,
        userId
      );
      // Destructure to remove createdAt and createdBy
      const { createdAt, createdBy, ...updatedData } = data || {};

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
        `${baseUrl}/api/v1/lab-parameters/results/${patient_data?.patient_unique_id}`,
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

  const fetchCarePlanNames = async () => {
    try {
      if (isCarePlanEnabled) {
        const response = await getCarePlanNames();
        // The CarePlanDropdown component handles its own data fetching
      }
    } catch (error) {
      console.error("Error fetching care plan names:", error);
    }
  };

  const handleDDxKnowMore = () => {
    setDDxKnowMoreDrawer((prev) => !prev);
  };

  const handleDDxDrawer = (field) => {
    setDDxDrawer((prev) => !prev);
    if (!ddxDrawer) {
      window.Moengage.track_event("TP_CDSS_Ddx_reviewed", {
        clinic_name: getClinicName(profile?.hospital_data),
        doctor_id: profile?.doctor_unique_id,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
        field: field,
      });
    }
  };

  const getGenerateDDx = async (field) => {
    const DDX_planDetails = servicesList?.find(e => e.service_name === S_DDX)
    if (DDX_planDetails?.plan_tier === FREE && DDX_planDetails?.credit_balance <= 0) {
      showHideSubModal({ service_name: S_DDX })
    } else if (DDX_planDetails?.plan_tier === FAILED_VERIFICATION) {
      showHideSubModal({ service_name: S_DDX })
    } else {
      let sendData = {
        b2c_id: profile?.b2c,
        service_name: S_DDX
      }
      const action = await dispatch(checkCredits(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        if (action?.payload?.hasOwnProperty("service_name")) {
          if (action?.payload?.plan_tier === FREE && action?.payload?.credit_balance <= 0) {
            if (action?.payload?.credit_balance != DDX_planDetails?.credit_balance) {
              await dispatch(services(sendData?.b2c_id))
            }
            showHideSubModal({ service_name: S_DDX })
          } else if (action?.payload?.plan_tier === FAILED_VERIFICATION) {
            showHideSubModal()
          } else {
            setIsDDxLoading(true);
            setIsDDxGenerated(true);
            window.Moengage.track_event("TP_CDSS_Ack_GenDx", {
              clinic_name: getClinicName(profile?.hospital_data),
              doctor_id: profile?.doctor_unique_id,
              patient_number: patient_data?.pm_contact_no,
              patient_id: patient_data?.patient_unique_id,
              field: field,
            });
            const payload = {
              patientId: patient_data?.patient_unique_id,
              symptoms: symptomsData?.map((symptom) => {
                if (symptom) {
                  return {
                    name: symptom.symptom_name,
                    since: symptom.since,
                    severity: symptom.severity,
                    notes: symptom.note,
                  };
                }
              }),
              examinations: examinationData?.map((examination) => {
                if (examination) {
                  return {
                    name: examination.examination_name,
                    notes: examination.note,
                  };
                }
              }),
            };
            const generatedDDxResponse = await getDDxDetails(payload);
            if (generatedDDxResponse?.results) {
              setGeneratedDDx(generatedDDxResponse);
              setLikeDislike(generatedDDxResponse?.results?.map(() => ""));
              setUseDDX(true);
            }
            dispatch(setIsDDxReadyToGenerate(false));
            setIsDDxLoading(false);
          }
        } else {
          typeof action?.payload?.data?.error === 'object' ?
            errorMessage(action?.payload?.data?.error?.description)
            :
            errorMessage(action?.payload?.data?.message)
        }
      } else {
        errorMessage(action.payload.message)
      }
    }
    dispatch(setIsDDxReadyToGenerate(false)); // TODO: INTEL - DOUBTFUL MERGE CONFLICT RESOLVEMENT
    setIsDDxLoading(false);
    const clinic_name = getClinicName(profile?.hospital_data);
    const tokenData = getTokenData(); 
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_Monetization_GenerateDDX", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      um_id: tokenData?.user_id,
      clinic_id: tokenData?.clinic_id,
      clinic_Name: clinic_name,
      payment_Status: planDetails?.currentPlanStatus,
      token_count: DDX_planDetails?.credit_balance,
      ...deviceSdkData
    });
  }

  const handleGenRxKnowMore = () => {
    setGenRxKnowMoreDrawer((prev) => !prev);
  };

  const handleTatvaAiKnowMore = () => {
    setTatvaAiKnowMoreDrawer((prev) => !prev);
  };

  const handleGroundingKnowMore = () => {
    setGroundingKnowMoreDrawer((prev) => !prev);
  };

  const ShimmerLoader = () => {
    return (
      <div className="sc-shimmer-container">
        <div className="shimmer-box">
          <div className="shimmer-header">
            <div className="shimmer-title"></div>
            <div className="shimmer-edit"></div>
          </div>
          <div className="shimmer-line"></div>
          <div className="shimmer-line"></div>
          <div className="shimmer-line"></div>
        </div>
      </div>
    );
  };

  const handleZydusTestReportDrawer = () => {
    setZydusTestReportDrawer(!zydusTestReportDrawer);
  };

  const CUSTOMIZED_PAD_LEFT_LIST = () => {
    const modules = customizedPadLeftList?.map((e, i) => {
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
        <div
          className={showShimmer ? "genrx-shimmer" : ""}
          style={
            showShimmer
              ? {
                  padding: "2px",
                  borderRadius: "20px",
                  marginBottom: "15px",
                }
              : {}
          }
        >
          {showShimmer && (
            <LoopingVideo
              webm={genRxBgWebm}
              mp4={genRxBgMp4}
              className="genrx-shimmer-video"
              ariaLabel="Background"
            />
          )}
          <div
            key={i}
            className={`prescription-box-sm p-14 ${showShimmer ? "genrx-shimmer-content" : ""}`}
            style={showShimmer ? {} : { marginBottom: "15px" }}
          >
            <div style={{ background: "white", borderRadius: "17px" }}>
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
                  {/* <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => collapsedFlag != 2 ? setCollapsedFlag(2) : setCollapsedFlag(null)}>
                    <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${collapsedFlag != 2 ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                  </Button> */}
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
              {showShimmer ? (
                <ShimmerLoader />
              ) : (
                (medicalHistoryData.length > 0 ||
                  (updatedGynecHistory &&
                    Object.keys(updatedGynecHistory).length > 0)) && (
                  <MedicalHistoryList gynecHistory={updatedGynecHistory} />
                )
              )}
            </div>
          </div>
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
              <span>{`${
                examinationHistory?.length > 0 ? "Edit" : "Add"
              }`}</span>
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
            shouldShowImmunisation) && (
            <ObstetricList
              obstetricDrawer={obstetricDrawer}
              handleDrawerObstetric={handleDrawerObstetric}
            />
          )}
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
                style={{ paddingRight: allUploadedDocs.length > 0 ? 0 : 12 }}
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
                style={{ paddingRight: labParamsData?.length > 0 ? 0 : 12 }}
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

    // Add Zydus Test Reports module if user has Zydus business ID
    if (tokenData?.hospital_business_id == env.zydus_business_id) {
      modules.push(
        <div
          key="zydus-test-reports"
          className="prescription-box-sm"
          style={{ overflow: "hidden" }}
        >
          <div
            className="d-flex align-items-center justify-content-between p-14"
            style={{ borderBottom: "1px solid #ddd" }}
          >
            <div className="d-flex align-items-center">
              <img
                src={labResultImg}
                alt="zydus-test-report"
                className="me-3"
              />
              <div className="title-common">Zydus Lab Reports</div>
            </div>
            <button
              className="btn d-flex align-items-center btn-text"
              onClick={handleZydusTestReportDrawer}
            >
              <i className="icon-Add me-1 fs-5"></i>
              <span>View All</span>
            </button>
          </div>
          <ZydusLabParametersList labParamsData={zydusSelectedLabParams} patient_unique_id={patient_data?.patient_unique_id} doc_id={userId} patientGender={patient_data?.pm_gender} />
        </div>
      );
    }

    return modules;
  };

  const navigate = useNavigate();
  
  const handleGenRx = () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    trackEvent("TP_VoiceRx_Start", {
      patient_contact: patient_data?.pm_contact_no || "",
      patient_id: patient_data?.patient_unique_id || "",
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name,
    });
    
    if (tcmId == 0) {
      const tokenData = getTokenData();
      const deviceSdkData = getDeviceSdkData();
      window.Moengage.track_event("TP_VoiceRx", {
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
    

    navigate(isVoiceRxNewFromGB ? "/prescription" : "/voice-rx-consult", {
      state: {
        patient_data,
        autoOpenModal: false,
        fromPrescription: true,
        ...(isVoiceRxNewFromGB && {
          isVoiceRxNewUiFlow: true,
          voiceRxEntryPoint: "prescription_header",
          caseManagerData: caseManagerData,
        }),
      },
    });
  }
  // Auto-fetch Zydus lab params when labReportID is available (for ZydusLabParametersList display)
  useEffect(() => {
    const fetchZydusLabParamsForDisplay = async () => {
      if (labReportID && zydusSelectedLabParams.length === 0) {
        try {
          const response = await axios.post(
            `${env.lab_params_api_url}/api/v1/lab-reports/getByID`,
            {
              labReportID: labReportID,
              source: "zydus-ict",
              patient_unique_id: patient_data?.patient_unique_id,
            },
            {
              headers: {
                Authorization: `Bearer ${JSON.parse(
                  localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN)
                )}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.data && response.data.data) {
            setZydusSelectedLabParams(response.data.data);
          }
        } catch (error) {
          console.error("Error fetching Zydus lab params for display:", error);
        }
      }
    };

    fetchZydusLabParamsForDisplay();
  }, [labReportID, patient_data?.patient_unique_id]);

  // Auto-open ConsultationDrawer when coming from Voice Recording page
  useEffect(() => {
    if (fromVoiceRecording && audioBlob) {
      setIsGenRxDrawerVisible(true);
      const clinic_name = getClinicName(profile?.hospital_data);
      trackEvent("TP_VoiceRx_Start", {
        patient_contact: patient_data?.pm_contact_no || "",
        patient_id: patient_data?.patient_unique_id || "",
        doctor_speciality: profile?.dp_name,
        doctor_unique_id: profile?.doctor_unique_id,
        clinic_name,
      });
    }
  }, [fromVoiceRecording, audioBlob]);

  // Auto-open ConsultationDrawer when coming from typed input (text Voice Rx)
  useEffect(() => {
    if (inputText && typeof inputText === 'string' && inputText.trim().length > 0) {
      setIsGenRxDrawerVisible(true);
      const clinic_name = getClinicName(profile?.hospital_data);
      trackEvent("TP_VoiceRx_Start", {
        patient_contact: patient_data?.pm_contact_no || "",
        patient_id: patient_data?.patient_unique_id || "",
        doctor_speciality: profile?.dp_name,
        doctor_unique_id: profile?.doctor_unique_id,
        clinic_name,
      });
    }
  }, [inputText]);

  // Check if we should show only ConsultationDrawer (coming from Voice Rx - typed input, dictation, or ambient)
  const showOnlyDrawer = isGenRxDrawerVisible && (
    // Typed input from Voice Rx
    (inputText && typeof inputText === 'string' && inputText.trim().length > 0) ||
    // Audio recording from Voice Rx (dictation or ambient mode)
    (fromVoiceRecording && audioBlob) ||
    // Coming from edit prescription (print view)
    caseManagerData?.smart_prescription_filename
  );

  return (
    <CashManagerContext.Provider value={contextApi}>
      <>
        {showOnlyDrawer && (
          <ConsultationDrawer
            visible={isGenRxDrawerVisible}
            onClose={() => setIsGenRxDrawerVisible(false)}
            labReportID={labReportID}
            digitizedData={digitizedData}
            typedInputText={inputText}
            mode={mode}
          />
        )}
        {!showOnlyDrawer && (
          <>
            <HeaderPrescription
              isVaccinationEnabled={isVaccinationAccessable}
              isGrowthChartEnabled={isGrowthChartAccessable}
              gynecHistory={updatedGynecHistory}
              labParamsData={labParamsData}
              zydusSelectedLabParams={zydusSelectedLabParams}
              handleGenRx={handleGenRx}
              handleVideoConsult={isVideoConsultAvailable ? handleVideoConsult : null}
              isVideoConsultLoading={isInitiatingCall}
              showTeleconsultIcon={(isNormalConsultFlow || (isEditRx && send_path === "patient_details")) && isTeleConsultEnabled && !!isVideoConsultAvailableType2}
              onTeleconsultClick={handleTeleconsultClick}
              isTeleconsultJoinLoading={isTeleconsultJoinLoading}
              isTeleconsultActive={!!joinToken}
              labReportID={labReportID}
              selectedCarePlan={selectedCarePlan}
              hasExistingCarePlan={hasExistingCarePlan}
              hideVoiceRxIcon={videoConsultData?.pam_status_type_appointment === 2}
            />
            <div className="w-100 bg-body wrapper2 prescription-wrapper">
          <img src={hey} alt="vitals" className="me-3 hey" />
          <div className="row">
            <div className="col-lg-4 col-md-12 col-12">
              {(isApexAIAccessable || tp_monetization_enable || isFreeVoiceRxUser) ? (
                <Tabs
                  className="obstetricTab"
                  activeKey={activeTab}
                  onChange={(key) => {
                    setActiveTab(key);
                    if (key === "apexAI") {
                      window.Moengage.track_event("TP_Apex_AI_Ack", {
                        clinic_name: getClinicName(profile?.hospital_data),
                        doctor_id: profile?.doctor_unique_id,
                        patient_number: patient_data?.pm_contact_no,
                        patient_id: patient_data?.patient_unique_id,
                      });
                    }
                  }}
                  centered
                >
                  <TabPane tab="Basic Info" key="basicInfo">
                    {CUSTOMIZED_PAD_LEFT_LIST()}
                  </TabPane>
                  <TabPane
                    tab={
                      <div style={{ position: "relative" }}>
                        <img
                          src={apexAIImg}
                          alt="apex-AI"
                          width={20}
                          height={20}
                          style={{ marginRight: 8 }}
                        />
                        TatvaAI
                        {isDDxReadyToGenerate && generatedDDx?.results?.length > 0 && (
                          <LoopingVideo
                            webm={blinkingDotWebm}
                            mp4={blinkingDotMp4}
                            width={20}
                            height={20}
                            style={{ position: "absolute", top: -12, right: -15 }}
                            ariaLabel="Updates available"
                          />
                        )}
                      </div>
                    }
                    key="apexAI"
                  >
                    {isGroundingAccessableForZydus && <div className="prescription-box-sm">
                      <GroundingBox handleGroundingKnowMore={handleGroundingKnowMore} />
                    </div>}
                    {(tp_monetization_enable || isFreeVoiceRxUser) && <div className="prescription-box-sm">
                      <GenRxBox setIsGenRxDrawerVisible={setIsGenRxDrawerVisible} handleGenRxKnowMore={handleGenRxKnowMore} />
                    </div>}
                    {(isApexAIAccessable || tp_monetization_enable) && <div className="prescription-box-sm">
                      <DDxList
                        generatedDDx={generatedDDx?.results}
                        handleDDxDrawer={handleDDxDrawer}
                        isDDxLoading={isDDxLoading}
                        handleDDxKnowMore={handleDDxKnowMore}
                        getGenerateDDx={getGenerateDDx}
                        handleDrawerVital={handleDrawerVital}
                        isDDxGenerated={isDDxGenerated}
                      />
                    </div>}
                  </TabPane>
                </Tabs>
              ) : (
                CUSTOMIZED_PAD_LEFT_LIST()
              )}
              {/* <div>
                <button className="btn btn-parameters mx-auto w-100">
                  <div className="align-items-center d-flex justify-content-center">
                    <i className="icon-Add me-2"></i> Add More Parameters
                  </div>
                </button>
              </div> */}
            </div>
            <div className="col-lg-8 col-md-12 col-12 mt-lg-0 mt-3">
              <Content>
                {showSCBanner && (
                  <SCBanner handleBanner={() => setShowSCBanner(false)} />
                )}
                {customizedPadRightList?.map((e, i) => {
                  let customModule = allAvailableModules?.find(
                    (m) => m.module_id === e.tmdpm_id
                  );

                  // If module not found in allAvailableModules, create fallback from moduleContents
                  if (!customModule && e.is_custom_module && customModuleContents?.length > 0) {
                    const moduleContent = customModuleContents.find(
                      (content) => content.module_id === e.tmdpm_id
                    );
                    
                    if (moduleContent) {
                      // Create a fallback module definition from the content
                      customModule = {
                        module_id: moduleContent.module_id,
                        name: moduleContent.module_name || e.tmdpm_name,
                        version: moduleContent.module_version || "v2",
                        // For V2 modules, extract namedFields from the first content row
                        namedFields: moduleContent.module_version === "v2" && moduleContent.content?.length > 0
                          ? Object.keys(moduleContent.content[0])
                              .filter((key) => key !== "id") // Exclude the id field
                              .map((key, index) => ({
                                fieldName: key,
                                fieldLabel: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
                                fieldType: "string",
                                isRequired: false,
                                order: index,
                              }))
                          : [],
                      };
                      console.warn(
                        `Using fallback module definition for ${e.tmdpm_id} from moduleContents`
                      );
                    }
                  }
                  return e.tmdpm_id === 5 && e.tmdpm_status === 0 ? (
                    <div
                      key={i}
                      className={`prescription-box-sm ${showShimmer ? "genrx-shimmer" : ""}`}
                      style={showShimmer ? { padding: "2px" } : {}}
                    >
                      {showShimmer && (
                        <LoopingVideo
                          webm={genRxBgWebm}
                          mp4={genRxBgMp4}
                          className="genrx-shimmer-video"
                          ariaLabel="Background"
                        />
                      )}
                      <div
                        className={showShimmer ? "genrx-shimmer-content" : ""}
                        style={
                          showShimmer
                            ? { background: "white", borderRadius: "17px" }
                            : {}
                        }
                      >
                        <SymptomsBox
                          handleDDxDrawer={handleDDxDrawer}
                          generatedDDx={generatedDDx?.results}
                        />
                      </div>
                    </div>
                  ) : e.tmdpm_id === 10 && e.tmdpm_status === 0 ? (
                    <div key={i} className="prescription-box-sm">
                      <ExaminationBox />
                    </div>
                  ) : e.tmdpm_id === 21 && e.tmdpm_status === 0 ? (
                    <div key={i} className="prescription-box-sm">
                      <SurgicalBox />
                    </div>
                  ) : e.tmdpm_id === 11 && e.tmdpm_status === 0 ? (
                    <div key={i} className="prescription-box-sm">
                      <DiagnosisBox
                        handleDDxDrawer={handleDDxDrawer}
                        generatedDDx={generatedDDx?.results}
                        getGenerateDDx={getGenerateDDx}
                        isDDxLoading={isDDxLoading}
                        handleDDxKnowMore={handleDDxKnowMore}
                        isDDxGenerated={isDDxGenerated}
                      />
                    </div>
                  ) : e.tmdpm_id === 12 && e.tmdpm_status === 0 ? (
                    <div key={i} className="prescription-box-sm">
                      <MedicationsBox />
                    </div>
                  ) : e.tmdpm_id === OPTHAL_PAD_MODULE_ID && e.tmdpm_status === 0 ? (
                      <div key={i} className="opthal-panel-wrapper">
                        <OphthalmologyExamPanel
                          patientData={patient_data}
                          showHeader
                          headerTitle="Ophthal"
                          loadPrevAllSignal={loadPrevOpthalSignal}
                          fetchLastOnMount={true}
                        />
                      </div>
                  ) : e.tmdpm_id === 13 && e.tmdpm_status === 0 ? (
                    <div key={i} className="prescription-box-sm">
                      <AdviceBox />
                    </div>
                  ) : e.tmdpm_id === 14 && e.tmdpm_status === 0 ? (
                    <div key={i} className="prescription-box-sm">
                      {" "}
                      <InvestigationBox
                        handleDDxDrawer={handleDDxDrawer}
                        generatedDDx={generatedDDx?.results}
                      />
                    </div>
                  ) : e.tmdpm_id === 15 && e.tmdpm_status === 0 ? (
                    <div key={i} className="prescription-box-sm">
                      <TabFollowUpBox />
                    </div>
                  ) : (
                    e.is_custom_module &&
                    e.tmdpm_status === 0 &&
                    customModule &&
                    (customModule.version === "v2" ? (
                      <CustomModuleV2 module={customModule} />
                    ) : (
                      <CustomModule module={customModule} />
                    ))
                  );
                })}
                
                {/* <AddCustomModule /> */}
                <AddCustomModuleV2 onOpenDrawer={() => setIsAddCustomModuleDrawerVisible(true)} />
                <AddCustomModuleDrawer
                  open={isAddCustomModuleDrawerVisible}
                  onClose={() => setIsAddCustomModuleDrawerVisible(false)}
                />
              </Content>
            </div>
          </div>
        </div>
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
            <Vaccination handleDrawerVaccination={handleDrawerVaccination} source={chartType ? "Patient Details" : "Consult"} />
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
            <Obstetric
              obstetricDetails={obstetricDetails}
              obstetricDrawer={obstetricDrawer}
              handleDrawerObstetric={handleDrawerObstetric}
              handleDrawerMedicalReport={handleDrawerMedicalReport}
            />
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
        {ddxKnowMoreDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            open={ddxKnowMoreDrawer}
            onClose={handleDDxKnowMore}
            className=".modalWidth-800"
            width={825}
          >
            <DDxKnowMore handleDDxKnowMore={handleDDxKnowMore} />
          </Drawer>
        )}
        {ddxDrawer && (
          <Drawer
            closeIcon={false}
            className="modalWidth-700"
            placement="right"
            open={ddxDrawer}
            onClose={handleDDxDrawer}
            width="auto"
            zIndex={999}
          >
            <DifferentialDiagnosisDrawer
              handleDDxDrawer={handleDDxDrawer}
              generatedDDx={generatedDDx?.results}
              includeExcludeInput={generatedDDx?.input}
              likeDislike={likeDislike}
              setLikeDislike={setLikeDislike}
            />
          </Drawer>
        )}

        {genRxKnowMoreDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            open={genRxKnowMoreDrawer}
            onClose={handleGenRxKnowMore}
            className=".modalWidth-800"
            width={825}
          >
            <GenRxKnowMore handleGenRxKnowMore={handleGenRxKnowMore} />
          </Drawer>
        )}

        {tatvaAiKnowMoreDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            open={tatvaAiKnowMoreDrawer}
            onClose={handleTatvaAiKnowMore}
            className=".modalWidth-800"
            width={825}
          >
            <TatvaAiKnowMore
              handleTatvaAiKnowMore={handleTatvaAiKnowMore}
              handleDDxKnowMore={handleDDxKnowMore}
              handleGenRxKnowMore={handleGenRxKnowMore}
            />
          </Drawer>
        )}

        {groundingKnowMoreDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            open={groundingKnowMoreDrawer}
            onClose={handleGroundingKnowMore}
            className=".modalWidth-800"
            width={825}
          >
            <GroundingKnowMore
              handleGroundingKnowMore={handleGroundingKnowMore}
            />
          </Drawer>
        )}

        <ExpiredSubModal
          title={subModalData && subModalData?.hasOwnProperty('service_name') && subModalData?.service_name}
          isSubModalOpen={isSubModalOpen}
          showHideSubModal={showHideSubModal} />

        {showSCPopup && !caseManagerData?.smart_prescription_filename && <SCPopup handlePopup={() => dispatch(setShowSCPopup(false))} handleGenRx={handleGenRx} />}
        {zydusTestReportDrawer && (
          <Drawer
            closeIcon={false}
            width={880}
            placement="right"
            open={zydusTestReportDrawer}
            onClose={handleZydusTestReportDrawer}
            bodyStyle={{ backgroundColor: "white" }}
          >
            <ZydusLabParams
              handleZydusTestReportDrawer={handleZydusTestReportDrawer}
              mrno={patient_data?.mrno}
              patientId={patient_data?.patient_unique_id}
              mrcNo={patient_data?.mrno}
              labReportID={labReportID}
              setLabReportID={setLabReportID}
              zydusSelectedLabParams={zydusSelectedLabParams}
              setZydusSelectedLabParams={setZydusSelectedLabParams}
              onSave={(newLabReportID) => {
                if (newLabReportID) {
                  setLabReportID(newLabReportID);
                }
              }}
              isBackModalOpen={isBackModalOpen}
              showHideBackModal={showHideBackModal}
              patientGender={patient_data?.pm_gender}
            />
          </Drawer>
        )}
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
          </>
        )}
      </>
    </CashManagerContext.Provider>
  );
}

export default Prescription;

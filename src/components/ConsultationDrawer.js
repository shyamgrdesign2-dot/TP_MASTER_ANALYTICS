import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  Suspense,
  lazy,
} from "react";
import {
  Drawer,
  Button,
  Input,
  message,
  Menu,
  Dropdown,
  Spin,
  Tooltip,
  Divider,
  AutoComplete,
} from "antd";
import styles from "./ConsultationDrawer.module.css";

import {
  editGenRxDetails,
  editAmbientRxDetails,
  getGenRx,
  getAmbientRx,
  setAddToRx,
  uploadVoiceAudio,
  createVoiceLog,
  updateVoiceLog,
  generateRx,
  updateGenRx,
  generateAmbientRx,
  updateAmbientRx,
} from "../api/services/ApiGenRx";

import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { getDecodedToken } from "../utils/localStorage";
import { useVoiceRxNavigation } from "../utils/voiceRxNavigation";
import { v4 as uuidv4 } from "uuid";
import CashManagerContext from "../context/CashManagerContext";
import {
  addCaseManager,
  editCaseManager,
  getInvestigationAndMedicine,
} from "../redux/caseManagerSlice";
import { placeIctOrder } from "../redux/appointmentsSlice";
import { useDispatch, useSelector } from "react-redux";
import { errorMessage, getClinicName, trackEvent, getTokenData, getDeviceSdkData, isVoiceRxFree, getSupportedMimeType, removeBeforeWhiteSpace, getHmTypeIndicator, getClinic, stopAllActiveRecorders } from "../utils/utils";
import { vitalScalarString } from "../utils/symptomCollectorVitalsMerge";
import {
  ensureLabInvestigationMetadataForRxSave,
  ensureMedicationGroundedForRxSave,
  mergeVoiceApiPrescriptionWithPrior,
  preparePreviousContextRxItems,
} from "../utils/medicationRxPayload";

import CommonModal from "../common/CommonModal";
import ProfilePopover from "../common/ProfilePopover";
import BubbleSkeleton from "./BubbleSkeleton";
import VoiceWaveVisualizer from "./WaveVisualizer";

import DigitisedPrescription from "./DigitisedPrescription";
import {
  ADD,
  FAILED_VERIFICATION,
  FREE,
  GB_APOLLO_DISABLE_FEATURE,
  GB_ZYDUS_USER,
  MESSAGE_KEY,
  S_DDX,
  S_VOICE_RX,
  S_AMBIENT_VOICE_RX,
  GB_VOICE_RX_FREE,
} from "../utils/constants";

import { checkCredits, updateCredits } from "../redux/monetizationSlice";
import ExpiredSubModal from "../pages/monetization/components/ExpiredSubModal";
import FreeTrialButton from "../pages/monetization/components/FreeTrialButton";
import { services } from "../redux/doctorsSlice";
import SCBanner from "./SCBanner";
import GenRxKnowMore from "./GenRxKnowMore";
import { setSelectAutofill } from "../redux/ddxSlice";

import VideoModal from "../common/VideoModal";

import LoopingVideo from "../components/common/LoopingVideo";
import CustomMedicinePopup from "./CustomMedicinePopup";
import {
  getFrequentlySearchedMedication,
  searchMedication,
} from "../redux/medicationSlice";
import ApiMedication from "../api/services/ApiMedication";
import ApiInvestigation from "../api/services/ApiInvestigation";
import { addPatientLabReports } from "../api/services/ApiLabParams";
import ApiVitals from "../api/services/ApiVitals";
import { prescriptionLabResultsToResultsArray } from "../utils/labResultsUtils";
import { prescriptionMedicalHistoryToContextFormat } from "../utils/medicalHistoryUtils";
import { resolveMedicalHistoryForCaseManager } from "../utils/medicalHistoryUtils";
import ApiMedicalHistory from "../api/services/ApiMedicalHistory";
import { enrichVitalsWithCalculations } from "../utils/vitalsCalculations";
import { getNormalizedGynecHistory, normalizeGynecHistoryFromApi, syncGynecHistoryAfterEndVisit } from "../utils/gynecHistoryUtils";
import { getGynecDetails, postGynecDetails, updateGynecDetails } from "../api/services/ApiGynec";
import { getVitals, setListVitalsToday, setVitalsIdsFromAddVitals, clearListVitalsToday, resetVitalsState } from "../redux/vitalsSlice";
import { env } from "../EnvironmentConfig";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import {
  getFrequentlySearchedInvestigation,
  searchInvestigation,
} from "../redux/investigationSlice";
import config from "../config";
import { isMobile } from "react-device-detect";
import GenRXLoaders from "./GenRxLoaders";
import { ASSETS } from "../assets";
const {
  deleteGenRx: deleteIcon,
  micGenRx: micIcon,
  pause: pauseIcon,
  voiceRxButton,
  voiceRxSendButton,
  vitalsIcons,
  stopIcon,
  microphone2: muteIcon,
  mutedMicrophoneIconNew: mutedMicrophoneIcon,
  ellipse895,
  tutorialIcon,
  deleteIconBlue: deleteModuleIcon,
  alerticon: alertIcon,
  intersect: zydusDataEngineIcon,
  doctorAvatar,
  arrowBoxDown,
  dictateActive: dictateActiveIcon,
  ambientModeActive: ambientActiveIcon,
  templateTimeIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  grow: growIcon,
  accuracy: accuracyIcon,
  healthCare: healthIcon,
  tubeIcon: playIcons,
  newGif_3: tagNewWebm,
  newGif_2: tagNewMp4,
} = ASSETS.images;

const ConsultationDrawer = ({
  visible,
  onClose,
  labReportID,
  digitizedData,
  typedInputText,
  mode,
}) => {
  const { servicesList } = useSelector((state) => state.doctors);
  const VOICE_RX_planDetails = servicesList?.find(
    (e) => e.service_name === S_VOICE_RX
  );

  const { useVoiceRx, setUseVoiceRx, useDDX, medicalHistoryData, setMedicalHistoryData } = useContext(CashManagerContext);

  const { state } = useLocation();
  const { patient_data, caseManagerData, fromVoiceRecording, audioBlob: audioBlobFromLocation, micBeingUsed: micBeingUsedFromVoiceConsult, consent, noStayClickCount, crossButtonClickCount, mutePauseButtonClickCount } = state || {};
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const isAutoFocusShownRef = useRef(false);
  const hasAutoSubmittedRef = useRef(false);
  const [symptomsCollectorData, setSymptomsCollectorData] = useState(null);
  const [localModules, setLocalModules] = useState([]);
  const [genRxDetails, setGenRxDetails] = useState(null);
  const [fullTranscript, setFullTranscript] = useState("");
  const [conversations, setConversations] = useState([]);
  const [showPrescription, setShowPrescription] = useState(
    caseManagerData?.smart_prescription_filename || false
  );
  const [inputText, setInputText] = useState("");
  const hasTypedInput = inputText.trim().length > 0;
  const [isEditing, setIsEditing] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(true);
  const [expandedTranscripts, setExpandedTranscripts] = useState(new Set([0])); // Track which transcript cards are expanded
  const [audioDuration, setAudioDuration] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [editableText, setEditableText] = useState("");
  const [editableQuery, setEditableQuery] = useState("");
  const [genRxKnowMoreDrawer, setGenRxKnowMoreDrawer] = useState(false);
  const [showInstructionMessage, setShowInstructionMessage] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [editableLineItem, setEditableLineItem] = useState("");
  const [editableName, setEditableName] = useState("");
  const [searchParentQuery, setSearchParentQuery] = useState("");
  const [parentSearchOptions, setParentSearchOptions] = useState([]);
  // const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [editableKey, setEditableKey] = useState("");
  const [queries, setQueries] = useState([]); // Array of { text, isAudio, duration }
  const [isRxEdited, setIsRxEdited] = useState(false);
  const [isEndVisitLoading, setIsEndVisitLoading] = useState(false);
  // Track which sections were initially populated from API - these should remain visible even if content is deleted
  const initiallyPopulatedSectionsRef = useRef(new Set());
  // Track which medical history types were initially populated
  const initiallyPopulatedMedicalHistoryTypesRef = useRef(new Set());

  const submitCountRef = useRef(fromVoiceRecording ? 1 : 0);
  const initialMedicationsRef = useRef(null);
  const typedMessagesCountRef = useRef(0);
  const crossButtonClickCountRef = useRef(crossButtonClickCount || 0);
  const mutePauseButtonClickCountRef = useRef(mutePauseButtonClickCount || 0);
  const digitizationPadEditCountRef = useRef(0);
  const lastDigitizeDataRef = useRef(null);
  const micBeingUsedRef = useRef((micBeingUsedFromVoiceConsult || "").trim() || "Unknown");
  const voiceSessionIdRef = useRef(`voice-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  // Session-level aggregation used for `TP_Voice_endVisit`
  const voiceSessionStartTimeRef = useRef(null); // set on first submit click
  const voiceApiSuccessRef = useRef(false);
  const voiceApiFailedRef = useRef(false);
  const prescriptionUrlsForSessionRef = useRef(new Set());
  const editedModulesByUserRef = useRef(new Set());
  const voiceCallCountRef = useRef(0);
  useEffect(() => {
    window.__TATVA_VOICE_SESSION_ID = voiceSessionIdRef.current;
    return () => {
      if (window.__TATVA_VOICE_SESSION_ID === voiceSessionIdRef.current) {
        delete window.__TATVA_VOICE_SESSION_ID;
      }
    };
  }, []);
  const [isAmbientMode, setIsAmbientMode] = useState(() => {
    const activeService = window.TATVA_ACTIVE_VOICE_SERVICE;
    return activeService === S_AMBIENT_VOICE_RX;
  });
  const [pendingSelection, setPendingSelection] = useState(null);
  const decodedToken = getDecodedToken();
  const doctorId = decodedToken?.result?.user_id;
  const [audioBlob, setAudioBlob] = useState(audioBlobFromLocation || null);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [showSCBanner, setShowSCBanner] = useState(false);
  const dispatch = useDispatch();
  const { profile, siteId, storeCode, userId } = useSelector((state) => state.doctors);
  const { listVitalsTodayIds } = useSelector((state) => state.vitals);
  const clinic = getClinic(profile?.hospital_data);
  const listVitalsPatientIdRef = useRef(null);
  const persistVitalsInFlightRef = useRef(false);
  const { parentOptionsList: medicationParentOptionsList } = useSelector(
    (state) => state.medication
  );
  const { parentOptionsList: investigationParentOptionsList } = useSelector(
    (state) => state.investigation
  );
  const { symptomCollector, isAutofillSelected, selectedSymptomsCollector } =
    useSelector((state) => state.ddx);
  const { TextArea } = Input;

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const [shouldShowVideo, setShowVideo] = useState(false);
  const isApolloHosBusinessIdAccessableFromGB = useFeatureIsOn(
    GB_APOLLO_DISABLE_FEATURE
  );
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const tokenData = getTokenData();
  const isGroundingAccessableForZydus =
    tokenData?.hospital_business_id == env.zydus_business_id &&
    isZydusUserAccessableFromGB;
  const videoLink = {
    link: "https://www.youtube.com/embed/mAZ7Sa86PnQ",
    thumbnail: "https://i.ytimg.com/vi/mAZ7Sa86PnQ/hqdefault.jpg",
    title: "Voice Rx Tutorial"
  };
  const isSymptomCollectorJSON = useCallback((text) => {
    if (typeof text !== "string") return false;
    const trimmed = text.trim();
    let toParse = trimmed;
    // Handle "Input: {...} , Previous Context: ..." format (e.g. dictate mode API response)
    if (trimmed.includes("Input:") && trimmed.includes("{")) {
      const startIdx = trimmed.indexOf("{");
      if (startIdx >= 0) {
        let depth = 0;
        let endIdx = -1;
        for (let i = startIdx; i < trimmed.length; i++) {
          if (trimmed[i] === "{") depth++;
          else if (trimmed[i] === "}") {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }
        if (endIdx >= 0) {
          toParse = trimmed.substring(startIdx, endIdx + 1);
        }
      }
    }
    if (!toParse.startsWith("{") || !toParse.endsWith("}")) return false;
    try {
      const parsed = JSON.parse(toParse);
      if (!parsed || typeof parsed !== "object") return false;
      return (
        Array.isArray(parsed.symptoms) ||
        Array.isArray(parsed.medicalHistory) ||
        typeof parsed.notes === "string" ||
        typeof parsed.others === "string"
      );
    } catch (error) {
      return false;
    }
  }, []);
  const isFirstTranscriptJSON = useMemo(() => {
    if (Array.isArray(queries) && queries.length > 0) {
      const firstQuery = queries[0];
      const firstText = typeof firstQuery === 'string'
        ? firstQuery
        : (firstQuery?.text || firstQuery?.message || firstQuery?.content || '');
      return isSymptomCollectorJSON(firstText);
    }
    if (fullTranscript) {
      return isSymptomCollectorJSON(fullTranscript);
    }
    if (genRxDetails?.source) {
      return isSymptomCollectorJSON(genRxDetails.source);
    }
    if (typedInputText) {
      return isSymptomCollectorJSON(typedInputText);
    }
    return false;
  }, [queries, fullTranscript, genRxDetails?.source, typedInputText, isSymptomCollectorJSON]);

  useEffect(() => {
    if (mode === 'ambient') {
      setIsAmbientMode(true);
      window.TATVA_ACTIVE_VOICE_SERVICE = S_AMBIENT_VOICE_RX;
    } else if (mode === 'dictation') {
      setIsAmbientMode(false);
      window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
    } else {
      const activeService = window.TATVA_ACTIVE_VOICE_SERVICE;
      setIsAmbientMode(activeService === S_AMBIENT_VOICE_RX);
    }
  }, [visible, mode]);

  useEffect(() => {
    if (!visible) {
      initiallyPopulatedSectionsRef.current.clear();
      initiallyPopulatedMedicalHistoryTypesRef.current.clear();
      lastDigitizeDataRef.current = null;
      listVitalsPatientIdRef.current = null;
      dispatch(resetVitalsState());
      if (typeof setMedicalHistoryData === "function") {
        setMedicalHistoryData([]);
      }
    }
  }, [visible, dispatch, setMedicalHistoryData]);

  // Voice/Ambient: listVitals once per patient when drawer opens (avoid duplicate API calls)
  useEffect(() => {
    const isVoiceOrAmbientRx = isAmbientMode || mode === 'ambient' || mode === 'dictation' || fromVoiceRecording ||
      window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient';
    if (!visible || !patient_data?.patient_unique_id || !isVoiceOrAmbientRx) return;
    const pid = patient_data.patient_unique_id;
    if (listVitalsPatientIdRef.current === pid) return;
    if (listVitalsPatientIdRef.current != null && listVitalsPatientIdRef.current !== pid) {
      dispatch(clearListVitalsToday());
    }
    listVitalsPatientIdRef.current = pid;
    const today = moment().format('YYYY-MM-DD');
    const listPayload = {
      patient_unique_id: patient_data.patient_unique_id,
      pam_id: patient_data.pam_id ?? 0,
      mode: ADD,
      pm_pid: patient_data.pm_pid ?? 0,
      pm_id: patient_data.pm_id ?? 0
    };
    ApiVitals.getVitals(listPayload)
      .then((listRes) => {
        const list = listRes?.data && Array.isArray(listRes.data) ? listRes.data : [];
        const existingToday = list.find(v => (v.date || v.createdAt || v.created_at || '').toString().startsWith(today));
        const flow = isAmbientMode || genRxDetails?.type === 'ambient' ? 'ambient' : 'voice';
        dispatch(setListVitalsToday({
          flow,
          patient_unique_id: patient_data.patient_unique_id,
          tcv_id: existingToday?.tcv_id ?? 0,
          tcbc_id: existingToday?.tcbc_id ?? 0,
          dev_unique_id: existingToday?.dev_unique_id ?? 0,
        }));
      })
      .catch(() => {
        listVitalsPatientIdRef.current = null;
      });
  }, [visible, patient_data?.patient_unique_id, isAmbientMode, mode, fromVoiceRecording, genRxDetails?.type, dispatch]);

  useEffect(() => {
    if (audioBlob && audioBlob instanceof Blob) {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      audio.src = url;
      
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        setAudioDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        URL.revokeObjectURL(url);
      });
    }
  }, [audioBlob, fromVoiceRecording]);

  // Set audio duration from genRxDetails when editing a prescription
  useEffect(() => {
    if (!audioBlob && !fromVoiceRecording) {
      if (genRxDetails?.source_duration !== undefined && genRxDetails?.source_duration !== null) {
        const duration = genRxDetails.source_duration;
        // Handle duration as seconds (even if it's 0)
        if (typeof duration === 'number' && duration >= 0) {
          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);
          const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          setAudioDuration(formattedDuration);
        }
      }
    }
  }, [genRxDetails?.source_duration, audioBlob, fromVoiceRecording, genRxDetails]);

  useEffect(() => {
    if (!visible) {
      hasAutoSubmittedRef.current = false;
      stopAllActiveRecorders();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      window.mediaRecorderRef = null;
      window.audioStreamRef = null;
    }
  }, [visible]);

  useEffect(() => {
    if (hasAutoSubmittedRef.current) return;
    
    const shouldAutoSubmit = visible && fromVoiceRecording && audioBlob && !isProcessing && !prescriptionData;
    if (!shouldAutoSubmit) return;

    hasAutoSubmittedRef.current = true;

    const run = async () => {
      try {
        await new Promise((r) => setTimeout(r, 80));
        setShowPrescription(true);
        setRecordingTime(0);
        setIsProcessing(true);

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          await new Promise((r) => setTimeout(r, 80));
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        setIsRecording(false);
        setIsPaused(false);

        await handleVoiceDigitize(audioBlob, "");
      } catch (e) {
        console.error('Auto submit failed:', e);
        setIsProcessing(false);
        hasAutoSubmittedRef.current = false;
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, fromVoiceRecording, audioBlob]);

  useEffect(() => {
    if (hasAutoSubmittedRef.current) return;
    
    const shouldSubmitTyped =
      visible && !fromVoiceRecording && typedInputText && !isProcessing && !prescriptionData;
    if (!shouldSubmitTyped) return;

    hasAutoSubmittedRef.current = true;
    // Increment typed messages count for auto-submit
    typedMessagesCountRef.current += 1;

    const run = async () => {
      try {
        await new Promise((r) => setTimeout(r, 60));
        setShowPrescription(true);
        setIsProcessing(true);
        await handleVoiceDigitize(null, typedInputText);
      } catch (e) {
        console.error('Typed submit failed:', e);
        setIsProcessing(false);
        hasAutoSubmittedRef.current = false;
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, typedInputText]);

  
  useEffect(() => {
    if (prescriptionData && Object.keys(prescriptionData).length > 0) {
      setShowPrescription(true);
    }
  }, [prescriptionData]);

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen(!isSubModalOpen);

    const clinic_name = getClinicName(profile?.hospital_data);
    const deviceSdkData = getDeviceSdkData();
    window.Moengage.track_event("TP_voiceRx_FreeTrailInfo", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_unique_id: profile?.doctor_unique_id,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      um_id: tokenData?.user_id,
      clinic_Name: clinic_name,
      ...deviceSdkData,
    });
  }, [isSubModalOpen]);

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);

  const navigate = useNavigate();
  const navigateVoiceRx = useVoiceRxNavigation();

  const { tcmId, consultationDate, pamId } = useContext(CashManagerContext);

  const textAreaRef = useRef(null);

  // Split view resizer state
  const splitRef = useRef(null);
  const isResizingRefSplit = useRef(false);
  
  const getInitialWidthPercent = () => {
    if (typeof window === 'undefined') return 33;
    const screenWidth = window.innerWidth;
    // iPad mini (1024x768)
    if (screenWidth >= 768 && screenWidth <= 1024) {
      return 30;
    }
    // iPad Air (1180x820)
    if (screenWidth > 1024 && screenWidth <= 1180) {
      return 32;
    }
    // iPad Pro (1366x1024)
    if (screenWidth > 1180 && screenWidth <= 1366) {
      return 33;
    }
    if (screenWidth >= 1920) return 25;
    if (screenWidth >= 1440) return 33;
    return 33;
  };
  
  const [leftWidthPercent, setLeftWidthPercent] = useState(getInitialWidthPercent());

  const onMouseMoveResizer = useCallback((e) => {
    if (!isResizingRefSplit.current || !splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const totalWidth = rect.width;
    const screenWidth = window.innerWidth;
    
    // Device-aware min/max widths
    let minLeftWidthPx, minRxPadWidthPx;
    if (screenWidth >= 768 && screenWidth <= 1024) {
      // iPad mini
      minLeftWidthPx = 280;
      minRxPadWidthPx = 600;
    } else if (screenWidth > 1024 && screenWidth <= 1180) {
      // iPad Air
      minLeftWidthPx = 320;
      minRxPadWidthPx = 700;
    } else if (screenWidth > 1180 && screenWidth <= 1366) {
      // iPad Pro
      minLeftWidthPx = 360;
      minRxPadWidthPx = 800;
    } else {
      // Desktop
      minLeftWidthPx = 480;
      minRxPadWidthPx = 960;
    }
    
    const minLeftPercent = (minLeftWidthPx / totalWidth) * 100;
    const maxLeftPercent = ((totalWidth - minRxPadWidthPx) / totalWidth) * 100;
    
    const pct = (relativeX / totalWidth) * 100;
    
    if (totalWidth >= minLeftWidthPx + minRxPadWidthPx) {
      const clamped = Math.min(maxLeftPercent, Math.max(minLeftPercent, pct));
    setLeftWidthPercent(clamped);
    } else {
      const clamped = Math.min(100, Math.max(0, pct));
      setLeftWidthPercent(clamped);
    }
  }, []);

  const stopResizing = useCallback(() => {
    if (!isResizingRefSplit.current) return;
    isResizingRefSplit.current = false;
    document.removeEventListener("mousemove", onMouseMoveResizer);
    document.removeEventListener("mouseup", stopResizing);
  }, [onMouseMoveResizer]);

  const startResizing = useCallback(() => {
    isResizingRefSplit.current = true;
    document.addEventListener("mousemove", onMouseMoveResizer);
    document.addEventListener("mouseup", stopResizing);
  }, [onMouseMoveResizer, stopResizing]);

  useEffect(() => {
    const handleWindowResize = () => {
      if (!splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      const screenWidth = window.innerWidth;
      
      // Device-aware min/max widths
      let minLeftWidthPx, minRxPadWidthPx;
      if (screenWidth >= 768 && screenWidth <= 1024) {
        // iPad mini
        minLeftWidthPx = 280;
        minRxPadWidthPx = 600;
      } else if (screenWidth > 1024 && screenWidth <= 1180) {
        // iPad Air
        minLeftWidthPx = 320;
        minRxPadWidthPx = 700;
      } else if (screenWidth > 1180 && screenWidth <= 1366) {
        // iPad Pro
        minLeftWidthPx = 360;
        minRxPadWidthPx = 800;
      } else {
        // Desktop
        minLeftWidthPx = 480;
        minRxPadWidthPx = 960;
      }
      
      if (totalWidth >= minLeftWidthPx + minRxPadWidthPx) {
        const minLeftPercent = (minLeftWidthPx / totalWidth) * 100;
        const maxLeftPercent = ((totalWidth - minRxPadWidthPx) / totalWidth) * 100;
        
        const currentLeftPx = (leftWidthPercent / 100) * totalWidth;
        const currentRxPadPx = totalWidth - currentLeftPx;
        
        if (currentLeftPx < minLeftWidthPx) {
          setLeftWidthPercent(minLeftPercent);
        } else if (currentRxPadPx < minRxPadWidthPx) {
          setLeftWidthPercent(maxLeftPercent);
        }
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [leftWidthPercent]);

  useEffect(() => {
    if (caseManagerData?.smart_prescription_filename) {
      getGenRxDetails();
    }
  }, [caseManagerData?.smart_prescription_filename]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!splitRef.current) return;
      const totalWidth = splitRef.current.getBoundingClientRect().width || window.innerWidth;
      const screenWidth = window.innerWidth;
      
      // Device-aware sizing
      let desiredLeftPx, minLeftPx, minRightPx;
      if (screenWidth >= 768 && screenWidth <= 1024) {
        // iPad mini
        desiredLeftPx = 300;
        minLeftPx = 280;
        minRightPx = 600;
      } else if (screenWidth > 1024 && screenWidth <= 1180) {
        // iPad Air
        desiredLeftPx = 360;
        minLeftPx = 320;
        minRightPx = 700;
      } else if (screenWidth > 1180 && screenWidth <= 1366) {
        // iPad Pro
        desiredLeftPx = 400;
        minLeftPx = 360;
        minRightPx = 800;
      } else {
        // Desktop
        desiredLeftPx = 480;
        minLeftPx = 480;
        minRightPx = 960;
      }
      
      const minLeftPercent = (minLeftPx / totalWidth) * 100;
      const maxLeftPercent = ((totalWidth - minRightPx) / totalWidth) * 100;
      let pct = (desiredLeftPx / totalWidth) * 100;
      if (!isFinite(pct)) pct = getInitialWidthPercent();
      const clamped = Math.max(minLeftPercent, Math.min(maxLeftPercent, pct));
      setLeftWidthPercent(clamped);
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAutoFocusShownRef.current) return;
    if (!prescriptionData || activeIndex !== null || activeType !== null)
      return;

    const fieldsToCheck = [
      { name: "vitalsAndBodyComposition", type: "object" },
      { name: "medicalHistory", type: "array" },
      { name: "symptoms", type: "array" },
      { name: "examinations", type: "array" },
      { name: "diagnosis", type: "array" },
      { name: "medications", type: "array" },
      { name: "labInvestigation", type: "array" },
      { name: "advice", type: "array" },
      { name: "vaccinations", type: "array" },
      { name: "others", type: "array" },
      { name: "dynamicFields", type: "object" },
      { name: "followUp", type: "string" },
    ];

    for (const field of fieldsToCheck) {
      if (
        field.type === "object" &&
        field.name === "vitalsAndBodyComposition"
      ) {
        const keysWithValue = Object.entries(prescriptionData[field.name] || {})
          .filter(([_, value]) => value)
          .map(([key]) => key);
        if (keysWithValue?.length) {
          setTimeout(() => {
            isAutoFocusShownRef.current = true;
            return handleKeyEditClick(keysWithValue[0]);
          }, 0);
          return;
        }
      } else if (field.type === "object" && field.name === "dynamicFields") {
        const modules = Object.keys(prescriptionData[field.name] || {});
        if (
          modules.length &&
          prescriptionData[field.name][modules[0]]?.length
        ) {
          setTimeout(() => {
            isAutoFocusShownRef.current = true;
            return handleItemClick(modules[0], 0, true);
          }, 100);
          return;
        }
      } else if (field.type === "array") {
        if (prescriptionData[field.name]?.length) {
          setTimeout(() => {
            isAutoFocusShownRef.current = true;
            if (["advice", "others"].includes(field.name)) {
              return handleItemClick(field.name, 0);
            }
            return handleLineItemClick(field.name, 0);
          }, 100);
          return;
        }
      } else if (field.type === "string") {
        if (prescriptionData[field.name]) {
          setTimeout(() => {
            isAutoFocusShownRef.current = true;
            return handleItemClick(field.name);
          }, 100);
          return;
        }
      }
    }
  }, [prescriptionData, activeIndex, activeType]);

  useEffect(() => {
    if (symptomCollector && Object.keys(symptomCollector)?.length > 0) {
      setShowSCBanner(true);
    }
  }, [symptomCollector]);

  const getFormattedSymptomsCollectorData = (selectedSymptomsCollector) => {
    return {
      ...(selectedSymptomsCollector?.symptoms?.length && {
        symptoms: selectedSymptomsCollector.symptoms,
      }),
      ...(selectedSymptomsCollector?.medicalHistory?.some(
        (obj) => obj.items?.length
      ) && {
        medicalHistory: selectedSymptomsCollector.medicalHistory.flatMap(
          (obj) => obj.items
        ),
      }),
      ...(selectedSymptomsCollector?.notes && {
        others: [selectedSymptomsCollector.notes],
      }),
    };
  };

  useEffect(() => {
    if (
      typedInputText ||
      !isAutofillSelected ||
      !selectedSymptomsCollector ||
      Object.keys(selectedSymptomsCollector)?.length === 0
    ) {
      return;
    }
      const formattedSymptomsCollectorData = getFormattedSymptomsCollectorData(
        selectedSymptomsCollector
      );
      setSymptomsCollectorData(formattedSymptomsCollectorData);
      setPrescriptionData((prev) => {
        const next = formattedSymptomsCollectorData;
        const labResults = (Array.isArray(next?.labResults) && next.labResults.length > 0)
          ? next.labResults
          : (Array.isArray(prev?.labResults) && prev.labResults.length > 0 ? prev.labResults : []);
        return { ...next, labResults };
      });
      setShowPrescription(true);

      if (!caseManagerData?.smart_prescription_filename) {
        handleVoiceDigitize(null, null, true);
      }
  }, [selectedSymptomsCollector, isAutofillSelected, typedInputText]);

  useEffect(() => {
    let interval;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const getGenRxDetails = async () => {
    try {
      // First, call getGenRx to check the conversation field
      const initialResponse = await getGenRx(caseManagerData?.smart_prescription_filename);

      if (initialResponse.success && initialResponse.data) {
        // Check if conversation exists and has data in the history
        const conversation = initialResponse.data?.history?.[0]?.conversation;
        const hasConversation = conversation && Array.isArray(conversation) && conversation.length > 0;
        
        // Set ambient mode based on conversation field
        if (hasConversation) {
          setIsAmbientMode(true);
          window.TATVA_ACTIVE_VOICE_SERVICE = S_AMBIENT_VOICE_RX;
        } else {
          setIsAmbientMode(false);
          if (window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX) {
            window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
          }
        }
        
        let response = initialResponse;
        
        // If conversation has doctor and patient conversation, call ambient API
        if (hasConversation) {
          const ambientResponse = await getAmbientRx(caseManagerData?.smart_prescription_filename);
          if (ambientResponse.success) {
            response = ambientResponse;
          }
        }
        // If conversation is null or empty, use the dictate mode response (initialResponse)

        const payload = response.data ?? response.response;
        if (response.success && payload) {
          const d = payload;
          // Ambient = conversation in history (API returns history[].conversation, no rxDigitizationHistory)
          const isAmbient = hasConversation || (d?.history?.[0]?.conversation?.length ?? 0) > 0;

          // GET: prefer editedData; fallback to digitizeData, then refinedData
          let prescriptionData = d.editedData ?? d.digitizeData ?? null;
          if (!prescriptionData) {
            prescriptionData = d.refinedData ?? null;
          }
          if (!prescriptionData) {
            const digitize = d.digitize ?? d.history?.[0]?.digitize;
            if (digitize && typeof digitize === "object" && !Array.isArray(digitize)) {
              const numericKeys = Object.keys(digitize).filter((k) => /^\d+$/.test(k));
              prescriptionData = numericKeys.length ? digitize[numericKeys[0]] : digitize;
            } else if (digitize) {
              prescriptionData = digitize;
            }
          }
          if (prescriptionData) {
            prescriptionData = mapDigitizeDataToPrescription(prescriptionData);
          }

          // Single path for all modules: initiallyPopulated, validate, setPrescriptionData, medicalHistory (same as voice/snap/smart)
          if (prescriptionData) {
            if (prescriptionData.symptoms && Array.isArray(prescriptionData.symptoms) && prescriptionData.symptoms.length > 0) {
              initiallyPopulatedSectionsRef.current.add('symptoms');
            }
            if (prescriptionData.surgeries && Array.isArray(prescriptionData.surgeries) && prescriptionData.surgeries.length > 0) {
              initiallyPopulatedSectionsRef.current.add('surgeries');
            }
            if (prescriptionData.vaccinations && Array.isArray(prescriptionData.vaccinations) && prescriptionData.vaccinations.length > 0) {
              initiallyPopulatedSectionsRef.current.add('vaccinations');
            }
            if (prescriptionData.medicalHistory && Array.isArray(prescriptionData.medicalHistory) && prescriptionData.medicalHistory.length > 0) {
              initiallyPopulatedSectionsRef.current.add('medicalHistory');
              prescriptionData.medicalHistory.forEach(item => {
                const type = item.type?.toLowerCase().replace(/\s+/g, '_') || 'others';
                initiallyPopulatedMedicalHistoryTypesRef.current.add(type);
              });
            }
            if (prescriptionData.examinations && Array.isArray(prescriptionData.examinations) && prescriptionData.examinations.length > 0) {
              initiallyPopulatedSectionsRef.current.add('examinations');
            }
            if (prescriptionData.diagnosis && Array.isArray(prescriptionData.diagnosis) && prescriptionData.diagnosis.length > 0) {
              initiallyPopulatedSectionsRef.current.add('diagnosis');
            }
            if (prescriptionData.advice && ((typeof prescriptionData.advice === 'string' && prescriptionData.advice.trim()) || (Array.isArray(prescriptionData.advice) && prescriptionData.advice.length > 0))) {
              initiallyPopulatedSectionsRef.current.add('advice');
            }
            if (prescriptionData.others && Array.isArray(prescriptionData.others) && prescriptionData.others.length > 0) {
              initiallyPopulatedSectionsRef.current.add('others');
            }
            if (prescriptionData.followUp && prescriptionData.followUp.trim()) {
              initiallyPopulatedSectionsRef.current.add('followUp');
            }
            if (prescriptionData.vitalsAndBodyComposition && Object.keys(prescriptionData.vitalsAndBodyComposition).length > 0) {
              initiallyPopulatedSectionsRef.current.add('vitalsAndBodyComposition');
            }
            if (prescriptionData.labResults && Array.isArray(prescriptionData.labResults) && prescriptionData.labResults.length > 0) {
              initiallyPopulatedSectionsRef.current.add('labResults');
            }
            if (prescriptionData.medications && Array.isArray(prescriptionData.medications) && prescriptionData.medications.length > 0) {
              initiallyPopulatedSectionsRef.current.add('medications');
            }
            if (prescriptionData.labInvestigation && Array.isArray(prescriptionData.labInvestigation) && prescriptionData.labInvestigation.length > 0) {
              initiallyPopulatedSectionsRef.current.add('labInvestigation');
            }
            if (prescriptionData.dynamicFields && typeof prescriptionData.dynamicFields === 'object') {
              Object.entries(prescriptionData.dynamicFields).forEach(([moduleName, moduleData]) => {
                if (Array.isArray(moduleData) && moduleData.length > 0) {
                  initiallyPopulatedSectionsRef.current.add(`dynamicFields.${moduleName}`);
                }
              });
            }

            const validatedPrescriptionData = validatePrescriptionData(prescriptionData);
            if (validatedPrescriptionData) {
              setPrescriptionData((prev) => {
                const next = mergeVoiceApiPrescriptionWithPrior(prev, validatedPrescriptionData);
                const labResults = (Array.isArray(next?.labResults) && next.labResults.length > 0)
                  ? next.labResults
                  : (Array.isArray(prev?.labResults) && prev.labResults.length > 0 ? prev.labResults : []);
                return { ...next, labResults };
              });
              if (validatedPrescriptionData?.medicalHistory?.length > 0 && setMedicalHistoryData) {
                const convertedData = convertMedicalHistoryToContextFormat(validatedPrescriptionData.medicalHistory, medicalHistoryData);
                setMedicalHistoryData(convertedData);
              }
              const vitals = validatedPrescriptionData.vitalsAndBodyComposition;
              const rawVitalsInitial = prescriptionData.vitalsAndBodyComposition;
              const hasResponseVitals = vitals && Object.keys(vitals).length > 0 &&
                Object.values(vitals).some(v => { const s = String(v ?? '').trim(); return s !== '' && s !== 'undefined' && s !== 'null'; });
              if (hasResponseVitals) {
                persistVitalsFromApiResponse(vitals).then(applyVitalsIdsToPrescription);
              } else if (rawVitalsInitial && Object.keys(rawVitalsInitial).length > 0 && Object.values(rawVitalsInitial).some(v => String(v ?? '').trim().length > 10)) {
                persistVitalsFromApiResponse(rawVitalsInitial).then(applyVitalsIdsToPrescription);
              }
            }
          }

        if (isAmbient) {
          // Ambient: conversations from history[] (each item = one turn; include TEXT_WITH_CONTEXT as transcript-only, no bubbles)
          const historyItems = d?.history?.filter(h =>
            (Array.isArray(h.conversation) && h.conversation.length > 0) ||
            (h.transcription && h.transcription.trim()) ||
            (h.source && typeof h.source === 'string' && h.source.trim())
          ) ?? [];

          const ambientQueries = historyItems.map((h) => {
            const isTextOnly = h.type === 'TEXT_WITH_CONTEXT';
            const text = h.transcription ?? (typeof h.source === 'string' ? h.source : '') ?? '';
            if (isTextOnly) {
              return { conversations: [], isAudio: false, duration: null, text };
            }
            return {
              conversations: h.conversation || [],
              isAudio: !!(h.sourceDurationInSeconds ?? h.source_duration),
              duration: h.sourceDurationInSeconds ?? h.source_duration ?? null,
              text
            };
          }).filter((q) => q.conversations.length > 0 || (q.text && q.text.trim()));

          if (ambientQueries.length > 0) {
            setQueries(ambientQueries);
            setConversations(historyItems.flatMap((h) => h.conversation || []));
            setIsTranscriptExpanded(true);
            setExpandedTranscripts(new Set());
          } else if (d?.source) {
            setConversations([{ speaker: "doctor", text: d.source, timestamp: new Date().toISOString() }]);
          }

          const fullTranscript = d?.source || historyItems.map((h) => h.transcription).filter(Boolean).join(' ');
          setGenRxDetails({
            source: fullTranscript,
            source_duration: d?.source_duration,
            timeRequiredInMs: d?.timeRequiredInMs,
            type: "ambient",
            _id: d?._id,
          });
          if (fullTranscript) setFullTranscript(fullTranscript);
        } else {
          // Voice/snap/smart UI state only (prescription already set above)
          let transcriptSource = d.source;
          if (!transcriptSource && d?.history?.length > 0) {
            const joined = d.history
              .map(({ transcription }) => transcription)
              .filter((text) => text && text !== "null" && text);
            if (joined.length > 0) transcriptSource = joined.join(' ');
          }
          setGenRxDetails({
            source: transcriptSource || d.source || '',
            source_duration: d.source_duration,
            timeRequiredInMs: d.timeRequiredInMs,
            type: d.type,
            _id: d._id,
          });
          if (d?.history?.length > 0) {
            const validTranscriptions = d.history
              .map(({ transcription, sourceDurationInSeconds, source_duration }) => ({
                text: transcription,
                isAudio: !!(sourceDurationInSeconds || source_duration),
                duration: sourceDurationInSeconds || source_duration || null
              }))
              .filter((query) => query.text && query.text !== "null" && query.text);
            if (validTranscriptions.length > 0) {
              setQueries(validTranscriptions);
              setIsTranscriptExpanded(true);
              setExpandedTranscripts(new Set());
            }
          }
          if (transcriptSource && !caseManagerData?.smart_prescription_filename) {
            setFullTranscript(transcriptSource);
          }
        }
        }
      } else {
        throw new Error(initialResponse?.error || "Failed to get Rx");
      }
    } catch (error) {
      console.error("Error getting Rx details:", error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getBrowserNameForVoiceSubmit = () => {
    const userAgent = navigator.userAgent || "";
    if (userAgent.includes("Edg/")) return "Microsoft Edge";
    if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) return "Google Chrome";
    if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
    if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Safari";
    return "Unknown";
  };

  const getFilledRxModulesDetails = (prescription = {}) => {
    if (!prescription || typeof prescription !== "object") {
      return { rxModulesFilledCount: 0, filledModules: [] };
    }
    const hasArray = (value) => Array.isArray(value) && value.length > 0;
    const hasObjectValues = (value) =>
      value && typeof value === "object" && !Array.isArray(value) && Object.values(value).some((item) => {
        if (item == null) return false;
        if (typeof item === "string") return item.trim() !== "";
        return true;
      });

    const filledModules = [];
    if (hasArray(prescription.symptoms)) filledModules.push("symptoms");
    if (hasArray(prescription.surgeries)) filledModules.push("surgeries");
    if (hasArray(prescription.vaccinations)) filledModules.push("vaccinations");
    if (hasArray(prescription.medicalHistory)) filledModules.push("medicalHistory");
    if (hasArray(prescription.examinations)) filledModules.push("examinations");
    if (hasArray(prescription.diagnosis)) filledModules.push("diagnosis");
    if (hasArray(prescription.medications)) filledModules.push("medications");
    if (hasArray(prescription.labResults)) filledModules.push("labResults");
    if (hasArray(prescription.labInvestigation)) filledModules.push("labInvestigation");
    if (hasArray(prescription.others)) filledModules.push("others");
    if (hasObjectValues(prescription.vitalsAndBodyComposition)) filledModules.push("vitalsAndBodyComposition");
    if (typeof prescription.followUp === "string" && prescription.followUp.trim()) filledModules.push("followUp");
    if (typeof prescription.advice === "string" && prescription.advice.trim()) filledModules.push("advice");
    if (hasArray(prescription.advice)) filledModules.push("advice");
    if (prescription.dynamicFields && typeof prescription.dynamicFields === "object") {
      const hasDynamicFields = Object.values(prescription.dynamicFields).some((value) =>
        (Array.isArray(value) && value.length > 0) || (!!value && typeof value === "string" && value.trim())
      );
      if (hasDynamicFields) filledModules.push("dynamicFields");
    }

    return { rxModulesFilledCount: filledModules.length, filledModules };
  };

  const classifyVoiceApiErrorType = (error) => {
    const statusCode = error?.response?.status;
    const errorMessage = (error?.message || "").toLowerCase();
    if (error?.code === "ECONNABORTED" || errorMessage.includes("timeout")) return "timeout";
    if (!error?.response || error?.code === "ERR_NETWORK" || errorMessage.includes("network")) return "network";
    if (typeof statusCode === "number" && statusCode >= 500) return "5xx";
    if (typeof statusCode === "number" && statusCode >= 400) return "4xx";
    return "parse";
  };

  const trackVoiceSubmitClickEvent = ({
    voiceApiCalled = false,
    prescriptionUrl = "",
    network = "stable",
    durationOfAudio = 0,
    sessionId = "",
    submitId = "",
    requestId = "",
    audioSizeBytes = 0,
    audioMimeType = "",
    modeForEvent = "dictation",
    fromVoiceRecordingEvent = false,
    uploadLatencyMs = null,
    uploadFailed = false,
    uploadErrorMessage = "",
    voicecall = 0,
  }) => {
    const micTrackLabel =
      audioStreamRef.current?.getAudioTracks?.()?.[0]?.label ||
      micBeingUsedRef.current ||
      "Unknown";
    const eventPayload = {
      doctorId: profile?.doctor_unique_id || "",
      doctorName: profile?.um_name || "",
      patientId: patient_data?.patient_unique_id || "",
      patientName: patient_data?.pm_fullname || "",
      hospitalId: clinic?.hm_id || "",
      hospitalName: clinic?.hm_name || "",
      prescriptionUrl,
      network,
      micBeingUsed: micTrackLabel,
      browser: getBrowserNameForVoiceSubmit(),
      durationOfAudioInSeconds: durationOfAudio,
      voiceApiCalled,
      sessionId,
      submitId,
      requestId,
      audioSizeBytes,
      audioMimeType,
      mode: modeForEvent,
      fromVoiceRecording: fromVoiceRecordingEvent,
      upload_latency_ms: uploadLatencyMs,
      upload_failed: uploadFailed,
      upload_error_message: uploadErrorMessage,
      voicecall,
      timestamp: new Date().toISOString(),
    };
    trackEvent("TP_Voice_Submit_Click", eventPayload);
    const submitLogPayload = {
      correlationId: sessionId || submitId || requestId || "",
      status: uploadFailed ? "failed" : "pending",
      needConversation: modeForEvent === "ambient",
      prescriptionUrls: prescriptionUrl ? [prescriptionUrl] : [],
      ...eventPayload,
    };
    createVoiceLog(submitLogPayload, eventPayload.patientId).catch((err) => {
      console.error("[voice/logs/create] Failed", err?.message || err);
    });
  };

  const getVoiceRetryAttempts = () => {
    const retryCount = Number(
      window.__TATVA_VOICE_API_LAST_DIGITIZE_RETRY_ATTEMPT ??
      window.__TATVA_VOICE_API_LAST_RETRY_ATTEMPT ??
      0
    );
    return Number.isFinite(retryCount) ? retryCount : 0;
  };

  const trackVoiceApiResultEvent = ({
    voiceFailed = false,
    errorMessage = "",
    retryAttempts = 1,
    prescriptionUrl = "",
    sessionId = "",
    recordId = "",
    isEmptyPrescription = false,
    submitId = "",
    requestId = "",
    voiceApiLatencyMs = null,
    httpStatus = null,
    errorCode = "",
    errorType = "",
    rxModulesFilledCount = 0,
    filledModules = [],
    modeForEvent = "dictation",
    voicecall = 0,
  }) => {
    const eventPayload = {
      doctorId: profile?.doctor_unique_id || "",
      doctorName: profile?.um_name || "",
      patientId: patient_data?.patient_unique_id || "",
      patientName: patient_data?.pm_fullname || "",
      hospitalId: clinic?.hm_id || "",
      hospitalName: clinic?.hm_name || "",
      prescriptionUrl,
      sessionId,
      _id: recordId,
      voice_failed: voiceFailed,
      error_message: errorMessage,
      retry_attempts: retryAttempts,
      isemptyprescription: isEmptyPrescription,
      submitId,
      requestId,
      voice_api_latency_ms: voiceApiLatencyMs,
      http_status: httpStatus,
      error_code: errorCode,
      error_type: errorType,
      rx_modules_filled_count: rxModulesFilledCount,
      filled_modules: Array.isArray(filledModules) ? filledModules.join(",") : "",
      voicecall,
      timestamp: new Date().toISOString(),
    };
    trackEvent("TP_Voice_Api_Result", eventPayload);
    const { _id, ...resultEventPayloadForApi } = eventPayload;
    const resultLogPayload = {
      correlationId: sessionId || submitId || requestId || "",
      status: voiceFailed ? "failed" : "completed",
      needConversation: modeForEvent === "ambient",
      prescriptionUrls: prescriptionUrl ? [prescriptionUrl] : [],
      ...resultEventPayloadForApi,
    };
    updateVoiceLog(resultLogPayload, eventPayload.patientId).catch((err) => {
      console.error("[voice/logs/update] Failed", err?.message || err);
    });
  };

  const handleStartRecording = async () => {
    setRecordingTime(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      micBeingUsedRef.current =
        stream?.getAudioTracks?.()?.[0]?.label || micBeingUsedRef.current;
      // Find the supported MIME type for this browser
      const mimeType = getSupportedMimeType();
      mediaRecorderRef.current = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        // Use the same MIME type that was detected or fall back to audio/webm
        const mimeType = mediaRecorderRef.current.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      window.mediaRecorderRef = mediaRecorderRef;
      window.audioStreamRef = audioStreamRef;
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const handleStopRecording = () => {
    if (isRecording || isPaused) {
      crossButtonClickCountRef.current += 1;
    }
    const clinic_name = getClinicName(profile?.hospital_data);
    trackEvent("TP_VoiceRx_Paused", {
      patient_contact: patient_data?.pm_contact_no || "",
      patient_id: patient_data?.patient_unique_id || "",
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name,
      rx_id: genRxDetails?._id || "",
    });
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    window.mediaRecorderRef = null;
    window.audioStreamRef = null;
  };

  const handleSend = async () => {
    window.Moengage.track_event("TP_AV_TypeTranscript", {
      patient_id: patient_data?.patient_unique_id || "",
      patient_name: patient_data?.pm_fullname || "",
      patient_mobile_number: patient_data?.pm_contact_no || "",
      doctor_id: profile?.doctor_unique_id,
      user_id: userId,
      doctor_name: profile?.um_name,
      doctor_specialty: profile?.dp_name,
      doctor_mobile_number: profile?.um_contact,
      hm_id: clinic?.hm_id,
      clinic_name: clinic?.hm_name,
    });
    if (
      !isFreeVoiceRxUser &&
      VOICE_RX_planDetails?.plan_tier === FREE &&
      VOICE_RX_planDetails?.credit_balance <= 0
    ) {
      showHideSubModal();
    } else if (
      !isFreeVoiceRxUser &&
      VOICE_RX_planDetails?.plan_tier === FAILED_VERIFICATION
    ) {
      showHideSubModal();
    } else {
      let sendData = {
        b2c_id: profile?.b2c,
        service_name: S_VOICE_RX,
      };
      const action = await dispatch(checkCredits(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        if (action?.payload?.hasOwnProperty("service_name")) {
          if (
            !isFreeVoiceRxUser &&
            action?.payload?.plan_tier === FREE &&
            action?.payload?.credit_balance <= 0
          ) {
            if (
              action?.payload?.credit_balance !=
              VOICE_RX_planDetails?.credit_balance
            ) {
              await dispatch(services(sendData?.b2c_id));
            }
            showHideSubModal();
          } else if (
            !isFreeVoiceRxUser &&
            action?.payload?.plan_tier === FAILED_VERIFICATION
          ) {
            showHideSubModal();
          } else {
            if (!isRecording && !(inputText || editableQuery)) return;
            submitCountRef.current += 1;
            if (!voiceSessionStartTimeRef.current) {
              voiceSessionStartTimeRef.current = Date.now();
            }
            // Increment typed messages count if it's a typed message (not recording)
            if (!isRecording && (inputText || editableQuery)) {
              typedMessagesCountRef.current += 1;
            }
            if (isEditing && editableQuery) {
              digitizationPadEditCountRef.current += 1;
            }
            if (genRxDetails?._id) {
              const clinic_name = getClinicName(profile?.hospital_data);
              trackEvent("TP_VoiceRx_editRx", {
                patient_contact: patient_data?.pm_contact_no || "",
                patient_id: patient_data?.patient_unique_id || "",
                doctor_speciality: profile?.dp_name,
                doctor_unique_id: profile?.doctor_unique_id,
                clinic_name,
                rx_id: genRxDetails?._id,
              });
            }
            setShowPrescription(true);
            setRecordingTime(0);
            setIsProcessing(true);

            try {
              if (isRecording) {
                mediaRecorderRef.current?.stop();
                if (audioStreamRef.current) {
                  audioStreamRef.current.getTracks().forEach((track) => track.stop());
                  audioStreamRef.current = null;
                }
                window.mediaRecorderRef = null;
                window.audioStreamRef = null;
                setIsRecording(false);
                setIsPaused(false);
                await new Promise((resolve) => setTimeout(resolve, 100)); // Ensure audio is processed

                const mimeType =
                  mediaRecorderRef.current?.mimeType || "audio/webm";
                const audioBlob = new Blob(audioChunksRef.current, {
                  type: mimeType,
                });

                stopAllActiveRecorders();
                await handleVoiceDigitize(audioBlob, "");
              } else {
                await handleVoiceDigitize(null, inputText || editableQuery);
              }
            } catch (error) {
              console.error("Error processing prescription:", error);
              message.error(error?.message || "Failed to process prescription");
              setIsProcessing(false);
            }
          }
        } else {
          typeof action?.payload?.data?.error === "object"
            ? errorMessage(action?.payload?.data?.error?.description)
            : errorMessage(action?.payload?.data?.message);
        }
      } else {
        errorMessage(action?.payload?.message || action?.error || "An error occurred");
      }
    }
  };

  const preparePayloadForApi = () => {
    const cleanedData = removeScItems(prescriptionData || {});
    const { dynamicFields = {} } = cleanedData;
    const filteredDynamicFields = Object.entries(dynamicFields).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) {
        const trimmed = value
          .map((v) => (typeof v === "string" ? v.trim() : v))
          .filter((v) => (typeof v === "string" ? v.length > 0 : v !== null && v !== undefined));
        acc[key] = trimmed;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    return {
      ...cleanedData,
      dynamicFields: filteredDynamicFields,
    };
  };

  const removeScItems = (data) => {
    if (!data || typeof data !== "object") return data;
    return {
      ...data,
      symptoms: Array.isArray(data.symptoms) ? data.symptoms.filter((symptom) => !symptom?.SC) : [],
      medicalHistory: Array.isArray(data.medicalHistory) ? data.medicalHistory.filter((history) => !history?.SC) : [],
    };
  };

  const validatePrescriptionData = (data) => {
    if (!data || typeof data !== 'object') {
      return false;
    }

      const CANONICAL_VITAL_KEYS = ['temperature', 'pulse', 'respRate', 'respiratoryRate', 'bloodPressure', 'systolic', 'diastolic', 'spo2', 'ofc', 'headCircumference', 'height', 'weight', 'BMI', 'BMR', 'BSA', 'general_rbs', 'generalRBS', 'fib4', 'waist_circumference', 'waistCircumference', 'randomBloodSugar'];
      const normalizeVitalsForPrescription = (vitalsAndBodyComposition) => {
        if (!vitalsAndBodyComposition || typeof vitalsAndBodyComposition !== 'object') return {};
        const actual = vitalsAndBodyComposition._doc || vitalsAndBodyComposition;
        const result = {};
        CANONICAL_VITAL_KEYS.forEach((key) => {
          const v = actual[key];
          const s = vitalScalarString(v);
          if (s !== '') {
            result[key] = s;
          }
        });
        const generalRBSVal = actual.generalRBS ?? actual.genralRBS ?? result.general_rbs ?? actual['General RBS'];
        const grbs = vitalScalarString(generalRBSVal);
        if (grbs !== '') {
          result.general_rbs = grbs;
        }
        return result;
      };

    const deepClean = (obj) => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(item => deepClean(item));
      }
      if (obj.vitalsAndBodyComposition && typeof obj.vitalsAndBodyComposition === 'object') {
        obj.vitalsAndBodyComposition = normalizeVitalsForPrescription(obj.vitalsAndBodyComposition);
      }
      // Handle objects - remove Mongoose internal properties
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip Mongoose internal properties
        if (key.startsWith('$') || 
            key.startsWith('_') || 
            key === 'strictMode' || 
            key === 'selected' || 
            key === 'getters' || 
            key === 'wasPopulated' || 
            key === 'activePaths' || 
            key === 'pathsToScopes' || 
            key === 'cachedRequired' || 
            key === 'session' || 
            key === '$setCalled' || 
            key === 'ownerDocument' || 
            key === 'emitter' || 
            key === '$options' ||
            key === '$__parent' ||
            key === '$__' ||
            key === '$isSingleNested' ||
            key === '$locals' ||
            key === '$op' ||
            key === '_doc' ||
            key === '$init') {
          continue;
        }
        
        cleaned[key] = deepClean(value);
      }
      
      return cleaned;
    };
    
    // Clean the data first
    const cleanedData = deepClean(data);

    const normalizedDiagnosis = Array.isArray(cleanedData.diagnosis)
      ? cleanedData.diagnosis.map((item) => {
          if (item == null) return { name: "", since: "", status: "", notes: "", lineItem: "" };
          if (typeof item === "string") {
            const t = String(item).trim();
            return { name: t, since: "", status: "", notes: "", lineItem: t };
          }
          const name = String(item.name ?? item.lineItem ?? "").trim();
          const since = String(item.since ?? "").trim();
          const status = String(item.status ?? "").trim();
          const notes = String(item.notes ?? item.note ?? "").trim();
          const lineItem = String(item.lineItem ?? "").trim() || [name, status, notes].filter(Boolean).join(", ") || name;
          return { name, since, status, notes, lineItem };
        })
      : [];
    const normalizedExaminations = Array.isArray(cleanedData.examinations)
      ? cleanedData.examinations.map((item) => {
          if (item == null) return { name: "", notes: "", lineItem: "" };
          if (typeof item === "string") {
            const t = String(item).trim();
            return { name: t, notes: "", lineItem: t };
          }
          const name = String(item.name ?? item.findings ?? item.lineItem ?? "").trim();
          const notes = String(item.notes ?? "").trim();
          const lineItem = String(item.lineItem ?? "").trim() || (notes ? `${name}, ${notes}` : name) || name;
          return { name, notes, lineItem };
        })
      : [];

    // Map instruction to notes for labInvestigation items
    const mappedLabInvestigation = Array.isArray(cleanedData.labInvestigation)
      ? cleanedData.labInvestigation.map(item => {
          const { instruction, ...restItem } = item;
          const mappedItem = {
            ...restItem,
            notes: item.instruction || item.notes || ''
          };
          // Preserve hm_type and um_id at top level for API compatibility
          // Check both top level and metadata
          if (item.hm_type !== undefined) {
            mappedItem.hm_type = item.hm_type;
          } else if (item.metadata?.hm_type !== undefined) {
            mappedItem.hm_type = item.metadata.hm_type;
          }
          if (item.um_id !== undefined) {
            mappedItem.um_id = item.um_id;
          } else if (item.metadata?.um_id !== undefined) {
            mappedItem.um_id = item.metadata.um_id;
          }
          return ensureLabInvestigationMetadataForRxSave(mappedItem);
        })
      : [];
    
    // Ensure all required fields exist with proper defaults (normalized diagnosis/examinations include status, lineItem, etc.)
    const validatedData = {
      symptoms: Array.isArray(cleanedData.symptoms) ? cleanedData.symptoms : [],
      medications: Array.isArray(cleanedData.medications) ? cleanedData.medications : [],
      vitalsAndBodyComposition: cleanedData.vitalsAndBodyComposition || {},
      advice: Array.isArray(cleanedData.advice) ? cleanedData.advice : [],
      diagnosis: normalizedDiagnosis,
      examinations: normalizedExaminations,
      followUp: typeof cleanedData.followUp === 'string' ? cleanedData.followUp : "",
      labInvestigation: mappedLabInvestigation,
      medicalHistory: Array.isArray(cleanedData.medicalHistory) ? cleanedData.medicalHistory : [],
      vaccinations: Array.isArray(cleanedData.vaccinations) ? cleanedData.vaccinations : [],
      others: Array.isArray(cleanedData.others)
        ? cleanedData.others.map((o) => (typeof o === "string" ? o : (o?.value ?? o?.name ?? ""))).filter(Boolean)
        : [],
      ...cleanedData
    };
    validatedData.diagnosis = normalizedDiagnosis;
    validatedData.examinations = normalizedExaminations;
    validatedData.labInvestigation = mappedLabInvestigation;
    validatedData.others = Array.isArray(cleanedData.others)
      ? cleanedData.others.map((o) => (typeof o === "string" ? o : (o?.value ?? o?.name ?? ""))).filter(Boolean)
      : [];
    validatedData.dynamicFields = cleanedData.dynamicFields || {};
    const rawLabResults = Array.isArray(cleanedData.labResults) ? cleanedData.labResults : (Array.isArray(cleanedData.lab_results) ? cleanedData.lab_results : []);
    validatedData.labResults = rawLabResults.map((r) => ({
      testname: r.testname ?? r.testName ?? r.name ?? "",
      value: r.value != null ? String(r.value) : "",
      notes: r.notes != null ? String(r.notes) : "",
    }));
    return validatedData;
  };

  // API requires consent object { timestamp, ip, given }. Never send null.
  const getConsentForDigitization = async () => {
    if (consent && typeof consent === "object" && consent.given === true) {
      return {
        timestamp: consent.timestamp ?? Date.now(),
        ip: consent.ip || "",
        given: true,
      };
    }
    let userIp = "";
    try {
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      userIp = ipData.ip || "";
    } catch (e) {
      console.warn("[consent] Could not fetch IP:", e?.message);
    }
    return {
      timestamp: Date.now(),
      ip: userIp,
      given: true,
    };
  };

  /** Map new API digitize shape to Rx pad shape (e.g. respiratoryRate -> respRate, genralRBS -> general_rbs). */
  const mapDigitizeDataToPrescription = (digitizeData) => {
    if (!digitizeData || typeof digitizeData !== "object") return digitizeData;
    const v = digitizeData.vitalsAndBodyComposition;
    if (v && typeof v === "object") {
      const mapped = { ...v };
      if (mapped.respiratoryRate !== undefined) {
        mapped.respRate = mapped.respiratoryRate;
        delete mapped.respiratoryRate;
      }
      if (mapped.randomBloodSugar !== undefined) {
        mapped.sugar = mapped.randomBloodSugar;
        delete mapped.randomBloodSugar;
      }
      if (mapped.headCircumference !== undefined) {
        mapped.ofc = mapped.headCircumference;
        delete mapped.headCircumference;
      }
      const generalRBSVal = mapped.generalRBS ?? mapped.genralRBS;
      if (generalRBSVal !== undefined) {
        mapped.general_rbs = generalRBSVal;
        delete mapped.generalRBS;
        delete mapped.genralRBS;
      }
      digitizeData = { ...digitizeData, vitalsAndBodyComposition: mapped };
    }
    // API may return labResults under refinedData, ocrData[0].extractions[0], or data.refinedData / data.ocrData; pull to top-level so Rx pad renders
    const topLab = digitizeData.labResults ?? digitizeData.lab_results;
    const fromRefined = digitizeData.refinedData?.labResults ?? digitizeData.data?.refinedData?.labResults;
    const fromOcr = digitizeData.ocrData?.[0]?.extractions?.[0]?.labResults ?? digitizeData.data?.ocrData?.[0]?.extractions?.[0]?.labResults;
    const labResults = (Array.isArray(topLab) && topLab.length > 0)
      ? topLab
      : (Array.isArray(fromRefined) && fromRefined.length > 0 ? fromRefined : (Array.isArray(fromOcr) && fromOcr.length > 0 ? fromOcr : []));
    if (labResults.length > 0) digitizeData = { ...digitizeData, labResults };
    const gynecRaw = digitizeData.gynecHistory ?? digitizeData.gyneacHistory;
    const gynecHistory = normalizeGynecHistoryFromApi(gynecRaw);
    if (Object.keys(gynecHistory).length > 0) {
      digitizeData = { ...digitizeData, gynecHistory };
    }
    return digitizeData;
  };

  const hasRxPadContent = (data) => {
    if (!data || typeof data !== "object") return false;
    const hasArray = (arr) => Array.isArray(arr) && arr.length > 0;
    const hasVitals = (v) => v && typeof v === "object" && Object.keys(v).some((k) => !["tcv_id", "tcbc_id", "dev_unique_id", "pam_id"].includes(k) && v[k] != null && String(v[k]).trim() !== "");
    if (hasArray(data.symptoms) || hasArray(data.surgeries) || hasArray(data.medications) || hasArray(data.medicalHistory) || hasArray(data.diagnosis) || hasArray(data.labInvestigation) || hasArray(data.labResults) || hasArray(data.vaccinations)) return true;
    if (hasVitals(data.vitalsAndBodyComposition)) return true;
    if (data.followUp && String(data.followUp).trim()) return true;
    if (hasArray(data.others) || (data.advice && (typeof data.advice === "string" ? data.advice.trim() : hasArray(data.advice)))) return true;
    return false;
  };

  const mapPrescriptionDataToDigitizeData = (prescriptionData) => {
    if (!prescriptionData || typeof prescriptionData !== "object") {
      return preparePreviousContextRxItems(prescriptionData);
    }

    const withRxItems = preparePreviousContextRxItems(prescriptionData);
    const v = withRxItems.vitalsAndBodyComposition;
    if (!v || typeof v !== "object") return withRxItems;

    const mapped = { ...v };
    if (mapped.respRate !== undefined) {
      mapped.respiratoryRate = mapped.respRate;
      delete mapped.respRate;
    }
    if (mapped.sugar !== undefined) {
      mapped.randomBloodSugar = mapped.sugar;
      delete mapped.sugar;
    }
    if (mapped.ofc !== undefined) {
      mapped.headCircumference = mapped.ofc;
      delete mapped.ofc;
    }
    const generalRBSVal = mapped.general_rbs ?? mapped["General RBS"] ?? mapped.generalRBS ?? mapped.genralRBS;
    if (generalRBSVal !== undefined) {
      mapped.genralRBS = generalRBSVal;
      mapped.generalRBS = generalRBSVal;
      delete mapped.general_rbs;
      delete mapped["General RBS"];
    }
    return { ...withRxItems, vitalsAndBodyComposition: mapped };
  };

  const handleVoiceDigitize = async (
    audioBlobParam,
    transcribedText,
    isFromSC = false
  ) => {
    const voicecall = ++voiceCallCountRef.current;
    let voiceApiAttempted = false;
    let prescriptionUrlForApiResult = "";
    let voiceApiRecordId = "";
    let isEmptyPrescription = false;
    let rxModulesFilledCount = 0;
    let filledModules = [];
    let voiceApiLatencyMs = null;
    let voiceApiHttpStatus = null;
    const submitId = `voice-submit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const requestId = submitId;
    const modeForEvent = isAmbientMode || mode === "ambient" ? "ambient" : "dictation";
    const fromVoiceRecordingEvent = !!fromVoiceRecording;
    try {
      let response;

      if (isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient') {
        const patientId = patient_data?.patient_unique_id || "";
        const admissionId = caseManagerData?.admission_id || null;

        const previousContext =
          prescriptionData && hasRxPadContent(prescriptionData) ? mapPrescriptionDataToDigitizeData(prescriptionData) : {};
        const consentPayload = await getConsentForDigitization();
        let currentRecordingDuration = null;
        let payload;

        if (genRxDetails?._id) {
          const updatedTranscript = [fullTranscript, transcribedText].filter(Boolean).join(" ");
          setFullTranscript(updatedTranscript);
        }

        if (audioBlobParam) {
          if (!audioBlobParam?.size) {
            throw new Error("Recording is empty. Please record again.");
          }
          const fileName = `ambient-voice-rx-recording-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
          const audioFile = new File(
            [audioBlobParam],
            fileName,
            { type: audioBlobParam.type || "audio/webm" }
          );
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const arrayBuffer = await audioBlobParam.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const sourceDuration = audioBuffer.duration;
          currentRecordingDuration = sourceDuration;
          let prescriptionUrl;
          const uploadStartedAt = Date.now();
          try {
            const uploadResponse = await uploadVoiceAudio(audioFile);
            prescriptionUrl = uploadResponse?.data?.prescriptionUrl ?? uploadResponse?.prescriptionUrl;
            if (prescriptionUrl) {
              prescriptionUrlsForSessionRef.current.add(prescriptionUrl);
            }
          } catch (uploadError) {
            trackVoiceSubmitClickEvent({
              voiceApiCalled: false,
              prescriptionUrl: "",
              network: "unstable",
              durationOfAudio: Math.round(sourceDuration || 0),
              sessionId: voiceSessionIdRef.current,
              submitId,
              requestId,
              audioSizeBytes: audioBlobParam?.size || 0,
              audioMimeType: audioBlobParam?.type || "audio/webm",
              modeForEvent,
              fromVoiceRecordingEvent,
              uploadLatencyMs: Date.now() - uploadStartedAt,
              uploadFailed: true,
              uploadErrorMessage: uploadError?.message || "upload_failed",
              voicecall,
            });
            throw uploadError;
          }
          if (!prescriptionUrl) throw new Error("Failed to upload audio file");
          prescriptionUrlForApiResult = prescriptionUrl;
          trackVoiceSubmitClickEvent({
            voiceApiCalled: true,
            prescriptionUrl,
            network: "stable",
            durationOfAudio: Math.round(sourceDuration || 0),
            sessionId: voiceSessionIdRef.current,
            submitId,
            requestId,
            audioSizeBytes: audioBlobParam?.size || 0,
            audioMimeType: audioBlobParam?.type || "audio/webm",
            modeForEvent,
            fromVoiceRecordingEvent,
            uploadLatencyMs: Date.now() - uploadStartedAt,
            uploadFailed: false,
            uploadErrorMessage: "",
            voicecall,
          });
          payload = {
            prescriptionUrls: [prescriptionUrl],
            sourceDuration: Math.round(sourceDuration),
            needConversation: true,
            consent: consentPayload,
            text: "",
            type: "AUDIO_NO_CONTEXT",
            version: "v2",
            previousContext,
          };
        } else {
          payload = {
            prescriptionUrls: [],
            sourceDuration: 0,
            needConversation: true,
            consent: consentPayload,
            text: (transcribedText || "").trim(),
            type: "TEXT_WITH_CONTEXT",
            version: "v2",
            previousContext,
          };
        }

        const voiceApiStartedAt = Date.now();
        if (genRxDetails?._id) {
          voiceApiAttempted = true;
          response = await updateAmbientRx(
            payload,
            genRxDetails._id,
            patientId,
            admissionId
          );
        } else {
          voiceApiAttempted = true;
          response = await generateAmbientRx(payload, patientId, admissionId);
          if (transcribedText) {
            setFullTranscript(transcribedText);
          }
        }
        voiceApiLatencyMs = Date.now() - voiceApiStartedAt;
        voiceApiHttpStatus = response?.status ?? response?.data?.status ?? 200;

        // Handle response structure for ambient API (same as cvt_prod_final)
        const responseData = response?.data || response;
        const actualData = responseData?.data || responseData?.response || responseData;
        
        // Check for success - ambient API might return data directly or wrapped (same as cvt_prod_final)
        const isSuccess = (response?.success !== false || responseData?.success !== false || actualData?.success !== false) && (actualData || responseData) && (
          actualData?.digitize ||
          responseData?.digitize ||
          actualData?.digitizeData ||
          responseData?.digitizeData ||
          actualData?.rx ||
          responseData?.rx ||
          actualData?.symptoms ||
          responseData?.symptoms ||
          actualData?.conversation ||
          responseData?.conversation ||
          actualData?.rxDigitizationHistory ||
          responseData?.rxDigitizationHistory ||
          actualData?._id ||
          responseData?._id ||
          actualData?.source ||
          responseData?.source ||
          (actualData?.rxDigitizationHistory && Array.isArray(actualData.rxDigitizationHistory) && actualData.rxDigitizationHistory.length > 0) ||
          (responseData?.rxDigitizationHistory && Array.isArray(responseData.rxDigitizationHistory) && responseData.rxDigitizationHistory.length > 0)
        );
        
        if (isSuccess) {
          const finalResponseData = actualData || responseData;
          voiceApiRecordId =
            finalResponseData?._id ||
            actualData?._id ||
            responseData?.data?._id ||
            responseData?._id ||
            genRxDetails?._id ||
            "";
          const digitizeDataForEvent =
            finalResponseData?.digitizeData ??
            finalResponseData?.history?.[0]?.digitize ??
            actualData?.digitizeData ??
            responseData?.digitizeData ??
            actualData?.digitize ??
            responseData?.digitize ??
            null;
          if (digitizeDataForEvent) {
            const mappedForEmptyCheck = mapDigitizeDataToPrescription(digitizeDataForEvent);
            const modulesDetails = getFilledRxModulesDetails(mappedForEmptyCheck || {});
            rxModulesFilledCount = modulesDetails.rxModulesFilledCount;
            filledModules = modulesDetails.filledModules;
            isEmptyPrescription = modulesDetails.rxModulesFilledCount === 0;
          } else {
            rxModulesFilledCount = 0;
            filledModules = [];
            isEmptyPrescription = true;
          }
          
          if (!finalResponseData) {
            console.error('❌ Response data is null or undefined');
            throw new Error('No data received from API');
          }
          
          if (!isFromSC) {
            let prescriptionData = null;
            let conversationData = null;
            // PUT/POST: always use digitizeData (fresh AI output); fallback to editedData only when no digitizeData
            const editedData = finalResponseData.editedData ?? actualData?.editedData ?? responseData?.editedData ?? null;
            const digitizeDataRaw = finalResponseData.digitizeData ?? finalResponseData.history?.[0]?.digitize ?? actualData?.digitizeData ?? responseData?.digitizeData ?? null;
            const dataForPad = digitizeDataRaw ?? editedData;
            if (dataForPad) {
              if (digitizeDataRaw) lastDigitizeDataRef.current = digitizeDataRaw;
              prescriptionData = digitizeDataRaw
                ? mapDigitizeDataToPrescription(digitizeDataRaw)
                : (editedData?.symptoms !== undefined || editedData?.medications !== undefined ? editedData : mapDigitizeDataToPrescription(editedData));
            }
            conversationData = finalResponseData.history?.[0]?.conversation ?? finalResponseData.conversation ?? conversationData;

            // Single fallback path for prescription data (voice and ambient use same API)
            if (!prescriptionData) {
              const digitizeObj = finalResponseData.digitize ?? actualData?.digitize ?? responseData?.digitize;
              const hist = finalResponseData.rxDigitizationHistory ?? responseData?.rxDigitizationHistory;
              const firstEntry = Array.isArray(hist) && hist.length > 0 ? hist[0] : null;
              const latestFromHist = Array.isArray(hist) && hist.length > 0 ? hist[hist.length - 1] : null;
              const rawFromLatest = latestFromHist?.payload?.response ?? latestFromHist?.response ?? latestFromHist?.payload;

              if (digitizeObj && typeof digitizeObj === 'object' && !Array.isArray(digitizeObj)) {
                const numericKeys = Object.keys(digitizeObj).filter(key => /^\d+$/.test(key));
                prescriptionData = numericKeys.length > 0 ? mapDigitizeDataToPrescription(digitizeObj[numericKeys[0]]) : mapDigitizeDataToPrescription(digitizeObj);
              } else if (digitizeObj) {
                prescriptionData = mapDigitizeDataToPrescription(digitizeObj);
              } else if (rawFromLatest) {
                prescriptionData = mapDigitizeDataToPrescription(rawFromLatest);
                if (latestFromHist?.payload?.conversation) conversationData = latestFromHist.payload.conversation;
              } else if (actualData?.symptoms || actualData?.medications || actualData?.vitalsAndBodyComposition) {
                prescriptionData = actualData.symptoms !== undefined || actualData.medications !== undefined ? actualData : mapDigitizeDataToPrescription(actualData);
              } else if (responseData?.symptoms || responseData?.medications || responseData?.vitalsAndBodyComposition) {
                prescriptionData = responseData.symptoms !== undefined || responseData.medications !== undefined ? responseData : mapDigitizeDataToPrescription(responseData);
              } else if (firstEntry?.payload?.response) {
                prescriptionData = mapDigitizeDataToPrescription(firstEntry.payload.response);
              } else if (firstEntry?.response) {
                prescriptionData = mapDigitizeDataToPrescription(firstEntry.response);
              } else if (firstEntry?.payload && (firstEntry.payload.symptoms || firstEntry.payload.medications)) {
                prescriptionData = firstEntry.payload;
              } else if (actualData?.prescription) {
                prescriptionData = actualData.prescription;
              } else if (responseData?.prescription) {
                prescriptionData = responseData.prescription;
              } else if (actualData?.rx) {
                prescriptionData = actualData.rx;
              } else if (responseData?.rx) {
                prescriptionData = responseData.rx;
              }
              if (!conversationData) {
                conversationData = actualData?.rxDigitizationHistory?.[0]?.payload?.conversation ?? responseData?.rxDigitizationHistory?.[0]?.payload?.conversation ?? actualData?.conversation ?? responseData?.conversation ?? actualData?.digitize?.conversation ?? responseData?.digitize?.conversation ?? actualData?.rx?.conversation ?? responseData?.rx?.conversation ?? prescriptionData?.conversation ?? null;
              }
            }

            // Ambient mode: use full history from response (one conversation box per update), no collapsing
            if (isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX) {
              const historyAmbient = finalResponseData.history ?? actualData?.history ?? responseData?.history;
              const hasHistoryAmbient = Array.isArray(historyAmbient) && historyAmbient.length > 0;

              if (hasHistoryAmbient) {
                const historyWithConversation = historyAmbient.filter(h =>
                  (h.conversation?.length ?? 0) > 0 ||
                  (h.transcription && h.transcription.trim()) ||
                  (h.source && typeof h.source === 'string' && h.source.trim())
                );
                const ambientQueriesFromHistory = historyWithConversation.map((h) => {
                  const isTextOnly = h.type === 'TEXT_WITH_CONTEXT';
                  const text = h.transcription ?? (typeof h.source === 'string' ? h.source : '') ?? '';
                  if (isTextOnly) {
                    return { conversations: [], isAudio: false, duration: null, text };
                  }
                  return {
                    conversations: h.conversation || [],
                    isAudio: !!(h.sourceDurationInSeconds ?? h.source_duration),
                    duration: h.sourceDurationInSeconds ?? h.source_duration ?? null,
                    text
                  };
                }).filter((q) => q.conversations.length > 0 || (q.text && q.text.trim()));

                if (ambientQueriesFromHistory.length > 0) {
                  setQueries(ambientQueriesFromHistory);
                  setConversations(historyWithConversation.flatMap((h) => h.conversation || []));
                  setIsTranscriptExpanded(true);
                }
              } else if (conversationData) {
                // Fallback when no history: single conversation box, no collapse
                const isAudioInput = !!audioBlobParam;
                const queryDuration = isAudioInput ? currentRecordingDuration : null;
                const conversationsToStore = (Array.isArray(conversationData) && conversationData.length > 0)
                  ? conversationData
                  : (transcribedText ? [{ speaker: 'doctor', text: transcribedText, message: transcribedText, content: transcribedText }] : []);
                const newAmbientQuery = {
                  conversations: conversationsToStore,
                  isAudio: isAudioInput,
                  duration: queryDuration,
                  text: transcribedText || ''
                };
                const updatedQueries = isEditing
                  ? [...queries.slice(0, queries.length - 1), newAmbientQuery]
                  : [...queries, newAmbientQuery];
                setQueries(updatedQueries);
                setConversations(conversationData);
                setIsTranscriptExpanded(true);
              }
            } else if (conversationData) {
              setConversations(conversationData);
            }
            
            if (prescriptionData) {
              const validatedPrescriptionData = validatePrescriptionData(prescriptionData);
              
              // Track which sections were initially populated from API BEFORE setting state
              if (validatedPrescriptionData.symptoms && Array.isArray(validatedPrescriptionData.symptoms) && validatedPrescriptionData.symptoms.length > 0) {
                initiallyPopulatedSectionsRef.current.add('symptoms');
              }
              if (validatedPrescriptionData.surgeries && Array.isArray(validatedPrescriptionData.surgeries) && validatedPrescriptionData.surgeries.length > 0) {
                initiallyPopulatedSectionsRef.current.add('surgeries');
              }
              if (validatedPrescriptionData.vaccinations && Array.isArray(validatedPrescriptionData.vaccinations) && validatedPrescriptionData.vaccinations.length > 0) {
                initiallyPopulatedSectionsRef.current.add('vaccinations');
              }
              if (validatedPrescriptionData.medicalHistory && Array.isArray(validatedPrescriptionData.medicalHistory) && validatedPrescriptionData.medicalHistory.length > 0) {
                initiallyPopulatedSectionsRef.current.add('medicalHistory');
                validatedPrescriptionData.medicalHistory.forEach(item => {
                  const type = item.type?.toLowerCase().replace(/\s+/g, '_') || 'others';
                  initiallyPopulatedMedicalHistoryTypesRef.current.add(type);
                });
              }
              if (validatedPrescriptionData.examinations && Array.isArray(validatedPrescriptionData.examinations) && validatedPrescriptionData.examinations.length > 0) {
                initiallyPopulatedSectionsRef.current.add('examinations');
              }
              if (validatedPrescriptionData.diagnosis && Array.isArray(validatedPrescriptionData.diagnosis) && validatedPrescriptionData.diagnosis.length > 0) {
                initiallyPopulatedSectionsRef.current.add('diagnosis');
              }
              if (validatedPrescriptionData.advice && ((typeof validatedPrescriptionData.advice === 'string' && validatedPrescriptionData.advice.trim()) || (Array.isArray(validatedPrescriptionData.advice) && validatedPrescriptionData.advice.length > 0))) {
                initiallyPopulatedSectionsRef.current.add('advice');
              }
              if (validatedPrescriptionData.others && Array.isArray(validatedPrescriptionData.others) && validatedPrescriptionData.others.length > 0) {
                initiallyPopulatedSectionsRef.current.add('others');
              }
              if (validatedPrescriptionData.followUp && validatedPrescriptionData.followUp.trim()) {
                initiallyPopulatedSectionsRef.current.add('followUp');
              }
              if (validatedPrescriptionData.vitalsAndBodyComposition && Object.keys(validatedPrescriptionData.vitalsAndBodyComposition).length > 0) {
                initiallyPopulatedSectionsRef.current.add('vitalsAndBodyComposition');
              }
              if (validatedPrescriptionData.labResults && Array.isArray(validatedPrescriptionData.labResults) && validatedPrescriptionData.labResults.length > 0) {
                initiallyPopulatedSectionsRef.current.add('labResults');
              }
              if (validatedPrescriptionData.medications && Array.isArray(validatedPrescriptionData.medications) && validatedPrescriptionData.medications.length > 0) {
                initiallyPopulatedSectionsRef.current.add('medications');
              }
              if (validatedPrescriptionData.labInvestigation && Array.isArray(validatedPrescriptionData.labInvestigation) && validatedPrescriptionData.labInvestigation.length > 0) {
                initiallyPopulatedSectionsRef.current.add('labInvestigation');
              }
              if (validatedPrescriptionData.dynamicFields && typeof validatedPrescriptionData.dynamicFields === 'object') {
                Object.entries(validatedPrescriptionData.dynamicFields).forEach(([moduleName, moduleData]) => {
                  if (Array.isArray(moduleData) && moduleData.length > 0) {
                    initiallyPopulatedSectionsRef.current.add(`dynamicFields.${moduleName}`);
                  }
                });
              }
              
              // Process medications to ensure dosage/unitPerDose is properly mapped
              if (validatedPrescriptionData?.medications && Array.isArray(validatedPrescriptionData.medications)) {
                validatedPrescriptionData.medications = validatedPrescriptionData.medications.map(med => {
                  // Map unitPerDose to dosage if dosage is not present but unitPerDose is
                  if (!med.dosage && med.unitPerDose) {
                    med.dosage = med.unitPerDose;
                  }
                  // If dosage is still not present, try to extract from lineItem or other fields
                  if (!med.dosage) {
                    // Check if there's a dosage field with different casing
                    if (med.Dosage) {
                      med.dosage = med.Dosage;
                    } else if (med.unit_per_dose) {
                      med.dosage = med.unit_per_dose;
                    }
                  }
                  return med;
                });
              }
              
              if (validatedPrescriptionData?.medicalHistory?.length > 0 && setMedicalHistoryData) {
                const convertedData = convertMedicalHistoryToContextFormat(validatedPrescriptionData.medicalHistory, medicalHistoryData);
                setMedicalHistoryData(convertedData);
              }

              setPrescriptionData((prevData) => {
                const apiDynamicFields = validatedPrescriptionData?.dynamicFields || {};
                const prevDynamicFields = prevData?.dynamicFields || {};
                const mergedDynamicFields = { ...prevDynamicFields, ...apiDynamicFields };
                localModules.forEach(moduleName => {
                  if (!mergedDynamicFields[moduleName]) mergedDynamicFields[moduleName] = [];
                });

                const formattedSymptomsCollectorData = getFormattedSymptomsCollectorData(selectedSymptomsCollector);
                const finalPrescriptionData =
                  formattedSymptomsCollectorData && Object.keys(formattedSymptomsCollectorData)?.length > 0
                    ? mergeData(validatedPrescriptionData, formattedSymptomsCollectorData)
                    : validatedPrescriptionData;
                const labResults = (Array.isArray(finalPrescriptionData.labResults) && finalPrescriptionData.labResults.length > 0)
                  ? finalPrescriptionData.labResults
                  : (Array.isArray(prevData?.labResults) && prevData.labResults.length > 0 ? prevData.labResults : []);
                const mergedPrescription = mergeVoiceApiPrescriptionWithPrior(prevData, finalPrescriptionData);
                return {
                  ...mergedPrescription,
                  labResults,
                  dynamicFields: mergedDynamicFields,
                };
              });
              const vitals = validatedPrescriptionData.vitalsAndBodyComposition;
              const rawVitalsAmbient = prescriptionData?.vitalsAndBodyComposition;
              const hasResponseVitals = vitals && Object.keys(vitals).length > 0 &&
                Object.values(vitals).some(v => { const s = String(v ?? '').trim(); return s !== '' && s !== 'undefined' && s !== 'null'; });
              if (hasResponseVitals) {
                persistVitalsFromApiResponse(vitals).then(applyVitalsIdsToPrescription);
              } else if (rawVitalsAmbient && Object.keys(rawVitalsAmbient).length > 0 && Object.values(rawVitalsAmbient).some(v => String(v ?? '').trim().length > 10)) {
                persistVitalsFromApiResponse(rawVitalsAmbient).then(applyVitalsIdsToPrescription);
              }
            } else {
              setPrescriptionData((prev) => {
                const emptyPad = {
                  symptoms: [],
                  medications: [],
                  vitalsAndBodyComposition: {},
                  advice: [],
                  diagnosis: [],
                  examinations: [],
                  followUp: "",
                  labInvestigation: [],
                  labResults: [],
                  medicalHistory: [],
                  vaccinations: [],
                  others: [],
                  dynamicFields: localModules.reduce((acc, moduleName) => {
                    acc[moduleName] = [];
                    return acc;
                  }, {}),
                };
                const labResults = (Array.isArray(prev?.labResults) && prev.labResults.length > 0) ? prev.labResults : [];
                return { ...emptyPad, labResults };
              });
            }

            // Only update conversations this way if not in ambient mode (ambient mode uses queries array above)
            if (!isAmbientMode && mode !== 'ambient' && window.TATVA_ACTIVE_VOICE_SERVICE !== S_AMBIENT_VOICE_RX) {
            setConversations((prevConversations) => {
              if (conversationData && conversationData.length > 0) {
                return conversationData;
              }
              if (genRxDetails?._id) {
                const currentInput = {
                  speaker: "doctor",
                  text: transcribedText,
                  timestamp: new Date().toISOString()
                };
                return [...prevConversations, currentInput];
              } else {
                const initialConversation = {
                  speaker: "doctor",
                  text: transcribedText || "Initial consultation",
                  timestamp: new Date().toISOString()
                };
                return [initialConversation];
              }
            });
          }
          }

          // Update genRxDetails - new pipeline: data.history[0].transcription, sourceDurationInSeconds, data._id
          const history0 = actualData?.history?.[0] ?? responseData?.history?.[0];
          const sourceFromResponse = history0?.transcription ?? actualData?.source ?? responseData?.data?.source ?? responseData?.source;
          const sourceDurationFromResponse = history0?.sourceDurationInSeconds ?? actualData?.source_duration ?? responseData?.data?.source_duration ?? responseData?.source_duration;
          const timeRequiredFromResponse = history0?.timeRequiredInMs ?? actualData?.timeRequiredInMs ?? responseData?.data?.timeRequiredInMs ?? responseData?.timeRequiredInMs;
          const idFromResponse = actualData?._id ?? responseData?.data?._id ?? responseData?._id;

          setGenRxDetails({
            source: sourceFromResponse || genRxDetails?.source || '',
            source_duration: sourceDurationFromResponse ?? genRxDetails?.source_duration,
            timeRequiredInMs: timeRequiredFromResponse ?? genRxDetails?.timeRequiredInMs,
            type: "ambient",
            _id: idFromResponse || genRxDetails?._id,
          });
          setInputText("");
          setIsEditing(false);
          setUseVoiceRx(true);
          setShowPrescription(true);
        } else {
          if (response.success === false && response.data === null) {
            throw new Error(response.error || "Server error - API returned failure with null data");
          } else {
            throw new Error(response.error || "Failed to process ambient prescription - check response structure");
          }
        }
      } else {
        // Dictate mode: same pipeline - upload first for audio, then JSON payload to common endpoint
        const patientId = patient_data?.patient_unique_id;
        const admissionId = caseManagerData?.admission_id || null;

        const previousContext =
          prescriptionData && hasRxPadContent(prescriptionData) ? mapPrescriptionDataToDigitizeData(prescriptionData) : {};
        const consentPayload = await getConsentForDigitization();
        let payload;

        if (audioBlobParam) {
          if (!audioBlobParam?.size) {
            throw new Error("Recording is empty. Please record again.");
          }
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const arrayBuffer = await audioBlobParam.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const sourceDuration = audioBuffer.duration;
          const fileName = `voice-rx-recording-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
          const audioFile = new File([audioBlobParam], fileName, { type: audioBlobParam.type || "audio/webm" });
          let prescriptionUrl;
          const uploadStartedAt = Date.now();
          try {
            const uploadResponse = await uploadVoiceAudio(audioFile);
            prescriptionUrl = uploadResponse?.data?.prescriptionUrl ?? uploadResponse?.prescriptionUrl;
            if (prescriptionUrl) {
              prescriptionUrlsForSessionRef.current.add(prescriptionUrl);
            }
          } catch (uploadError) {
            trackVoiceSubmitClickEvent({
              voiceApiCalled: false,
              prescriptionUrl: "",
              network: "unstable",
              durationOfAudio: Math.round(sourceDuration || 0),
              sessionId: voiceSessionIdRef.current,
              submitId,
              requestId,
              audioSizeBytes: audioBlobParam?.size || 0,
              audioMimeType: audioBlobParam?.type || "audio/webm",
              modeForEvent,
              fromVoiceRecordingEvent,
              uploadLatencyMs: Date.now() - uploadStartedAt,
              uploadFailed: true,
              uploadErrorMessage: uploadError?.message || "upload_failed",
              voicecall,
            });
            throw uploadError;
          }
          if (!prescriptionUrl) throw new Error("Failed to upload audio file");
          prescriptionUrlForApiResult = prescriptionUrl;
          trackVoiceSubmitClickEvent({
            voiceApiCalled: true,
            prescriptionUrl,
            network: "stable",
            durationOfAudio: Math.round(sourceDuration || 0),
            sessionId: voiceSessionIdRef.current,
            submitId,
            requestId,
            audioSizeBytes: audioBlobParam?.size || 0,
            audioMimeType: audioBlobParam?.type || "audio/webm",
            modeForEvent,
            fromVoiceRecordingEvent,
            uploadLatencyMs: Date.now() - uploadStartedAt,
            uploadFailed: false,
            uploadErrorMessage: "",
            voicecall,
          });
          payload = {
            prescriptionUrls: [prescriptionUrl],
            sourceDuration: Math.round(sourceDuration),
            needConversation: false,
            consent: consentPayload,
            text: "",
            type: "AUDIO_NO_CONTEXT",
            version: "v2",
            previousContext,
          };
        } else {
          payload = {
            prescriptionUrls: [],
            sourceDuration: 0,
            needConversation: false,
            consent: consentPayload,
            text: (transcribedText || "").trim(),
            type: "TEXT_WITH_CONTEXT",
            version: "v2",
            previousContext,
          };
        }

        const voiceApiStartedAt = Date.now();
        voiceApiAttempted = true;
        response = genRxDetails?._id
          ? await updateGenRx(payload, genRxDetails._id, patientId, admissionId)
          : await generateRx(payload, patientId, admissionId);
        voiceApiLatencyMs = Date.now() - voiceApiStartedAt;
        voiceApiHttpStatus = response?.status ?? response?.data?.status ?? 200;

        const responseData = response?.data?.response ?? response?.data ?? response;
        const actualDataDictate = responseData?.response ?? responseData?.data ?? responseData;
        const dataForSuccess = actualDataDictate || responseData;
        const isSuccess = response?.success !== false && dataForSuccess && (
          dataForSuccess?.digitize ||
          dataForSuccess?.digitizeData ||
          dataForSuccess?.history?.[0]?.digitize ||
          dataForSuccess?.rx ||
          dataForSuccess?.symptoms ||
          dataForSuccess?.conversation ||
          dataForSuccess?.rxDigitizationHistory
        );

        if (isSuccess) {
          const dataForParse = actualDataDictate || responseData;
          voiceApiRecordId =
            dataForParse?._id ||
            responseData?.data?._id ||
            responseData?._id ||
            genRxDetails?._id ||
            "";
          const digitizeDataForEvent =
            dataForParse?.digitizeData ??
            dataForParse?.history?.[0]?.digitize ??
            responseData?.digitizeData ??
            responseData?.digitize ??
            null;
          if (digitizeDataForEvent) {
            const mappedForEmptyCheck = mapDigitizeDataToPrescription(digitizeDataForEvent);
            const modulesDetails = getFilledRxModulesDetails(mappedForEmptyCheck || {});
            rxModulesFilledCount = modulesDetails.rxModulesFilledCount;
            filledModules = modulesDetails.filledModules;
            isEmptyPrescription = modulesDetails.rxModulesFilledCount === 0;
          } else {
            rxModulesFilledCount = 0;
            filledModules = [];
            isEmptyPrescription = true;
          }
          if (!dataForParse) {
            throw new Error("No data received from API");
          }
          // PUT/POST: use digitizeData (fresh AI output); fallback to editedData only when no digitizeData
          const editedDataDictate = dataForParse.editedData ?? null;
          const digitizeDataDictate = dataForParse.digitizeData ?? dataForParse.history?.[0]?.digitize ?? null;
          const dataForPadDictate = digitizeDataDictate ?? editedDataDictate ?? dataForParse.refinedData ?? null;
          if (digitizeDataDictate) lastDigitizeDataRef.current = digitizeDataDictate;

          let updatedTranscript = null;
          let updatedQueries = queries;

          if (!isFromSC) {
            let prescriptionData = null;
            let conversationData = null;

            if (dataForPadDictate) {
              prescriptionData = digitizeDataDictate
                ? mapDigitizeDataToPrescription(digitizeDataDictate)
                : (editedDataDictate
                  ? (editedDataDictate.symptoms !== undefined || editedDataDictate.medications !== undefined ? editedDataDictate : mapDigitizeDataToPrescription(editedDataDictate))
                  : mapDigitizeDataToPrescription(dataForParse.refinedData));
            }
            if (!prescriptionData && (responseData.symptoms || responseData.medications || responseData.vitalsAndBodyComposition)) {
              prescriptionData = responseData;
            }
            else if (!prescriptionData && responseData.rxDigitizationHistory?.[0]?.payload?.response) {
              prescriptionData = responseData.rxDigitizationHistory[0].payload.response;
            }
            else if (!prescriptionData && responseData.rxDigitizationHistory?.[0]?.response) {
              prescriptionData = responseData.rxDigitizationHistory[0].response;
            }
            else if (!prescriptionData && responseData.digitize) {
              prescriptionData = responseData.digitize;
            }
            
            if (responseData.conversation) {
              conversationData = responseData.conversation;
            }
            else if (responseData.rxDigitizationHistory?.[0]?.payload?.conversation) {
              conversationData = responseData.rxDigitizationHistory[0].payload.conversation;
            }
            
            if (prescriptionData) {
              // Track which sections were initially populated from API BEFORE setting state
              if (prescriptionData.symptoms && Array.isArray(prescriptionData.symptoms) && prescriptionData.symptoms.length > 0) {
                initiallyPopulatedSectionsRef.current.add('symptoms');
              }
              if (prescriptionData.surgeries && Array.isArray(prescriptionData.surgeries) && prescriptionData.surgeries.length > 0) {
                initiallyPopulatedSectionsRef.current.add('surgeries');
              }
              if (prescriptionData.vaccinations && Array.isArray(prescriptionData.vaccinations) && prescriptionData.vaccinations.length > 0) {
                initiallyPopulatedSectionsRef.current.add('vaccinations');
              }
              if (prescriptionData.medicalHistory && Array.isArray(prescriptionData.medicalHistory) && prescriptionData.medicalHistory.length > 0) {
                initiallyPopulatedSectionsRef.current.add('medicalHistory');
                // Track which medical history types were initially populated
                prescriptionData.medicalHistory.forEach(item => {
                  const type = item.type?.toLowerCase().replace(/\s+/g, '_') || 'others';
                  initiallyPopulatedMedicalHistoryTypesRef.current.add(type);
                });
              }
              if (prescriptionData.examinations && Array.isArray(prescriptionData.examinations) && prescriptionData.examinations.length > 0) {
                initiallyPopulatedSectionsRef.current.add('examinations');
              }
              if (prescriptionData.diagnosis && Array.isArray(prescriptionData.diagnosis) && prescriptionData.diagnosis.length > 0) {
                initiallyPopulatedSectionsRef.current.add('diagnosis');
              }
              if (prescriptionData.advice && ((typeof prescriptionData.advice === 'string' && prescriptionData.advice.trim()) || (Array.isArray(prescriptionData.advice) && prescriptionData.advice.length > 0))) {
                initiallyPopulatedSectionsRef.current.add('advice');
              }
              if (prescriptionData.others && Array.isArray(prescriptionData.others) && prescriptionData.others.length > 0) {
                initiallyPopulatedSectionsRef.current.add('others');
              }
              if (prescriptionData.followUp && prescriptionData.followUp.trim()) {
                initiallyPopulatedSectionsRef.current.add('followUp');
              }
              if (prescriptionData.vitalsAndBodyComposition && Object.keys(prescriptionData.vitalsAndBodyComposition).length > 0) {
                initiallyPopulatedSectionsRef.current.add('vitalsAndBodyComposition');
              }
              if (prescriptionData.labResults && Array.isArray(prescriptionData.labResults) && prescriptionData.labResults.length > 0) {
                initiallyPopulatedSectionsRef.current.add('labResults');
              }
              if (prescriptionData.medications && Array.isArray(prescriptionData.medications) && prescriptionData.medications.length > 0) {
                initiallyPopulatedSectionsRef.current.add('medications');
              }
              if (prescriptionData.labInvestigation && Array.isArray(prescriptionData.labInvestigation) && prescriptionData.labInvestigation.length > 0) {
                initiallyPopulatedSectionsRef.current.add('labInvestigation');
              }
              // Track dynamicFields modules
              if (prescriptionData.dynamicFields && typeof prescriptionData.dynamicFields === 'object') {
                Object.entries(prescriptionData.dynamicFields).forEach(([moduleName, moduleData]) => {
                  if (Array.isArray(moduleData) && moduleData.length > 0) {
                    initiallyPopulatedSectionsRef.current.add(`dynamicFields.${moduleName}`);
                  }
                });
              }
              
              const validatedPrescriptionDataForDictate = validatePrescriptionData(prescriptionData);
              if (validatedPrescriptionDataForDictate) {
                // Fetch lab results from GET API if not present in digitization response
                const hasLabResultsFromApi = validatedPrescriptionDataForDictate.labResults && Array.isArray(validatedPrescriptionDataForDictate.labResults) && validatedPrescriptionDataForDictate.labResults.length > 0;
                let labResultsToUse = hasLabResultsFromApi ? validatedPrescriptionDataForDictate.labResults : [];
                if (!hasLabResultsFromApi && patient_data?.patient_unique_id) {
                  try {
                    const { getTodayLabResults } = await import('../utils/labResultsUtils');
                    const fetchedLabResults = await getTodayLabResults(patient_data, false);
                    if (fetchedLabResults && fetchedLabResults.length > 0) {
                      labResultsToUse = fetchedLabResults;
                      initiallyPopulatedSectionsRef.current.add('labResults');
                    }
                  } catch (err) {
                    console.error('[Dictate] Failed to fetch lab results from GET API:', err);
                  }
                }

                setPrescriptionData((prev) => {
                  const merged = mergeVoiceApiPrescriptionWithPrior(
                    prev,
                    validatedPrescriptionDataForDictate
                  );
                  return { ...merged, labResults: labResultsToUse };
                });   
                
                // Convert API medicalHistory format to CashManagerContext format and populate it
                if (validatedPrescriptionDataForDictate.medicalHistory && Array.isArray(validatedPrescriptionDataForDictate.medicalHistory) && validatedPrescriptionDataForDictate.medicalHistory.length > 0 && setMedicalHistoryData) {
                  const convertedData = convertMedicalHistoryToContextFormat(validatedPrescriptionDataForDictate.medicalHistory, medicalHistoryData);
                  setMedicalHistoryData(convertedData);
                }
                const vitalsVoice = validatedPrescriptionDataForDictate.vitalsAndBodyComposition;
                const rawVitals = prescriptionData.vitalsAndBodyComposition;
                const hasResponseVitalsVoice = vitalsVoice && Object.keys(vitalsVoice).length > 0 &&
                  Object.values(vitalsVoice).some(v => { const s = String(v ?? '').trim(); return s !== '' && s !== 'undefined' && s !== 'null'; });
                if (hasResponseVitalsVoice) {
                  persistVitalsFromApiResponse(vitalsVoice).then(applyVitalsIdsToPrescription);
                } else if (rawVitals && Object.keys(rawVitals).length > 0 && Object.values(rawVitals).some(v => String(v ?? '').trim().length > 10)) {
                  persistVitalsFromApiResponse(rawVitals).then(applyVitalsIdsToPrescription);
                }
              }
            }
            
            if (conversationData) {
              setConversations(conversationData);
            }
            
            // Update transcript for dictate/voice mode: use full history from response (one transcript per update)
            const historyDictate = dataForParse?.history ?? responseData?.data?.history ?? responseData?.history;
            const hasHistory = Array.isArray(historyDictate) && historyDictate.length > 0;

            if (hasHistory) {
              const validTranscriptions = historyDictate
                .map((item) => ({
                  text: item.transcription,
                  isAudio: !!(item.sourceDurationInSeconds ?? item.source_duration),
                  duration: item.sourceDurationInSeconds ?? item.source_duration ?? null
                }))
                .filter((query) => query.text && query.text !== "null" && query.text);
              if (validTranscriptions.length > 0) {
                updatedTranscript = validTranscriptions.map(q => q.text).join(' ');
                updatedQueries = validTranscriptions;
                setQueries(updatedQueries);
                setFullTranscript(updatedTranscript);
                setIsTranscriptExpanded(true);
              }
            } else if (responseData?.data?.source || responseData?.source) {
                 // If source exists but no transcription, use source
                 const source = responseData?.data?.source || responseData.source;
              if (genRxDetails?._id) {
                const existingTranscript = fullTranscript || genRxDetails?.source || '';                                                                        
                updatedTranscript = (existingTranscript + ' ' + source).trim();                                                                    
              } else {
                updatedTranscript = source;
              }
              setFullTranscript(updatedTranscript);
            }
          }

                    // Determine the correct type based on mode - for dictate mode, always keep as 'dictate'                                                              
          const correctType = (isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient')                                                                             
            ? 'ambient' 
            : 'dictate';

          // Calculate the updated source transcript - use source from response if available, otherwise use updatedTranscript                                    
          // For updates, append new transcription to existing source
          // Check responseData.data first (for nested structure), then responseData directly
          const history0Gen = dataForParse?.history?.[0] ?? responseData?.data?.history?.[0] ?? responseData?.history?.[0];
          const sourceFromResponse = history0Gen?.transcription ?? responseData?.data?.source ?? responseData?.source;
          const transcriptionFromResponse = history0Gen?.transcription ?? responseData?.data?.transcription ?? responseData?.transcription;
          const sourceDurationFromResponse = history0Gen?.sourceDurationInSeconds ?? history0Gen?.source_duration ?? responseData?.data?.source_duration ?? responseData?.source_duration;
          const timeRequiredFromResponse = history0Gen?.timeRequiredInMs ?? responseData?.data?.timeRequiredInMs ?? responseData?.timeRequiredInMs;
          const idFromResponse = dataForParse?._id ?? responseData?.data?._id ?? responseData?._id;

          let updatedSource = '';
          
          if (isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient') {
            // For ambient mode, use source from response or keep existing
            if (sourceFromResponse) {
              updatedSource = sourceFromResponse;
            } else if (genRxDetails?._id && transcriptionFromResponse) {
              // When updating, append the new transcription to existing source
              const existingSource = genRxDetails?.source || fullTranscript || '';
              updatedSource = (existingSource + ' ' + transcriptionFromResponse).trim();
            } else {
              updatedSource = genRxDetails?.source || fullTranscript || '';
            }
          } else {
            // For dictate mode
            if (genRxDetails?._id && transcriptionFromResponse) {
              // When updating, append the new transcription to existing source
              const existingSource = genRxDetails?.source || fullTranscript || '';
              updatedSource = (existingSource + ' ' + transcriptionFromResponse).trim();                                                                         
            } else {
              // For new prescriptions or when source is provided directly
              updatedSource = sourceFromResponse || updatedTranscript || fullTranscript || genRxDetails?.source || '';                                           
            }
          }

          setGenRxDetails({
            source: updatedSource || genRxDetails?.source || '',
            source_duration: sourceDurationFromResponse || genRxDetails?.source_duration,                                                                     
            timeRequiredInMs: timeRequiredFromResponse || genRxDetails?.timeRequiredInMs,                                                                  
            type: correctType,
            _id: idFromResponse || genRxDetails?._id,
          });
          setInputText("");
          setIsEditing(false);
          setUseVoiceRx(true);
          setShowPrescription(true);
        } else {
          if (response.success === false && response.data === null) {
            throw new Error(response.error || "Server error - API returned failure with null data");
          } else {
            throw new Error(response.error || "Failed to process prescription");
          }
        }
      }
      if (voiceApiAttempted) {
        voiceApiSuccessRef.current = true;
        voiceApiFailedRef.current = false;
        if (prescriptionUrlForApiResult) {
          prescriptionUrlsForSessionRef.current.add(prescriptionUrlForApiResult);
        }
        trackVoiceApiResultEvent({
          voiceFailed: false,
          errorMessage: "",
          retryAttempts: getVoiceRetryAttempts(),
          prescriptionUrl: prescriptionUrlForApiResult || window.__TATVA_VOICE_API_LAST_UPLOAD_URL || "",
          sessionId: voiceSessionIdRef.current,
          recordId: voiceApiRecordId,
          isEmptyPrescription,
          submitId,
          requestId,
          voiceApiLatencyMs,
          httpStatus: voiceApiHttpStatus,
          errorCode: "",
          errorType: "",
          rxModulesFilledCount,
          filledModules,
          modeForEvent,
          voicecall,
        });
      }
    } catch (error) {
      console.error("Error in voice digitization:", error?.message || error);
      if (voiceApiAttempted) {
        voiceApiFailedRef.current = true;
        voiceApiSuccessRef.current = false;
        if (prescriptionUrlForApiResult) {
          prescriptionUrlsForSessionRef.current.add(prescriptionUrlForApiResult);
        }
        trackVoiceApiResultEvent({
          voiceFailed: true,
          errorMessage: error?.message || "",
          retryAttempts: getVoiceRetryAttempts(),
          prescriptionUrl: prescriptionUrlForApiResult || window.__TATVA_VOICE_API_LAST_UPLOAD_URL || "",
          sessionId: voiceSessionIdRef.current,
          recordId: voiceApiRecordId || genRxDetails?._id || "",
          isEmptyPrescription: true,
          submitId,
          requestId,
          voiceApiLatencyMs,
          httpStatus: error?.response?.status ?? voiceApiHttpStatus,
          errorCode: error?.code || error?.response?.status || error?.message || "",
          errorType: classifyVoiceApiErrorType(error),
          rxModulesFilledCount: 0,
          filledModules: [],
          modeForEvent,
          voicecall,
        });
      }
      if (error?.message?.includes("Cannot set properties of null")) {
        message.error("Data processing error - please try again");
      } else if (error?.response?.status === 401) {
        message.error("Authorization error - please check your login");
      } else if (error?.response?.status === 500) {
        message.error("Server error - please try again later");
      } else if (error?.message?.includes("Network Error") || error?.code === 'NETWORK_ERROR') {                                                                  
        message.error("Network connection error - please check your internet connection");
      } else if (error?.message?.includes("timeout") || error?.code === 'ECONNABORTED') {                                                                         
        message.error("Request timeout - the server is taking too long to respond");
      } else if (error?.response?.status === 404) {
        message.error("Service not found - please contact support");
      } else if (error?.response?.status === 403) {
        message.error("Access denied - insufficient permissions");
      } else if (error?.message?.includes("failed to load")) {
        message.error("Failed to load prescription data - please refresh and try again");
      } else {
        message.error(error?.message || "Failed to process prescription");
      }
    } finally {
      setIsProcessing(false);
      setIsRecording(false);
    }
  };

  const handleUpdateGenRX = async (
    quantityActionMedicine,
    sanitizedMedications
  ) => {
    try {
      let response;
      // others: backend expects string[] only, e.g. ["Cross refer to her to her"] — no { value } wrapping
      const othersAsStrings = Array.isArray(prescriptionData?.others)
        ? prescriptionData.others.map((o) => (typeof o === "string" ? o : (o?.value ?? o?.name ?? ""))).filter(Boolean)
        : [];
      const updatedPrescriptionData = {
        ...prescriptionData,
        others: othersAsStrings,
        medications: sanitizedMedications.map((item, index) => {
          const quantityValue =
            quantityActionMedicine?.medicines?.[index]?.quantity;
          let quantity = 0;

          if (
            typeof quantityValue === "number" &&
            Number.isFinite(quantityValue)
          ) {
            quantity = quantityValue;
          } else if (quantityValue !== undefined && quantityValue !== null) {
            const parsedQuantity = Number(quantityValue);
            quantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
          }

          return ensureMedicationGroundedForRxSave({ ...item, quantity });
        }),
        labInvestigation: Array.isArray(prescriptionData?.labInvestigation)
          ? prescriptionData.labInvestigation.map((item) =>
              ensureLabInvestigationMetadataForRxSave(item)
            )
          : [],
      };

      const editedDataForApi = { ...updatedPrescriptionData };
      if (editedDataForApi.vitalsAndBodyComposition && typeof editedDataForApi.vitalsAndBodyComposition === "object") {
        const { tcv_id, tcbc_id, dev_unique_id, ...vitalsRest } = editedDataForApi.vitalsAndBodyComposition;
        const generalRBSVal = vitalsRest.general_rbs ?? vitalsRest["General RBS"] ?? vitalsRest.generalRBS ?? vitalsRest.genralRBS;
        if (generalRBSVal != null && String(generalRBSVal).trim() !== "") vitalsRest.generalRBS = String(generalRBSVal).trim();
        delete vitalsRest.general_rbs;
        delete vitalsRest["General RBS"];
        delete vitalsRest.genralRBS;
        editedDataForApi.vitalsAndBodyComposition = vitalsRest;
      }

      if (isAmbientMode && genRxDetails?.type === "ambient") {
        response = await editAmbientRxDetails(
        { editedData: editedDataForApi },
        genRxDetails?._id
      );
      } else {
        response = await editGenRxDetails(
          { editedData: editedDataForApi },
          genRxDetails?._id
        );
      }
      
      if (response.status === 204 || response.success) {
        setGenRxDetails({
          source: response.data?.source || genRxDetails.source,
          source_duration: response.data?.source_duration || genRxDetails.source_duration,
          timeRequiredInMs: response.data?.timeRequiredInMs || genRxDetails.timeRequiredInMs,
          type: response.data?.type || genRxDetails.type,
          _id: response.data?._id || genRxDetails._id,
        });
      } else {
        throw new Error(response.error || "Failed to update Rx");
      }
    } catch (error) {
      console.error("Error in voice digitization:", error);
      message.error(error?.message || "Failed to process prescription");
    }
  };

  const mergeData = (data1, data2) => {
    // Helper function to check if two items are duplicates
    const isDuplicate = (item1, item2) => {
      return (
        item1.name === item2.name &&
        item1.duration === item2.duration &&
        item1.severity === item2.severity &&
        item1.notes === item2.notes
      );
    };

    // Add SC flag to data2 items
    const data2WithSC = {
      ...data2,
      symptoms: data2?.symptoms?.map((symptom) => ({
        ...symptom,
        SC: true,
      })),
      medicalHistory: data2?.medicalHistory?.map((history) => ({
        ...history,
        SC: true,
      })),
    };

    // Merge symptoms arrays while removing duplicates
    const mergedSymptoms = [...data1?.symptoms];
    data2WithSC?.symptoms?.forEach((symptom2) => {
      if (!mergedSymptoms.some((symptom1) => isDuplicate(symptom1, symptom2))) {
        mergedSymptoms.push(symptom2);
      }
    });

    // Merge medicalHistory arrays while removing duplicates
    const mergedMedicalHistory = [...data1.medicalHistory];
    data2WithSC?.medicalHistory?.forEach((history2) => {
      if (
        !mergedMedicalHistory.some((history1) =>
          isDuplicate(history1, history2)
        )
      ) {
        mergedMedicalHistory.push(history2);
      }
    });

    // Return merged object; data2 (e.g. symptoms collector) often has no labResults - do not let ...data2 overwrite data1.labResults
    const labResults = (Array.isArray(data2?.labResults) && data2.labResults.length > 0)
      ? data2.labResults
      : (Array.isArray(data1?.labResults) && data1.labResults.length > 0 ? data1.labResults : []);
    return {
      ...data1,
      ...data2,
      symptoms: mergedSymptoms,
      medicalHistory: mergedMedicalHistory,
      dynamicFields: data1?.dynamicFields || data2?.dynamicFields || {},
      labResults,
    };
  };

  const handlePauseResume = () => {

    if (isRecording || isPaused) {
      mutePauseButtonClickCountRef.current += 1;
    }
    
    if (!mediaRecorderRef.current) return;
    
    try {
      if (isPaused) {
        if (mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.resume();
        }
        setIsPaused(false);
      } else {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.pause();
        }
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Error pausing/resuming recording:', error);
    }
  };

  const handleInputChange = (e) => {
    setEditableText(e.target.value);
    editedModulesByUserRef.current.add("dynamicFields");
    setIsRxEdited(true);
  };

  const handlePaste = (e, type) => {
    const pastedData =
      e.clipboardData.getData("text/plain") ||
      e.clipboardData.getData("Text") ||
      e.clipboardData.getData("text");
    const points = pastedData
      .split("\n")
      .map((point) => point.trim())
      .filter(Boolean);

    if (points.length > 0) {
      setPrescriptionData((prevData) => {
        const updatedData = { ...prevData };

        points.forEach((point) => {
          if (!updatedData.dynamicFields[type]) {
            updatedData.dynamicFields[type] = [];
          }
          updatedData.dynamicFields[type].push(point);
        });

        return updatedData;
      });
      editedModulesByUserRef.current.add("dynamicFields");
      setIsRxEdited(true);
    }

    // Clear the editable text
    e.preventDefault();
    setEditableText("");
  };

  const inputRefs = useRef({});
  const inputLineItemRefs = useRef({});

  const handleKeyDown = (e, type, index, isExisting) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent newline in the input field

      const trimmedText = isExisting
        ? editableLineItem?.trim()
        : editableText.trim();
      if (trimmedText) {
        setPrescriptionData((prevData) => {
          const updatedData = { ...prevData };

          if (isExisting) {
            if (!updatedData?.[type]) {
              updatedData[type] = [];
            }
            if (["advice", "others"].includes(type)) {
              updatedData[type][index] = trimmedText;
              updatedData[type].splice(index + 1, 0, "");
            } else {
              updatedData[type][index].lineItem = trimmedText;
              // mark item as user-edited when line item is changed via Enter
              updatedData[type][index].edited = true;
              updatedData[type].splice(index + 1, 0, {
                lineItem: " ",
                name: " ",
              });
            }
            setEditableLineItem(" ");
            setEditableText("");
            return updatedData;
          }
          if (!updatedData.dynamicFields[type]) {
            updatedData.dynamicFields[type] = [];
          }

          // Update the current index with trimmed text
          updatedData.dynamicFields[type][index] = trimmedText;

          // Insert an empty string after the current index
          updatedData.dynamicFields[type].splice(index + 1, 0, "");
          return updatedData;
        });

        // Update active index and clear input
        setActiveIndex(index + 1);
        setIsRxEdited(true);
        if (isExisting && !["advice", "others"].includes(type)) {
          setActiveType(`${type}-lineItem`);
          setEditableLineItem("");
        } else {
          setActiveType(type);
          setEditableText("");
        }

        // Focus on the newly added input
        setTimeout(() => {
          const nextIndex = index + 1;
          if (isExisting) inputLineItemRefs.current[nextIndex]?.focus();
          else inputRefs.current[nextIndex]?.focus();
        }, 0);
      }
    }
  };

  const handleKeyPress = (e) => {
    // If only Enter is pressed (without Shift), call API
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent default new line
      handleSend();
    }
    // If Shift + Enter is pressed, let the default behavior happen (new line)
  };

  // Handle lineItem input change for editing
  const handleLineItemChange = (e) => {
    setEditableLineItem(e.target.value);
    setIsRxEdited(true);
  };

  const handleInputBlur = (type, index, isCustom, isExisting) => {
    if (
      (activeIndex !== null && activeType !== null) ||
      isCustom ||
      isExisting
    ) {
      setPrescriptionData((prevData) => {
        const updatedData = { ...prevData };
        // Determine which text to use based on the active type
        let trimmedText = "";
        if (
          activeType === "labResults" ||
          (type === "labResults" && !isExisting)
        ) {
          trimmedText = editableText?.trim();
        } else if (
          activeType === "labResults-lineItem" ||
          (type === "labResults" && isExisting)
        ) {
          trimmedText = editableLineItem?.trim();
        } else if (isCustom) {
          trimmedText = editableText?.trim();
        } else if (isExisting) {
          trimmedText = editableLineItem?.trim();
        } else {
          trimmedText = editableText?.trim() || "";
        }

        if (!trimmedText) {
          // For medications and labInvestigation, lineItem is optional.
          // Do NOT delete the item when editing existing lineItem to empty.
          if (
            isExisting &&
            (type === "medications" || type === "labInvestigation")
          ) {
            if (updatedData?.[type]?.[index]) {
              updatedData[type][index].lineItem = "";
            }
            return updatedData;
          }
          if (type === "vitalsAndBodyComposition") {
            updatedData.vitalsAndBodyComposition[index] = "";
          } else if (isCustom) {
            updatedData.dynamicFields[type] = updatedData.dynamicFields[
              type
            ].filter((_, i) => i !== index);
          } else if (isExisting) {
            updatedData[type] = updatedData[type].filter((_, i) => i !== index);
          } else if (type === "followUp") {
            updatedData.followUp = "";
          } else {
            updatedData[type] = updatedData?.[type]?.filter(
              (_, i) => i !== index
            );
          }
          return updatedData;
        }
        if (
          type === "medications" ||
          type === "labInvestigation" ||
          type === "symptoms" ||
          type === "examinations" ||
          type === "diagnosis" ||
          type === "medicalHistory" ||
          type === "vaccinations"
        ) {
          // When editing existing structured items, only update lineItem here.
          // Name field is handled separately via handleNameBlur
          if (type === "medications" || type === "labInvestigation") {
            // For medications and labInvestigation, only update if lineItem has changed
            const originalLineItem = updatedData[type][index].lineItem || "";
            if (trimmedText !== originalLineItem) {
              updatedData[type][index].lineItem = trimmedText;
              // mark item as user-edited when line item is changed on blur
              updatedData[type][index].edited = true;
            }
          } else {
            updatedData[type][index].name = trimmedText;
            updatedData[type][index].lineItem = trimmedText;
          }
        } else if (type === "labResults" && activeType === "labResults") {
          updatedData[type][index].testname = trimmedText;
        } else if (
          type === "labResults" &&
          activeType === "labResults-lineItem"
        ) {
          updatedData[type][index].value = trimmedText;
        } else if (type === "advice" || type === "others") {
          updatedData[type][index] = trimmedText;
        } else if (type === "vitalsAndBodyComposition") {
          updatedData.vitalsAndBodyComposition[index] = trimmedText;
        } else if (isCustom) {
          updatedData.dynamicFields[type][index] = trimmedText;
        } else if (type === "followUp") {
          updatedData.followUp = trimmedText;
        }
        return updatedData; // Persist changes
      });
      setIsRxEdited(true);
    }
    // Clear all editing states
    setActiveIndex(null);
    setActiveType(null);
    setEditableText(""); // Clear editable text after blur
    setEditableLineItem(""); // Clear editable lineItem after blur
    setEditableName(""); // Clear editable name after blur
  };

  const handleNameChange = (e) => {
    setEditableName(e.target.value);
    setIsRxEdited(true);
  };

  const handleNameBlur = (type, index) => {
    const trimmed = (editableName || "").trim();
    const originalName = prescriptionData[type][index]?.name || "";

    // Name is mandatory: if empty, do not update or clear the existing value
    if (!trimmed) {
      // Exit edit mode without changes
      setActiveIndex(null);
      setActiveType(null);
      setEditableName("");
      return;
    }

    // Only update if the value has actually changed
    if (trimmed !== originalName) {
      setPrescriptionData((prevData) => {
        const updatedData = { ...prevData };
        if (updatedData?.[type]?.[index]) {
          updatedData[type][index].name = trimmed;
        }
        return updatedData;
      });
      setIsRxEdited(true);
    }
    // Exit edit mode for name explicitly
    setActiveIndex(null);
    setActiveType(null);
    setEditableName("");
  };

  // Handle click on an item (to edit)
  const handleItemClick = (type, index, isCustom) => {
    if (activeIndex !== null && activeType !== null) {
      handleInputBlur(activeType, activeIndex);
    }

    if (
      type === "symptoms" ||
      type === "medications" ||
      type === "labInvestigation" ||
      type === "examinations" ||
      type === "diagnosis" ||
      type === "medicalHistory" ||
      type === "vaccinations"
    ) {
      setEditableText(prescriptionData[type][index].name);
    } else if (type === "labResults") {
      setEditableText(prescriptionData[type][index].testname);
    } else if (type === "advice" || type === "others") {
      setEditableText(prescriptionData[type][index]);
    } else if (type === "vitalsAndBodyComposition") {
      setEditableText(prescriptionData.vitalsAndBodyComposition[index]);
    } else if (isCustom) {
      setEditableText(prescriptionData.dynamicFields[type][index]);
    } else if (type === "followUp") {
      setEditableText(prescriptionData?.followUp);
    }

    setActiveIndex(index);
    setActiveType(type);
  };

  // Handle click on name/details to edit
  const handleNameClick = (type, index) => {
    setEditableName(prescriptionData[type][index]?.name || "");
    setActiveIndex(index);
    setActiveType(`${type}-name`);
  };

  // Handle click on a lineItem (to edit)
  const handleLineItemClick = (type, index) => {
    if (
      type === "medications" ||
      type === "labInvestigation" ||
      type === "vaccinations" ||
      type === "medicalHistory" ||
      type === "symptoms" ||
      type === "examinations" ||
      type === "diagnosis"
    ) {
      setEditableLineItem(prescriptionData[type][index]?.lineItem);
    } else if (type === "labResults") {
      setEditableLineItem(prescriptionData[type][index]?.value);
    }
    setActiveIndex(index);
    setActiveType(`${type}-lineItem`);
  };

  const handleSymptomsUpdate = useCallback((symptomsArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      symptoms: Array.isArray(symptomsArray) ? symptomsArray : [],
    }));
    editedModulesByUserRef.current.add("symptoms");
    setIsRxEdited(true);
  }, []);

  const handleVaccinationsUpdate = useCallback((vaccinationsArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      vaccinations: Array.isArray(vaccinationsArray) ? vaccinationsArray : [],
    }));
    editedModulesByUserRef.current.add("vaccinations");
    setIsRxEdited(true);
  }, []);

  const handleExaminationsUpdate = useCallback((examinationsArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      examinations: Array.isArray(examinationsArray) ? examinationsArray : [],
    }));
    editedModulesByUserRef.current.add("examinations");
    setIsRxEdited(true);
  }, []);

  const handleDiagnosisUpdate = useCallback((diagnosisArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      diagnosis: Array.isArray(diagnosisArray) ? diagnosisArray : [],
    }));
    editedModulesByUserRef.current.add("diagnosis");
    setIsRxEdited(true);
  }, []);

  const handleInvestigationUpdate = useCallback((investigationArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      labInvestigation: investigationArray,
    }));
    editedModulesByUserRef.current.add("labInvestigation");
    setIsRxEdited(true);
  }, []);

  const handleAdviceUpdate = useCallback((adviceArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      advice: Array.isArray(adviceArray) ? adviceArray : [],
    }));
    editedModulesByUserRef.current.add("advice");
    setIsRxEdited(true);
  }, []);

  const handleVitalsUpdate = useCallback((vitalsObject) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      vitalsAndBodyComposition: vitalsObject && typeof vitalsObject === "object" ? vitalsObject : {},
    }));
    editedModulesByUserRef.current.add("vitalsAndBodyComposition");
    setIsRxEdited(true);
  }, []);

  const handleMedicalHistoryUpdate = useCallback((medicalHistoryArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      medicalHistory: Array.isArray(medicalHistoryArray) ? medicalHistoryArray : [],
    }));
    editedModulesByUserRef.current.add("medicalHistory");
    setIsRxEdited(true);
    if (medicalHistoryArray && Array.isArray(medicalHistoryArray) && medicalHistoryArray.length > 0 && setMedicalHistoryData) {
      const convertedData = convertMedicalHistoryToContextFormat(medicalHistoryArray, medicalHistoryData);
      setMedicalHistoryData(convertedData);
    }
  }, [setMedicalHistoryData, medicalHistoryData]);

  // Voice/Ambient: when API returns vitals, call addVitals (single in-flight to avoid duplicate API calls)
  const persistVitalsFromApiResponse = useCallback(async (vitalsAndBodyComposition) => {
    if (!vitalsAndBodyComposition || typeof vitalsAndBodyComposition !== 'object' || Object.keys(vitalsAndBodyComposition).length === 0 || !patient_data?.patient_unique_id) {
      return null;
    }
    if (persistVitalsInFlightRef.current) return null;
    persistVitalsInFlightRef.current = true;
    try {
    const v = vitalsAndBodyComposition;
    const hasMeaningfulVitals = Object.values(v).some(val => {
      const s = String(val ?? '').trim();
      return s !== '' && s !== 'undefined' && s !== 'null';
    });
    if (!hasMeaningfulVitals) {
      return null;
    }
    const today = moment().format('YYYY-MM-DD');
    const patientMatch = listVitalsTodayIds != null && String(listVitalsTodayIds.patient_unique_id) === String(patient_data.patient_unique_id);
    let tcv_id = (patientMatch ? listVitalsTodayIds.tcv_id : null) ?? 0;
    let tcbc_id = (patientMatch ? listVitalsTodayIds.tcbc_id : null) ?? 0;
    let dev_unique_id = (patientMatch ? listVitalsTodayIds.dev_unique_id : null) ?? 0;
    if (!patientMatch || (tcv_id === 0 && tcbc_id === 0 && dev_unique_id === 0)) {
      try {
        const list = await dispatch(getVitals({
          patient_unique_id: patient_data.patient_unique_id,
          pam_id: patient_data.pam_id ?? 0,
          mode: ADD,
          pm_pid: patient_data.pm_pid ?? 0,
          pm_id: patient_data.pm_id ?? 0,
        })).unwrap();
        const existingToday = Array.isArray(list) ? list.find((row) => (row.date || '').toString().startsWith(today)) : null;
        if (existingToday) {
          tcv_id = existingToday.tcv_id ?? 0;
          tcbc_id = existingToday.tcbc_id ?? 0;
          dev_unique_id = existingToday.dev_unique_id ?? 0;
        }
      } catch (e) {
        // getVitals failed; proceed with 0 ids
      }
    }
    let systolic = String(v.Systolic || v.systolic || '').trim();
    let diastolic = String(v.Diastolic || v.diastolic || '').trim();
    let blood_press = v.bloodPressure || v.blood_press || '';
    if (blood_press && !systolic && !diastolic) {
      const parts = String(blood_press).split('/');
      if (parts.length >= 2) { systolic = parts[0].trim(); diastolic = parts[1].trim(); }
    } else if (!blood_press && systolic && diastolic) blood_press = `${systolic}/${diastolic}`;
    if (!systolic || !diastolic) blood_press = '';

    const vitalsArray = [{
      date: today,
      temp: String(v.temperature || v.temp || '').trim(),
      pres: String(v.pulse || v.pres || '').trim(),
      resp_rate: String(v.respRate || v.resp_rate || '').trim(),
      systolic,
      diastolic,
      ...(systolic && diastolic ? { blood_press } : {}),
      spo2: String(v.spo2 || v.SPO2 || '').trim(),
      height: String(v.height || v.Height || '').trim(),
      weight: String(v.weight || v.Weight || '').trim(),
      ofc: String(v.ofc || v.OFC || '').trim(),
      sugar: String(v.sugar || v.Sugar || '').trim(),
      general_rbs: String(v['General RBS'] || v.general_rbs || v.generalRBS || v.genralRBS || '').trim(),
      fib4: String(v.FIB4 || v.fib4 || '').trim(),
      waist_circumference: String(v['Waist Circumference'] || v.waist_circumference || '').trim(),
      bmi: String(v.BMI || v.bmi || '').trim(),
      bmr: String(v.BMR || v.bmr || '').trim(),
      bsa: String(v.BSA || v.bsa || '').trim(),
      tcv_id,
      tcbc_id,
      dev_unique_id
    }];
    const sendData = {
      patient_unique_id: patient_data.patient_unique_id,
      pm_pid: patient_data.pm_pid ?? 0,
      pm_id: patient_data.pm_id ?? 0,
      pam_id: patient_data.pam_id ?? 0,
      patient_birth_weight: null,
      data: vitalsArray
    };
    try {
      const addRes = await ApiVitals.addUpdateVitals(sendData);
      if (addRes?.status !== false && addRes?.statusCode !== 400 && addRes?.data?.length) {
        const saved = addRes.data.find(row => (row.date || '').toString().startsWith(today)) || addRes.data[0];
        const rid = { tcv_id: saved?.tcv_id ?? 0, tcbc_id: saved?.tcbc_id ?? 0, dev_unique_id: saved?.dev_unique_id ?? 0 };
        dispatch(setVitalsIdsFromAddVitals({ flow: 'voice', patient_unique_id: patient_data.patient_unique_id, tcv_id: rid.tcv_id, tcbc_id: rid.tcbc_id, dev_unique_id: rid.dev_unique_id }));
        return rid;
      }
    } catch (err) {
      // addVitals failed; caller handles null
    }
    return null;
    } finally {
      persistVitalsInFlightRef.current = false;
    }
  }, [patient_data, listVitalsTodayIds, dispatch]);

  const applyVitalsIdsToPrescription = useCallback((ids) => {
    if (ids) setPrescriptionData((prev) => ({ ...prev, vitalsAndBodyComposition: { ...(prev.vitalsAndBodyComposition || {}), tcv_id: ids.tcv_id, tcbc_id: ids.tcbc_id, dev_unique_id: ids.dev_unique_id } }));
  }, []);

  const handleFollowUpUpdate = useCallback((followUpText) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      followUp: typeof followUpText === "string" ? followUpText : "",
    }));
    editedModulesByUserRef.current.add("followUp");
    setIsRxEdited(true);
  }, []);

  const handleLabResultsUpdate = useCallback((labResultsArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      labResults: Array.isArray(labResultsArray) ? labResultsArray : [],
    }));
    editedModulesByUserRef.current.add("labResults");
    setIsRxEdited(true);
  }, []);

  const handleAdditionalNotesUpdate = useCallback((othersArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      others: Array.isArray(othersArray) ? othersArray : [],
    }));
    editedModulesByUserRef.current.add("others");
    setIsRxEdited(true);
  }, []);

  const handleMedicationsUpdate = useCallback((medicationsArray) => {
    setPrescriptionData((prevData) => ({
      ...prevData,
      medications: medicationsArray,
    }));
    editedModulesByUserRef.current.add("medications");
    setIsRxEdited(true);
  }, []);

  async function onEndVisitClick() {
    if (isEndVisitLoading) return;
    setIsEndVisitLoading(true);
    try {
      stopAllActiveRecorders();
      const isAmbientRx = isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient';
    const rxType = isAmbientRx ? "ambient" : "voice_rx";  
      const prescriptionTypeForEvent = isAmbientRx ? "ambient" : "dictate";
      const wholeSessionDurationMs = voiceSessionStartTimeRef.current
        ? Date.now() - voiceSessionStartTimeRef.current
        : 0;
      const wholeSessionDurationSeconds = Math.round(wholeSessionDurationMs / 1000);

      const modulesDetails = getFilledRxModulesDetails(prescriptionData || {});
      const totalSubmitCount = submitCountRef.current;
      const typedSubmitCount = typedMessagesCountRef.current;
      const audioSubmitCount = Math.max(totalSubmitCount - typedSubmitCount, 0);

      // Try to infer which modules were edited (best-effort).
      const editedModulesFromFlags = new Set();
      const checkEditedArray = (arr, moduleKey) => {
        if (!Array.isArray(arr)) return;
        if (arr.some((item) => item?.edited === true || item?.lineItem?.edited === true)) {
          editedModulesFromFlags.add(moduleKey);
        }
      };
      checkEditedArray(prescriptionData?.symptoms, "symptoms");
      checkEditedArray(prescriptionData?.surgeries, "surgeries");
      checkEditedArray(prescriptionData?.vaccinations, "vaccinations");
      checkEditedArray(prescriptionData?.medicalHistory, "medicalHistory");
      checkEditedArray(prescriptionData?.examinations, "examinations");
      checkEditedArray(prescriptionData?.diagnosis, "diagnosis");
      checkEditedArray(prescriptionData?.medications, "medications");
      checkEditedArray(prescriptionData?.labResults, "labResults");
      checkEditedArray(prescriptionData?.labInvestigation, "labInvestigation");
      checkEditedArray(prescriptionData?.others, "others");

      const editedModules = new Set([
        ...editedModulesByUserRef.current,
        ...editedModulesFromFlags,
      ]);

      const prescriptionUrlsUploadedInSession = Array.from(
        prescriptionUrlsForSessionRef.current
      );

      window.Moengage.track_event("TP_Voice_endVisit", {
        doctorId: profile?.doctor_unique_id || "",
        doctorName: profile?.um_name || "",
        patientId: patient_data?.patient_unique_id || "",
        patientName: patient_data?.pm_fullname || "",
        hospitalId: clinic?.hm_id || "",
        hospitalName: clinic?.hm_name || "",

        sessionId: voiceSessionIdRef.current,
        timestamp: new Date().toISOString(),

        prescription_type: prescriptionTypeForEvent, // dictate | ambient

        duration_of_whole_session_ms: wholeSessionDurationMs,
        duration_of_whole_session_seconds: wholeSessionDurationSeconds,

        no_of_submit_ids_total: totalSubmitCount,
        no_of_typed_submit_ids: typedSubmitCount,
        no_of_audio_submit_ids: audioSubmitCount,

        total_modules_filled: modulesDetails.rxModulesFilledCount,
        filled_modules: Array.isArray(modulesDetails.filledModules)
          ? modulesDetails.filledModules.join(",")
          : "",

        edited_modules: Array.from(editedModules).join(","),
        is_empty_rx: modulesDetails.rxModulesFilledCount === 0 ? 1 : 0,

        prescription_urls_uploaded: prescriptionUrlsUploadedInSession.join(","),
        prescription_urls_uploaded_count: prescriptionUrlsUploadedInSession.length,

        voice_api_failed: voiceApiFailedRef.current ? 1 : 0,
        voice_api_success: voiceApiSuccessRef.current ? 1 : 0,
        voice_api_status:
          voiceApiFailedRef.current && !voiceApiSuccessRef.current
            ? "failed"
            : voiceApiSuccessRef.current
            ? "successful"
            : "unknown",

        voicecall: voiceCallCountRef.current,
      });

    const totalAudioDuration = queries
      .filter(query => query.isAudio && query.duration)
      .reduce((total, query) => {
        const duration = typeof query.duration === 'number' ? query.duration : parseFloat(query.duration) || 0;
        return total + duration;
      }, 0);
    
    window.Moengage.track_event("TP_AV_SaveRx", {
      patient_id: patient_data?.patient_unique_id || "",
      patient_name: patient_data?.pm_fullname || "",
      patient_mobile_number: patient_data?.pm_contact_no || "",
      doctor_id: profile?.doctor_unique_id,
      user_id: userId,
      doctor_name: profile?.um_name,
      doctor_specialty: profile?.dp_name,
      doctor_mobile_number: profile?.um_contact,
      hm_id: clinic?.hm_id,
      clinic_name: clinic?.hm_name,
      rx_type: rxType,
      no_of_submits_count: submitCountRef.current,
      no_of_typed_messages: typedMessagesCountRef.current,
      no_of_times_user_clicked_no_stay: noStayClickCount || 0,
      no_of_times_user_clicked_cross_button: crossButtonClickCountRef.current,
      no_of_times_user_clicked_mute_pause_button: mutePauseButtonClickCountRef.current,
      total_audio_duration_seconds: totalAudioDuration || 0,
      no_of_edits_in_digitization_pad: digitizationPadEditCountRef.current,
    });
    const sanitizedMedications =
      prescriptionData?.medications?.map((item) => {
        const quantityValue = item?.quantity;
        let quantity = 0;

        if (typeof quantityValue === "number" && Number.isFinite(quantityValue)) {
          quantity = quantityValue;
        } else if (quantityValue !== undefined && quantityValue !== null) {
          const parsedQuantity = Number(quantityValue);
          quantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
        }

        return {
          ...item,
          quantity,
        };
      }) || [];

    const quantityActionMedicine = await ApiMedication.getQuantity({
      medicines: sanitizedMedications,
    });
    handleUpdateGenRX(quantityActionMedicine, sanitizedMedications);

    // Subsequent lab result API call only on End Visit: POST lab results if Rx pad has lab data (patientId and doctorId required in payload)
    let resolvedLabReportID = labReportID;
    const labPatientId = patient_data?.patient_unique_id;
    const labDoctorId = tokenData?.user_id;
    if (
      prescriptionData?.labResults &&
      Array.isArray(prescriptionData.labResults) &&
      prescriptionData.labResults.length > 0 &&
      labPatientId != null &&
      labPatientId !== '' &&
      labDoctorId != null &&
      labDoctorId !== ''
    ) {
      try {
        const results = prescriptionLabResultsToResultsArray(prescriptionData.labResults);
        if (results.length > 0) {
          const payload = {
            patientId: labPatientId,
            doctorId: labDoctorId,
            results,
          };
          const response = await addPatientLabReports(payload);
          const idFromResponse = response?.data?.labReportID ?? response?.data?.data?.labReportID;
          if (idFromResponse != null) {
            resolvedLabReportID = idFromResponse;
          }
        }
      } catch (err) {
        console.error("End Visit: failed to save lab results", err);
      }
    }

    // Medical history: consult flow sends as-is (same as HeaderPrescription). Voice/ambient uses resolver for prescriptionData.medicalHistory.
    const isVoiceOrAmbientEndVisit = isAmbientMode || mode === 'ambient' || mode === 'dictation' || fromVoiceRecording ||
      window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient';
    const fromPrescription = prescriptionData?.medicalHistory;
    const fromContext = medicalHistoryData;
    let medicalHistoryForApi;
    if (isVoiceOrAmbientEndVisit && Array.isArray(fromPrescription) && fromPrescription.length > 0) {
      medicalHistoryForApi = await resolveMedicalHistoryForCaseManager(fromPrescription, {
        getSectionsWithTags: () => ApiMedicalHistory.listSectionwithTag(),
        addTag: (payload) => ApiMedicalHistory.addTag(payload),
        searchTag: (payload) => ApiMedicalHistory.searchTag(payload),
      });
    } else {
      medicalHistoryForApi = Array.isArray(fromContext) ? fromContext : [];
    }

    // Vitals for addCaseManager: fetch all today's vitals from addVitals API and send with their IDs (tcv_id, tcbc_id, dev_unique_id)
    const isVoiceOrAmbientRx = isAmbientMode || mode === 'ambient' || mode === 'dictation' || fromVoiceRecording ||
      window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient';
    let vitalsForCase = [];
    try {
      const listPayload = {
        patient_unique_id: patient_data.patient_unique_id,
        pam_id: patient_data.pam_id ?? 0,
        mode: ADD,
        pm_pid: patient_data.pm_pid ?? 0,
        pm_id: patient_data.pm_id ?? 0,
      };
      const allVitals = await dispatch(getVitals(listPayload)).unwrap().catch(() => []);
      const today = moment().format("YYYY-MM-DD");
      const todayVitals = Array.isArray(allVitals) ? allVitals.filter((v) => (v.date || "").toString().startsWith(today)) : [];

      const patientInfo = patient_data ? {
        age: patient_data.ageYears || patient_data.age || patient_data.pm_age,
        gender: patient_data.pm_gender || patient_data.gender
      } : {};
      const hasRxPadVitals = prescriptionData?.vitalsAndBodyComposition && Object.keys(prescriptionData.vitalsAndBodyComposition).length > 0;
      
      if (hasRxPadVitals && todayVitals.length > 0) {
        // Multiple vitals entries: send all with their respective IDs
        vitalsForCase = todayVitals.map((vitalEntry) => {
          let systolic = String(vitalEntry.blood_press || "").split("/")[0]?.trim() || "";
          let diastolic = String(vitalEntry.blood_press || "").split("/")[1]?.trim() || "";
          const vital = {
            date: today,
            temp: String(vitalEntry.temp || "").trim(),
            pres: String(vitalEntry.pres || "").trim(),
            resp_rate: String(vitalEntry.resp_rate || "").trim(),
            systolic,
            diastolic,
            blood_press: vitalEntry.blood_press || "",
            spo2: String(vitalEntry.spo2 || "").trim(),
            height: String(vitalEntry.height || "").trim(),
            weight: String(vitalEntry.weight || "").trim(),
            ofc: String(vitalEntry.ofc || "").trim(),
            sugar: String(vitalEntry.sugar || "").trim(),
            general_rbs: String(vitalEntry.general_rbs || "").trim(),
            fib4: String(vitalEntry.fib4 || "").trim(),
            waist_circumference: String(vitalEntry.waist_circumference || "").trim(),
            bmi: String(vitalEntry.bmi || "").trim(),
            bmr: String(vitalEntry.bmr || "").trim(),
            bsa: String(vitalEntry.bsa || "").trim(),
            tcv_id: Number(vitalEntry.tcv_id ?? 0),
            tcbc_id: Number(vitalEntry.tcbc_id ?? 0),
            dev_unique_id: Number(vitalEntry.dev_unique_id ?? 0),
            pam_id: patient_data?.pam_id ?? pamId ?? 0,
          };
          return enrichVitalsWithCalculations(vital, patientInfo);
        });
      } else if (hasRxPadVitals) {
        // Single vital entry from Rx Pad
        const sanitizeVitalsValue = (key, value) => {
          if (key === 'tcv_id' || key === 'tcbc_id' || key === 'dev_unique_id' || key === 'pam_id' || key === 'date') {
            return value;
          }
          if (value === undefined || value === null) return "";
          const str = String(value).trim();
          if (key === 'bloodPressure' || key === 'blood_press') {
            return str.replace(/[^0-9/.-]/g, '').replace(/\/+/g, '/');
          }
          if (key === 'general_rbs' || key === 'General RBS' || key === 'ofc' || key === 'OFC' || key === 'fib4' || key === 'FIB4') {
            return str;
          }
          return str.replace(/[^0-9.-]/g, '');
        };
        const cleanVitals = Object.fromEntries(
          Object.entries(prescriptionData.vitalsAndBodyComposition || {}).map(([k, v]) => [k, sanitizeVitalsValue(k, v)])
        );

        let systolic = String(cleanVitals.Systolic || cleanVitals.systolic || '').trim();
        let diastolic = String(cleanVitals.Diastolic || cleanVitals.diastolic || '').trim();
        let blood_press = cleanVitals.bloodPressure || cleanVitals.blood_press || '';

        if (blood_press && !systolic && !diastolic) {
          const bpParts = String(blood_press).split('/');
          if (bpParts.length === 2) {
            systolic = bpParts[0].trim();
            diastolic = bpParts[1].trim();
          }
        }
        if (!systolic || !diastolic) {
          blood_press = '';
        } else if (!blood_press) {
          blood_press = `${systolic}/${diastolic}`;
        }

        const rxPadVital = {
          date: today,
          temp: String(cleanVitals.temperature || cleanVitals.temp || '').trim(),
          pres: String(cleanVitals.pulse || cleanVitals.pres || '').trim(),
          resp_rate: String(cleanVitals.respRate || cleanVitals.resp_rate || '').trim(),
          systolic,
          diastolic,
          spo2: String(cleanVitals.spo2 || cleanVitals.SPO2 || '').trim(),
          height: String(cleanVitals.height || cleanVitals.Height || '').trim(),
          weight: String(cleanVitals.weight || cleanVitals.Weight || '').trim(),
          ofc: String(cleanVitals.ofc || cleanVitals.OFC || cleanVitals.Ofc || '').trim(),
          sugar: String(cleanVitals.sugar || cleanVitals.Sugar || '').trim(),
          general_rbs: String(cleanVitals['General RBS'] || cleanVitals.general_rbs || cleanVitals.generalRBS || cleanVitals.genralRBS || '').trim(),
          fib4: String(cleanVitals.FIB4 || cleanVitals.fib4 || cleanVitals.Fib4 || '').trim(),
          waist_circumference: String(cleanVitals['Waist Circumference'] || cleanVitals.waist_circumference || cleanVitals.WaistCircumference || '').trim(),
          bmi: String(cleanVitals.BMI || cleanVitals.bmi || '').trim(),
          bmr: String(cleanVitals.BMR || cleanVitals.bmr || '').trim(),
          bsa: String(cleanVitals.BSA || cleanVitals.bsa || '').trim(),
          tcv_id: Number(cleanVitals.tcv_id ?? 0),
          tcbc_id: Number(cleanVitals.tcbc_id ?? 0),
          dev_unique_id: Number(cleanVitals.dev_unique_id ?? 0),
          pam_id: patient_data?.pam_id ?? pamId ?? 0,
        };
        if (systolic && diastolic) {
          rxPadVital.blood_press = blood_press;
        }
        const enrichedRxPadVital = enrichVitalsWithCalculations(rxPadVital, patientInfo);
        vitalsForCase = [enrichedRxPadVital];
      }
      // Clean blood_press if systolic/diastolic missing
      vitalsForCase = vitalsForCase.map(v => {
        const cleaned = { ...v };
        const systolic = String(cleaned.systolic || '').trim();
        const diastolic = String(cleaned.diastolic || '').trim();
        if (!systolic || !diastolic) {
          cleaned.blood_press = '';
        }
        return cleaned;
      });
    } catch (err) {
      console.error("Error building vitals for case manager payload:", err);
    }

    const patientId = patient_data?.patient_unique_id ?? 0;

    const rawFollowUp = prescriptionData?.followUp;
    let followUpDateValue = "";
    if (rawFollowUp && typeof rawFollowUp === "string" && rawFollowUp.trim()) {
      const followUpText = rawFollowUp.trim();
      const baseDate = moment(consultationDate).isValid()
        ? moment(consultationDate)
        : moment();

      // Persist a concrete YYYY-MM-DD date (consult flow also sends formatted date)
      if (moment(followUpText, moment.ISO_8601, true).isValid()) {
        followUpDateValue = moment(followUpText).format("YYYY-MM-DD");
      } else {
        const relativeDateMatch = followUpText.match(
          /(\d+)\s*(day|days|week|weeks|month|months|year|years)/i
        );
        if (relativeDateMatch) {
          const value = parseInt(relativeDateMatch[1], 10);
          const unit = relativeDateMatch[2].toLowerCase();

          if (unit.includes("year")) {
            followUpDateValue = baseDate
              .add(value, "years")
              .format("YYYY-MM-DD");
          } else if (unit.includes("month")) {
            followUpDateValue = baseDate
              .add(value, "months")
              .format("YYYY-MM-DD");
          } else if (unit.includes("week")) {
            followUpDateValue = baseDate
              .add(value, "weeks")
              .format("YYYY-MM-DD");
          } else {
            followUpDateValue = baseDate
              .add(value, "days")
              .format("YYYY-MM-DD");
          }
        }
      }
    }
    const sendData = {
      action: tcmId === 0 ? "add" : "edit",
      tcm_id: tcmId,
      patient_unique_id: patientId,
      pam_id:
        patient_data !== undefined
          ? patient_data.hasOwnProperty("pam_id")
            ? patient_data.pam_id
            : pamId
          : 0,
      consultation_date: consultationDate,
      consultation_start_datetime: consultationDate ,
      smart_prescription_filename: genRxDetails?._id,
      labReportID: resolvedLabReportID,
      medical_history: medicalHistoryForApi,
      private_notes_id: 0,
      ...(followUpDateValue && { follow_up_date: followUpDateValue }),
      ...(vitalsForCase.length > 0 && { vitals: vitalsForCase }),
    };

    const action =
      tcmId == 0
        ? await dispatch(addCaseManager(sendData))
        : await dispatch(editCaseManager(sendData));

    if (action.meta.requestStatus === "fulfilled") {
      dispatch(clearListVitalsToday());
      const isSnapSmartVoiceAmbient = isVoiceOrAmbientRx || genRxDetails?.type === 'snap' || genRxDetails?.type === 'smart';
      if (isSnapSmartVoiceAmbient && patientId && (userId !== undefined && userId !== null)) {
        const rxGynec = getNormalizedGynecHistory(prescriptionData ?? {});
        syncGynecHistoryAfterEndVisit(patientId, userId, rxGynec, { getGynecDetails, postGynecDetails, updateGynecDetails });
      }
      message.open({
        key: MESSAGE_KEY,
        type: "",
        className: "message-appointment",
        content: (
          <div className="d-flex align-items-center">
            <img src={visitEnd} className="me-3" alt="Visit End Icon" />
            <div>
              <div className="title-common-digitised text-start fontroboto">{`${patient_data?.pm_first_name}'s visit ended successfully.`}</div>
              <div className="fontroboto text-start fw-normal mt-1">
                View completed visits in finished tab.
              </div>
            </div>
            <img
              src={imgCloseVisit}
              className="ms-3"
              alt="Close Visit Icon"
              onClick={() => message.destroy()}
            />
          </div>
        ),
        duration: 5,
      });

      const clinic_name = getClinicName(profile?.hospital_data);
      const deviceSdkData = getDeviceSdkData();
      window.Moengage.track_event("TP_Voice_Submit", {
        doctor_name: profile?.um_name,
        doctor_number: profile?.um_contact,
        doctor_unique_id: profile?.doctor_unique_id,
        doctor_specialty: profile?.dp_name,
        clinic_id: tokenData?.clinic_id,
        um_id: tokenData?.user_id,
        clinic_Name: clinic_name,
        patient_name: patient_data?.pm_first_name,
        patient_unique_id: patient_data?.patient_unique_id,
        ...deviceSdkData,
      });

      if (!isFreeVoiceRxUser && useVoiceRx) {
        let sendData = {
          b2c_id: profile?.b2c,
          service_name: S_VOICE_RX,
        };
        dispatch(updateCredits(sendData));
      }
      if (useDDX) {
        let sendData = {
          b2c_id: profile?.b2c,
          service_name: S_DDX,
        };
        dispatch(updateCredits(sendData));
      }

      if (isAutofillSelected) {
        await setAddToRx({
          _id: symptomCollector?._id,
          addToRx: true,
        });
        dispatch(setSelectAutofill(false));
      }

      if (isGroundingAccessableForZydus && patient_data?.departmentId) {
        let sendInvestigationAndMedicine = {
          patient_unique_id:
            patient_data !== undefined ? patient_data.patient_unique_id : 0,
          tcm_id: action?.payload?.tcm_id,
        };
        const actionIM = await dispatch(
          getInvestigationAndMedicine(sendInvestigationAndMedicine)
        );
        if (actionIM.meta.requestStatus === "fulfilled") {
          const cmInvestigations = actionIM?.payload?.investigation ?? [];
          const investigationList = cmInvestigations.map((item) => ({
            serviceName: String(item?.investigation_name ?? "").trim(),
            serviceCode: String(item?.service_code ?? "").trim(),
          }));

          let zydusSendData = {
            action: tcmId == 0 ? "add" : "edit",
            tcmId: action?.payload?.tcm_id,
            siteId: siteId,
            departmentId: patient_data?.departmentId,
            visitId: patient_data?.visitId,
            encounterId: patient_data?.encounterId,
            mrno: patient_data?.mrno,
            doctorCode: patient_data?.employeeId,
            storeCode: storeCode,
            duplicateCheck: 1,
            investigationList,
            medicineList:
              sanitizedMedications.map(({ name, notes }, index) => {
                const quantityValue =
                  quantityActionMedicine?.medicines?.[index]?.quantity;
                let quantity = 0;

                if (typeof quantityValue === "number" && Number.isFinite(quantityValue)) {
                  quantity = quantityValue;
                } else if (quantityValue !== undefined && quantityValue !== null) {
                  const parsedQuantity = Number(quantityValue);
                  quantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
                }

                return {
                  name,
                  quantity,
                  instruction: notes,
                };
              }) || [],
            pillupSwitch: 0,
          };
          await dispatch(placeIctOrder(zydusSendData));
        }
      }

      // Navigate to print view for both ambient and dictate modes
      navigate("/gen-rx-print", {
        replace: true,
        state: {
          ...action.payload,
          patient_data: patient_data,
          page: "prescription",
          rxId: genRxDetails?._id,
          isAmbientRx: isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX,
        },
      });
    } else {
      errorMessage(action.error);
    }
    } finally {
      setIsEndVisitLoading(false);
    }
  }

  const handleKeyEditClick = (key) => {
    setActiveIndex(key);
    setActiveType("vitalsAndBodyComposition-key");
    setEditableKey(key);
  };

  const handleKeyEditBlur = (key) => {
    if (editableKey && editableKey !== key) {
      setPrescriptionData((prevData) => {
        const updatedData = { ...prevData };
        const value = updatedData.vitalsAndBodyComposition[key];
        delete updatedData.vitalsAndBodyComposition[key];
        updatedData.vitalsAndBodyComposition[editableKey] = value;
        return updatedData;
      });
      setIsRxEdited(true);
    }
    setActiveIndex(null);
    setActiveType(null);
    setEditableKey("");
  };

  useEffect(() => {
    const data = [];
    medicationParentOptionsList?.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.tmm_medicine_name,
        label: (
          <div>
            <span className="fw-medium">{e.tmm_medicine_name}</span>,{" "}
            <span>{e.tmm_generic}</span>{" "}
            {(e?.tmm_hm_type == 1 || e?.tmm_hm_type == 2) && e?.um_id === 0 && (
              <span
                className="align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-circle text-white"
                style={{ width: 18, height: 18, background: "#c44ea2" }}
              >
                {getHmTypeIndicator(e)}
              </span>
            )}
          </div>
        ),
      });
    });

    if (searchParentQuery.length == 0) {
      data.unshift({
        key: -1,
        label: (
          <>
            <div>SUGGESTED</div>
          </>
        ),
      });
    } else {
      searchParentQuery &&
        data.push({
          key: JSON.stringify({
            unique_id: uuidv4(),
            tmm_id: 0,
            tmm_medicine_name: searchParentQuery,
          }),
          value: searchParentQuery,
          label: (
            <>
              <div className="text-primary fontroboto fs-16">
                {" "}
                <i className="icon-Add mx-1 fs-6"></i> Add{" "}
                <span className="fw-medium fontroboto text-primary">
                  "{searchParentQuery}"
                </span>{" "}
                <a className="text-primary fontroboto">as a new medicine</a>
              </div>
            </>
          ),
        });
    }
    setParentSearchOptions(data);
  }, [medicationParentOptionsList]);

    useEffect(() => {
      const data = [];
      investigationParentOptionsList.map((e) => {
        return data.push({
          key: JSON.stringify({ ...e, unique_id: uuidv4() }),
          value: e.investigation_name,
          label: (
            <div>
              {e.investigation_name}{" "}
              {(e?.hm_type === 1 || e?.hm_type === 2) && e?.um_id === 0 && (
                <span
                  className="align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-circle text-white"
                  style={{ width: 18, height: 18, background: "#c44ea2" }}
                >
                  {getHmTypeIndicator(e)}
                </span>
              )}
            </div>
          ),
        });
      });
      if (searchParentQuery.length === 0) {
        data.unshift({
          key: -1,
          label: (
            <>
              <div>FREQUENTLY USED</div>
            </>
          ),
        });
      } else {
        searchParentQuery &&
          investigationParentOptionsList.findIndex(
            (e) =>
              e.investigation_name?.toLowerCase()?.trim() ==
              searchParentQuery?.toLowerCase()?.trim()
          ) === -1 &&
          tokenData?.hospital_business_id != env.zydus_business_id &&
          !isZydusUserAccessableFromGB &&
          !isApolloHosBusinessIdAccessableFromGB &&
          data.push({
            key: JSON.stringify({
              unique_id: uuidv4(),
              change: 1,
              investigation_name: searchParentQuery,
            }),
            value: searchParentQuery,
            label: (
              <>
                <div>
                  {searchParentQuery}
                  <i className="icon-Add mx-1 text-primary fs-6"></i>{" "}
                  <a className="fw-medium text-decoration-underline text-primary">
                    {" "}
                    Add Custom
                  </a>
                </div>
              </>
            ),
          });
      }
      setParentSearchOptions(data);
    }, [investigationParentOptionsList]);

  
  const handleAmbientItemClick = (type, index, item) => {
    if (activeIndex !== null && activeType !== null) {
      handleInputBlur(activeType, activeIndex);
    }

   
    const formatItemDisplay = (item) => {
      if (typeof item === 'string') {
        return item;
      }
      
      let displayText = item.name || item.testname || item;
      if (item.duration) displayText += ` (duration: ${item.duration})`;
      if (item.severity) displayText += ` (severity: ${item.severity})`;
      if (item.notes) displayText += ` (note: ${item.notes})`;
      if (item.type) displayText += ` (type: ${item.type})`;
      if (item.relation) displayText += ` (relation: ${item.relation})`;
      if (item.dosage) displayText += ` (dosage: ${item.dosage})`;
      if (item.frequency) displayText += ` (frequency: ${item.frequency})`;
      if (item.schedule) displayText += ` (schedule: ${item.schedule})`;
      
      return displayText;
    };

    if (type === "vitalsAndBodyComposition") {
      setEditableText(prescriptionData.vitalsAndBodyComposition[index]);
    } else if (type === "followUp") {
      setEditableText(prescriptionData?.followUp);
    } else {
     
      setEditableText(formatItemDisplay(item));
    }

    setActiveIndex(index);
    setActiveType(type);
  };

  const handleAmbientInputBlur = (type, index) => {
    if (activeIndex !== null && activeType !== null) {
      setPrescriptionData((prevData) => {
        const updatedData = { ...prevData };
        const trimmedText = editableText?.trim() || "";

        if (!trimmedText) {
          
          if (type === "vitalsAndBodyComposition") {
            updatedData.vitalsAndBodyComposition[index] = "";
          } else if (type === "followUp") {
            updatedData.followUp = "";
          } else {
            updatedData[type] = updatedData?.[type]?.filter((_, i) => i !== index);
          }
          return updatedData;
        }

        if (type === "vitalsAndBodyComposition") {
          updatedData.vitalsAndBodyComposition[index] = trimmedText;
        } else if (type === "followUp") {
          updatedData.followUp = trimmedText;
        } else {
         
          const parseFormattedText = (text) => {
           
            const mainNameMatch = text.match(/^([^(]+?)(?:\s*\(|$)/);
            const mainName = mainNameMatch ? mainNameMatch[1].trim() : text;

          
            const params = {};
            const paramRegex = /\(([^:]+):\s*([^)]+)\)/g;
            let match;
            
            while ((match = paramRegex.exec(text)) !== null) {
              const paramName = match[1].trim().toLowerCase();
              const paramValue = match[2].trim();
              
            
              if (paramName === 'note' || paramName === 'notes') {
                params.notes = paramValue;
              } else if (paramName === 'type') {
                params.type = paramValue;
              } else if (paramName === 'duration') {
                params.duration = paramValue;
              } else if (paramName === 'severity') {
                params.severity = paramValue;
              } else if (paramName === 'relation') {
                params.relation = paramValue;
              } else if (paramName === 'dosage') {
                params.dosage = paramValue;
              } else if (paramName === 'frequency') {
                params.frequency = paramValue;
              } else if (paramName === 'schedule') {
                params.schedule = paramValue;
              }
            }

            return {
              name: mainName,
              ...params
            };
          };

          const parsedData = parseFormattedText(trimmedText);
        
          if (updatedData[type] && updatedData[type][index]) {
            updatedData[type][index] = {
              ...updatedData[type][index],
              ...parsedData
            };
          }
        }

        setIsRxEdited(true);
        return updatedData;
      });

      setActiveIndex(null);
      setActiveType(null);
      setEditableText("");
    }
  };

 
  const handleAmbientKeyDown = (e, type, index) => {
    if (e.key === "Enter") {
      e.preventDefault(); 

      const trimmedText = editableText.trim();
      if (trimmedText) {
        setPrescriptionData((prevData) => {
          const updatedData = { ...prevData };
          const parseFormattedText = (text) => {
            const mainNameMatch = text.match(/^([^(]+?)(?:\s*\(|$)/);
            const mainName = mainNameMatch ? mainNameMatch[1].trim() : text;

           
            const params = {};
            const paramRegex = /\(([^:]+):\s*([^)]+)\)/g;
            let match;
            
            while ((match = paramRegex.exec(text)) !== null) {
              const paramName = match[1].trim().toLowerCase();
              const paramValue = match[2].trim();
              
             
              if (paramName === 'note' || paramName === 'notes') {
                params.notes = paramValue;
              } else if (paramName === 'type') {
                params.type = paramValue;
              } else if (paramName === 'duration') {
                params.duration = paramValue;
              } else if (paramName === 'severity') {
                params.severity = paramValue;
              } else if (paramName === 'relation') {
                params.relation = paramValue;
              } else if (paramName === 'dosage') {
                params.dosage = paramValue;
              } else if (paramName === 'frequency') {
                params.frequency = paramValue;
              } else if (paramName === 'schedule') {
                params.schedule = paramValue;
              }
            }

            return {
              name: mainName,
              ...params
            };
          };

          const parsedData = parseFormattedText(trimmedText);
          
       
          if (type === "vitalsAndBodyComposition") {
            updatedData.vitalsAndBodyComposition[index] = trimmedText;
          } else if (type === "followUp") {
            updatedData.followUp = trimmedText;
          } else {
            
            if (updatedData[type] && updatedData[type][index]) {
              updatedData[type][index] = {
                ...updatedData[type][index],
                ...parsedData
              };
            }

            if (!updatedData[type]) {
              updatedData[type] = [];
            }
            
            const newItem = {
              name: "",
              duration: "",
              severity: "",
              notes: "",
              type: "",
              relation: "",
              dosage: "",
              frequency: "",
              schedule: ""
            };
            
            updatedData[type].splice(index + 1, 0, newItem);
          }

          setIsRxEdited(true);
          return updatedData;
        });

       
        setActiveIndex(index + 1);
        setActiveType(type);
        setEditableText("");
      }
    }
  };

  const checkDataFillOrNot = () => {
    // Track cross button click while recording (back button)
    if (isRecording || isPaused) {
      crossButtonClickCountRef.current += 1;
    }
    if (prescriptionData) {
      showHideBackModal();
    } else {
      // If no prescription data, navigate directly based on mode
      if (isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX) {
        // Return to the correct VoiceRx entry point for this feature flag state.
        navigateVoiceRx({ patient_data }, { replace: true }, "consultation_drawer_ambient_back");
        onClose();
    } else {
      onClose();
      }
    }
  };

  const handleBack = () => {
    if (!(isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX)) {
      onClose();
    }
    navigateVoiceRx({ patient_data }, { replace: true }, "consultation_drawer_back");
  };

  const convertMedicalHistoryToContextFormat = useCallback((apiMedicalHistory, existingContextData) => {
    const medicalHistoryDataArray = prescriptionMedicalHistoryToContextFormat(apiMedicalHistory);
    if (!medicalHistoryDataArray || medicalHistoryDataArray.length === 0) return existingContextData || [];
    const groupedByType = medicalHistoryDataArray.reduce((acc, s) => ({ ...acc, [s.tmmhs_id]: s }), {});
    if (existingContextData && existingContextData.length > 0) {
      const merged = existingContextData.map(existingSection => {
        const apiSection = groupedByType[existingSection.tmmhs_id];
        if (apiSection) {
          const existingTagNames = new Set((existingSection.tags || []).map(t => t.title?.toLowerCase()));
          const newTags = (apiSection.tags || []).filter(tag => !existingTagNames.has(tag.title?.toLowerCase()));
          return { ...existingSection, tags: [...(existingSection.tags || []), ...newTags] };
        }
        return existingSection;
      });
      medicalHistoryDataArray.forEach(apiSection => {
        if (!merged.some(s => s.tmmhs_id === apiSection.tmmhs_id)) merged.push(apiSection);
      });
      return merged;
    }
    return medicalHistoryDataArray;
  }, []);

  return (
    <Drawer
      placement="right"
      onClose={onClose}
      open={visible}
      destroyOnClose
      className={`${styles.consultationDrawer} bg-body`}
      closeIcon={false}
      width={showPrescription ? "100%" : (isMobile ? "100%" : "750px")}
      mask={!genRxKnowMoreDrawer}
    >
      <Suspense
        fallback={
          <Spin className="d-flex justify-content-center align-items-center mt-5" />
        }
      >
        <>
          <div className="modalCard-header h-60 align-items-center justify-content-between d-flex position-sticky top-0 z-2">
            <div className="align-items-center d-flex h-100">
              <div className="border-end h-100 text-center me-3">
                <div
                  onClick={checkDataFillOrNot}
                  className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
                >
                  <i className="icon-right"></i>
                </div>
              </div>
                <ProfilePopover patient_data={patient_data} isPrescriptionPage />
                {(mode || isAmbientMode !== undefined) && (
                  <div className={styles.modeIndicator}>
                    {isAmbientMode ? (
                      <>
                        <img src={ambientActiveIcon} alt="Conversation mode" className={styles.modeIcon} />
                        <span className={styles.modeText}>Coversation Mode</span>
                      </>
                    ) : (
                      <>
                        <img src={dictateActiveIcon} alt="Dictate mode" className={styles.modeIcon} />
                        <span className={styles.modeText}>Dictate Mode</span>
                      </>
                    )}
                  </div>
                )}
            </div>
            <div className="d-flex align-items-center gap-2">
              {isGroundingAccessableForZydus && (
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 14px",
                    borderRadius: 16,
                    background: "#F7F1FF",
                    border: "1px solid #E6D8FF",
                    color: "#A461D8",
                    height: "41px",
                  }}
                >
                  {!isMobile &&
                  <> <img
                    src={zydusDataEngineIcon}
                    alt="zydus-data-engine"
                    width={28}
                    height={28}
                    style={{ marginRight: 8 }}
                  />
                  <div className="d-flex flex-column">
                    <span
                      className="grouding-color fs-10"
                      style={{ lineHeight: "12px" }}
                    >
                      Powered by
                    </span>
                    <span
                      className="grouding-color fs-16 semi-bold-text"
                      style={{ lineHeight: "20px" }}
                    >
                      Zydus Data Engine
                    </span>
                  </div></>}
                  <Tooltip
                    placement="bottomRight"
                    overlayClassName="groundingTooltip"
                    title={
                      <div style={{ padding: "12px" }}>
                        <div>
                          <span
                            className="semi-bold-text fs-21"
                            style={{ lineHeight: "18px" }}
                          >
                            Zydus Data Engine
                          </span>
                          <LoopingVideo
                            className="img-fluid"
                            width={39}
                            height={16}
                            style={{ marginLeft: 10, marginBottom: 5 }}
                            webm={tagNewWebm}
                            mp4={tagNewMp4}
                            ariaLabel="New"
                          />
                        </div>
                        <Divider style={{ margin: "15px 0px" }} />
                        <div>
                          <span>What is Zydus Data Engine?</span>
                          <span>
                            {" "}With a curated list of{" "}
                            <span className="semi-bold-text">medicines</span>{" "}
                            and{" "}
                            <span className="semi-bold-text">lab tests</span>
                            from the{" "}
                            <span className="semi-bold-text">
                              Zydus Data Engine
                            </span>
                            , our AI adapts to your prescribing style, surfacing
                            the most
                            <span className="semi-bold-text">
                              relevant suggestions
                            </span>{" "}
                            while you prescribe, and helps to
                          </span>
                          <div className="d-flex align-items-center gap-3 mt-3">
                            <div
                              className="d-flex align-items-center gap-1 p-2 rounded-20px fs-12"
                              style={{ background: "rgba(220, 186, 246, 0.4)" }}
                            >
                              <img src={healthIcon} alt="health-icon" />
                              Boosting Patient Fulfilment
                              <img src={growIcon} alt="grow-icon" />
                            </div>
                            <div
                              className="d-flex align-items-center gap-1 p-2 rounded-20px fs-12"
                              style={{ background: "rgba(220, 186, 246, 0.4)" }}
                            >
                              <img src={accuracyIcon} alt="accuracy-icon" />
                              Improve Rx Accuracy by{" "}
                              <span className="semi-bold-text">80%</span>
                            </div>
                          </div>

                          {/* <div
                            style={{
                              width: "503px",
                              height: "239px",
                              marginTop: "12px",
                            }}
                          >
                            <div
                              className="d-flex align-items-center justify-content-center"
                              style={{
                                background: `url(${videoLink.thumbnail})`,
                                width: "503px",
                                height: "239px",
                                borderRadius: 24,
                                cursor: "pointer",
                                backgroundSize: "cover",
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "center",
                              }}
                              onClick={() => setShowVideo(true)}
                            >
                              <img
                                width={55}
                                height={55}
                                src={playIcons}
                                alt="play-icon"
                              />
                            </div>
                          </div> */}
                        </div>
                      </div>
                    }
                  >
                    {isMobile ? <img
                    src={zydusDataEngineIcon}
                    alt="zydus-data-engine"
                    width={28}
                    height={28}
                    style={{ marginRight: 8 }}
                  /> : <i className="icon-info fs-21" />}
                  </Tooltip>
                </button>
              )}
              <button
                className="btn d-flex align-items-center btn-text me-10 tutorial"
                onClick={() => setGenRxKnowMoreDrawer(true)}
              >
                <span className="text-decoration-none rounded-5 pe-3 bg-white shadow2">
                  <img height={42} src={tutorialIcon} alt="Tutorial" />
                  Tutorial
                </span>
              </button>

              {!isFreeVoiceRxUser && (
                <FreeTrialButton
                  title={S_VOICE_RX}
                  showHideSubModal={showHideSubModal}
                />
              )}

              {showPrescription && (
                <Button
                  type="button"
                  className="btn align-items-center d-flex btn-41 btn-primary3 me-20"
                  onClick={onEndVisitClick}
                  disabled={!prescriptionData || isEndVisitLoading}
                  loading={isEndVisitLoading}
                >
                  <i className="icon-exit me-2"></i>
                  End Visit
                </Button>
              )}
            </div>
          </div>
          {showSCBanner && !showPrescription && (
            <div style={{ margin: "20px 30px" }}>
              <SCBanner handleBanner={() => setShowSCBanner(false)} />
            </div>
          )}
          <div className={styles.container}>
            {showPrescription ? (
                  <div
                    className={`${styles.splitView} w-100`}
                    ref={splitRef}
                     style={{
                       "--divider-left": `${leftWidthPercent}%`,
                     }}
                  >
                  <div
                    className={styles.inputSection}
                    style={{ width: `${leftWidthPercent}%` }}
                  >
                      <div className={styles.chatSection}>
                        {/* Introductory Text */}
                        <div className={styles.introTextContainer}>
                          <img src={doctorAvatar} alt="Doctor Assistant" className={styles.doctorAvatarIcon} />
                          <div className={styles.introText}>
                            Hi Doctor! Start your consultation by <strong>dictating the Rx</strong> or by <strong>capturing your conversation with the patient.</strong>
                            I'll <strong>transcribe</strong> & <strong>structure</strong> it into the <strong>Rx Pad</strong> automatically!
                          </div>
                        </div>
                        
                                                {/* Transcript Cards */}
                        {/* First transcript card - show initial transcript */}
                        {!isFirstTranscriptJSON && ((Array.isArray(queries) && queries.length > 0) || fullTranscript || genRxDetails?.source || (isAmbientMode && conversations?.length > 0)) && (() => {
                          const firstQuery = Array.isArray(queries) && queries.length > 0 ? queries[0] : null;
                          const isFirstAudio = firstQuery && typeof firstQuery === 'object' && firstQuery.isAudio;
                          // Check if it's text-only: not audio, no bubbles (TEXT_WITH_CONTEXT has empty conversations)
                          const isTextOnly = !isFirstAudio && (
                            typeof firstQuery === 'string' ||
                            (firstQuery && typeof firstQuery === 'object' && !firstQuery.isAudio && (
                              !firstQuery.conversations ||
                              (firstQuery.conversations && firstQuery.conversations.length === 0 && firstQuery.text) ||
                              (firstQuery.conversations && firstQuery.conversations.length === 1 &&
                               firstQuery.text &&
                               (firstQuery.conversations[0]?.speaker?.toLowerCase() === 'doctor' || firstQuery.conversations[0]?.speaker?.toLowerCase() === 'dr') &&
                               (firstQuery.conversations[0]?.text === firstQuery.text ||
                                firstQuery.conversations[0]?.message === firstQuery.text ||
                                firstQuery.conversations[0]?.content === firstQuery.text))
                            )) ||
                            (!firstQuery && (fullTranscript || genRxDetails?.source))
                          );
                          const firstText = isTextOnly 
                            ? (typeof firstQuery === 'string' ? firstQuery : (firstQuery?.text || fullTranscript || genRxDetails?.source || ''))
                            : null;
                          
                          // For text-only input, render simple curved box without header
                          if (isTextOnly && firstText && firstText.trim()) {
                            return (
                              <div className={styles.textOnlyBox}>
                                <div className={styles.textOnlyBoxContent}>
                                  {firstText}
                                </div>
                              </div>
                            );
                          }
                          
                          // For audio input, render the full transcript card with header
                          return (
                            <div className={styles.transcriptCard}>
                              <div 
                                className={styles.transcriptHeader}
                                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                              >
                                <div className={styles.transcriptTitle}>
                                  <div className={styles.transcriptTitleContent}>
                                    <span>{isAmbientMode ? "Ambient Rx Transcript" : "Dictate Rx Transcript"}</span>
                                    <div className={styles.transcriptRightGroup}>
                                      {(() => {
                                        // Show timer only for audio inputs
                                        const firstDuration = firstQuery && typeof firstQuery === 'object' ? firstQuery.duration : null;
                                        
                                        // For both ambient and dictate mode, use duration from firstQuery
                                        if (isFirstAudio && firstDuration) {
                                          return (
                                    <div className={styles.transcriptDuration}>
                                      <img src={templateTimeIcon} alt="time" className={styles.transcriptDurationIcon} />
                                              <span>{formatTime(Math.floor(firstDuration))}</span>
                                            </div>
                                          );
                                        }
                                        
                                        return null;
                                      })()}
                                      <img src={arrowBoxDown} alt="Expand" className={styles.arrowIcon} />
                                    </div>
                                  </div>
                                </div>
                                <div className={`${styles.transcriptToggle} ${isTranscriptExpanded ? styles.transcriptToggleOpen : ''}`}>
                                  <i className="icon-down"></i>
                                </div>
                              </div>
                              {isTranscriptExpanded && (
                                <div className={styles.transcriptContent}>
                                    {isAmbientMode ? (
                                    <div>
                                      {/* Use conversations from queries[0] instead of global conversations state */}
                                      {(() => {
                                        const firstConversations = firstQuery && typeof firstQuery === 'object' && firstQuery.conversations 
                                          ? firstQuery.conversations 
                                          : (Array.isArray(conversations) && conversations.length > 0 ? conversations : []);
                                        
                                        return firstConversations.length > 0 ? (
                                          firstConversations.map((conv, idx) => {
                                          const text = conv?.message || conv?.text || conv?.content || '';
                                          const speaker = (conv?.speaker || '').toLowerCase();
                                          const isDoctor = speaker === 'doctor';
                                          return (
                                            <div key={idx} className={`${styles.conversationBubbleWrapper} ${isDoctor ? styles.doctorMessage : styles.patientMessage}`}>
                                          <div className={styles.conversationBubble}>
                                                <span className={styles.speakerLabel}>{isDoctor ? 'Doctor' : 'Patient'}:</span>
                                                <div className={styles.messageText}>{text}</div>
                                            </div>
                                            </div>
                                          );
                                        })
                                        ) : null;
                                      })()}
                                          </div>
                                  ) : (
                                    <div className={styles.transcriptText}>
                                      {(Array.isArray(queries) && queries.length > 0)
                                         ? (typeof queries[0] === 'string' ? queries[0] : queries[0]?.text || '')
                                         : (fullTranscript || genRxDetails?.source || '')}                                                                         
                                  </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                                                {/* Show "Your Rx is ready!" message after first transcript */}
                        {!isFirstTranscriptJSON && !isProcessing && ((Array.isArray(queries) && queries.length > 0) || !!fullTranscript || !!genRxDetails?.source || (isAmbientMode && conversations?.length > 0)) && (
                            <div className="d-flex align-items-start gap-2 mt-3" style={{ padding: "0 20px" }}>
                              <img src={doctorAvatar} alt="doctor" width={36} height={36} style={{ borderRadius: 18 }} />
                              <div className={styles.prescriptionReadyMessage}>
                                Your <strong>Rx is ready</strong>! You can review it in the <strong>Rx Pad</strong>. You can also make changes using <strong>VoiceRx</strong> or by simply <strong>typing below</strong>!
                              </div>
                            </div>
                          )}

                        {/* Additional transcript cards for new transcripts (both dictate and ambient mode) */}                                                                 
                        {Array.isArray(queries) && queries.length > 1 && queries.slice(1).map((query, idx) => {                               
                          const cardIndex = idx + 1;
                          const queryTextForCheck = typeof query === 'string' ? query : (query?.text || query?.message || query?.content || '');
                          if (isSymptomCollectorJSON(queryTextForCheck)) {
                            return <React.Fragment key={cardIndex} />;
                          }
                          const isCardExpanded = expandedTranscripts.has(cardIndex);
                          const isAudio = query && typeof query === 'object' && query.isAudio;
                          // Check if it's text-only: not audio, and either a string or object without bubbles
                          // TEXT_WITH_CONTEXT: empty conversations, show transcript only (no bubbles)
                          // Ambient text input: single doctor conversation matching text
                          const isTextOnly = !isAudio && (
                            typeof query === 'string' ||
                            (query && typeof query === 'object' && !query.isAudio && (
                              !query.conversations ||
                              (query.conversations && query.conversations.length === 0 && query.text) ||
                              (query.conversations && query.conversations.length === 1 &&
                               query.text &&
                               (query.conversations[0]?.speaker?.toLowerCase() === 'doctor' || query.conversations[0]?.speaker?.toLowerCase() === 'dr') &&
                               (query.conversations[0]?.text === query.text ||
                                query.conversations[0]?.message === query.text ||
                                query.conversations[0]?.content === query.text))
                            ))
                          );
                          const queryText = isTextOnly 
                            ? (typeof query === 'string' ? query : (query?.text || ''))
                            : null;
                          
                          // For text-only input, render simple curved box without header
                          if (isTextOnly && queryText) {
                            return (
                              <React.Fragment key={cardIndex}>
                                <div className={styles.textOnlyBox} style={{ marginTop: '16px' }}>
                                  <div className={styles.textOnlyBoxContent}>
                                    {queryText}
                                  </div>
                                </div>
                                {/* Show "Your Rx is ready!" message after each additional transcript - only when not processing */}
                                {!isProcessing && (
                                  <div className="d-flex align-items-start gap-2 mt-3" style={{ padding: "0 20px" }}>
                                    <img src={doctorAvatar} alt="doctor" width={36} height={36} style={{ borderRadius: 18 }} />
                                    <div className={styles.prescriptionReadyMessage}>
                                      Your <strong>Rx is ready</strong>! You can review it in the <strong>Rx Pad</strong>. You can also make changes using <strong>VoiceRx</strong> or by simply <strong>typing below</strong>!
                                    </div>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          }
                          
                          // For audio input, render the full transcript card with header
                          return (
                            <React.Fragment key={cardIndex}>
                              <div className={styles.transcriptCard} style={{ marginTop: '16px' }}>                                                             
                                <div 
                                  className={styles.transcriptHeader}
                                  onClick={() => {
                                    const newExpanded = new Set(expandedTranscripts);                                                                           
                                    if (isCardExpanded) {
                                      newExpanded.delete(cardIndex);
                                    } else {
                                      newExpanded.add(cardIndex);
                                    }
                                    setExpandedTranscripts(newExpanded);
                                  }}
                                >
                                  <div className={styles.transcriptTitle}>
                                    <div className={styles.transcriptTitleContent}>                                                                             
                                      <span>{isAmbientMode ? "Ambient Rx Transcript" : "Dictate Rx Transcript"}</span>
                                      <div className={styles.transcriptRightGroup}>                                                                             
                                        {(() => {
                                          // Show timer only for audio inputs
                                          const queryDuration = query && typeof query === 'object' ? query.duration : null;                         
                                          
                                          if (isAudio && queryDuration) {
                                            return (
                                              <div className={styles.transcriptDuration}>                                                                       
                                                <img src={templateTimeIcon} alt="time" className={styles.transcriptDurationIcon} />
                                                <span>{formatTime(Math.floor(queryDuration))}</span>                                                            
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                        <img src={arrowBoxDown} alt="Expand" className={styles.arrowIcon} />                                                    
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`${styles.transcriptToggle} ${isCardExpanded ? styles.transcriptToggleOpen : ''}`}>                           
                                    <i className="icon-down"></i>
                                  </div>
                                </div>
                                {isCardExpanded && (
                                  <div className={styles.transcriptContent}>
                                    {isAmbientMode && query?.conversations ? (
                                      // Render conversations for ambient mode
                                      <div>
                                        {Array.isArray(query.conversations) && query.conversations.length > 0 ? (
                                          query.conversations.map((conv, convIdx) => {
                                            const text = conv?.message || conv?.text || conv?.content || '';
                                            const speaker = (conv?.speaker || '').toLowerCase();
                                            const isDoctor = speaker === 'doctor';
                                            return (
                                              <div key={convIdx} className={`${styles.conversationBubbleWrapper} ${isDoctor ? styles.doctorMessage : styles.patientMessage}`}>
                                                <div className={styles.conversationBubble}>
                                                  <span className={styles.speakerLabel}>{isDoctor ? 'Doctor' : 'Patient'}:</span>
                                                  <div className={styles.messageText}>{text}</div>
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : null}
                                      </div>
                                    ) : (
                                      // Render text for dictate mode
                                      <div className={styles.transcriptText}>
                                        {typeof query === 'string' ? query : (query?.text || '')}                                                                 
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Show "Your Rx is ready!" message after each additional transcript - only when not processing */}
                              {!isProcessing && (
                            <div className="d-flex align-items-start gap-2 mt-3" style={{ padding: "0 20px" }}>
                              <img src={doctorAvatar} alt="doctor" width={36} height={36} style={{ borderRadius: 18 }} />
                              <div className={styles.prescriptionReadyMessage}>
                                Your <strong>Rx is ready</strong>! You can review it in the <strong>Rx Pad</strong>. You can also make changes using <strong>VoiceRx</strong> or by simply <strong>typing below</strong>!
                                      </div>
                                    </div>
                                  )}
                            </React.Fragment>
                          );
                        })}

                                            {isProcessing ? (
                        <BubbleSkeleton />
                      ) : (
                        <>
                          <div className={styles.inputContainer}>
                            <div className={styles.inputQueries}>
                              {null}
                            </div>
                          </div>
                          {isRecording ? (
                            <div className={styles.bottomCenterBar}>
                              <div className={`${styles.recBar} ${isPaused ? styles.recBarMuted : ""}`}>
                                {/* Delete Button */}
                                <button className={styles.deleteButton} onClick={handleStopRecording}>
                                  <img src={stopIcon} alt="stop" className={styles.stopIcon} />
                                </button>
                                
                                {/* Pause/Resume Button */}
                                <button 
                                  className={styles.pauseButton} 
                                  onClick={handlePauseResume}
                                  data-muted={isPaused}
                                >
                                  {isPaused ? (
                                    <img src={mutedMicrophoneIcon} alt="muted" className={styles.muteIcon} />
                                  ) : (
                                    <img src={muteIcon} alt="unmuted" className={styles.muteIcon} />
                                  )}
                                </button>
                                
                                {/* Duration */}
                                <div className={styles.timeLabel}>{formatTime(recordingTime)}</div>
                                
                                {/* Wave Visualizer */}
                                <div className={styles.waveArea}>
                                  <VoiceWaveVisualizer isRecording={isRecording} isPaused={isPaused} />
                                </div>
                                
                                {/* Submit Button */}
                                <button className={styles.sendCta} onClick={handleSend}>
                                  <img src={vitalsIcons} alt="Submit" className={styles.vitalsIcon} />
                                </button>
                              </div>
                              
                              {/* Listening Indicator with Gradient Ellipse */}
                              <div className={styles.listeningSection}>
                                <img src={ellipse895} alt="Gradient" className={styles.gradientEllipse} />
                                <div className={styles.listeningText}>
                                  {isPaused ? "Unmute to Continue Recording" : "I'm Listening..."}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.curvedInputContainer}>
                              <div className={`${styles.curvedInputWrapper} ${hasTypedInput ? styles.hasTextInput : ''}`}>
                                <TextArea
                                  ref={textAreaRef}
                                  value={inputText}
                                  onChange={(e) => setInputText(e.target.value)}
                                  onKeyDown={handleKeyPress}
                                  onClick={() => setIsTyping(true)}
                                  onBlur={() => setIsTyping(false)}
                                  placeholder={"Start Typing Rx..."}
                                  className={`${styles.curvedTextInput} ${hasTypedInput ? styles.hasText : ''}`}
                                  autoSize={{ minRows: 1, maxRows: 6 }}
                                />
                                <img
                                  src={hasTypedInput ? voiceRxSendButton : voiceRxButton}
                                  alt={hasTypedInput ? "Send Rx" : "Voice Rx"}
                                  onClick={hasTypedInput ? handleSend : handleStartRecording}
                                  className={hasTypedInput ? styles.curvedSendButton : styles.curvedVoiceButton}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className={styles.prescriptionSection}
                    style={{ width: `${100 - leftWidthPercent}%` }}
                  >
                    <DigitisedPrescription
                      data={prescriptionData || {}}
                      setData={setPrescriptionData}
                      loading={isProcessing}
                      showAbsHeaderInsideLoader={false}
                      showRxPadHeader
                      showInstructionMessage={showInstructionMessage}
                      onCloseInstructionMessage={() => setShowInstructionMessage(false)}
                      showDisclaimer
                      localModules={localModules}
                      setLocalModules={setLocalModules}
                      onRxEdited={() => setIsRxEdited(true)}
                      isProcessing={isProcessing}
                      patient_data={patient_data}
                      skipAutoLabResultsLogic={!(isAmbientMode || mode === 'ambient' || mode === 'dictation' || fromVoiceRecording || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient')}
                    />
                  </div>
                  <div
                    className={styles.dividerHandle}
                    onMouseDown={startResizing}
                  >
                    <div className={styles.dividerKnob}>
                      <div className={styles.dividerDots} />
                    </div>
                  </div>
                </div>
            ) : null}
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
                          onClick={() => {
                            // Check if we're in ambient mode
                            if (isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX) {
                              // Return to the correct VoiceRx entry point for this feature flag state.
                              navigateVoiceRx({ patient_data }, { replace: true }, "consultation_drawer_leave_ambient");
                            } else {
                              // For non-ambient mode, use the regular back handler
                              handleBack();
                            }
                            showHideBackModal();
                          }}
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
          </div>
        </>
      </Suspense>

      {!isFreeVoiceRxUser && visible && (
        <ExpiredSubModal
          title={S_VOICE_RX}
          styles={{
            mask: {
              marginLeft: showPrescription ? 0 : window.innerWidth - 750,
              marginTop: 60,
              background: "rgba(0, 0, 0, 0.28)",
              backdropFilter: "blur(2px)",
            },
            wrapper: {
              marginLeft: showPrescription ? 0 : window.innerWidth - 750,
              marginTop: 60,
              background: "rgba(0, 0, 0, 0.28)",
            },
          }}
          isSubModalOpen={isSubModalOpen}
          showHideSubModal={showHideSubModal}
        />
      )}

      {shouldShowVideo && (
        <VideoModal
          videoLink={videoLink}
          onCancel={() => setShowVideo(false)}
        />
      )}

      {/* {showAddMedicinePopup && (
        <CustomMedicinePopup
          isOpen={showAddMedicinePopup}
          onCancel={() => setShowAddMedicinePopup(false)}
          initialData={{ tmm_medicine_name: searchParentQuery }}
        />
      )} */}
      
      {/* Tutorial Drawer */}
      <Drawer
        placement="right"
        width={window.innerWidth ? Math.min(window.innerWidth * 0.8, 1200) : 1200}
        closeIcon={null}
        destroyOnClose
        maskClosable
        open={genRxKnowMoreDrawer}
        onClose={() => setGenRxKnowMoreDrawer(false)}
        bodyStyle={{ padding: 0, height: '100%', overflow: 'hidden' }}
      >
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <GenRxKnowMore handleGenRxKnowMore={() => setGenRxKnowMoreDrawer(false)} />
        </div>
      </Drawer>
    </Drawer>
  );
};

export default ConsultationDrawer;

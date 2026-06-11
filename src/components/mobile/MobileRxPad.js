import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { Drawer, message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getDecodedToken } from '../../utils/localStorage';
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import { S_AMBIENT_VOICE_RX, S_VOICE_RX, S_DDX, MESSAGE_KEY, FREE, FAILED_VERIFICATION, GB_VOICE_RX_FREE } from '../../utils/constants';
import {
  generateAmbientRx,
  updateAmbientRx,
  generateRx,
  updateGenRx,
  getGenRx,
  getAmbientRx,
  editGenRxDetails,
  editAmbientRxDetails,
} from '../../api/services/ApiGenRxMobile';
import ApiMedication from '../../api/services/ApiMedication';
import { addPatientLabReports } from '../../api/services/ApiLabParams';
import { addCaseManager, editCaseManager, viewCaseManager } from '../../redux/caseManagerSlice';
import { addUpdateVitals, getVitals, setListVitalsToday, setVitalsIdsFromAddVitals, clearListVitalsToday } from '../../redux/vitalsSlice';
import { getPatientLastHistory } from '../../redux/medicalhistorySlice';
import { checkCredits, updateCredits } from '../../redux/monetizationSlice';
import { services } from '../../redux/doctorsSlice';
import { ADD } from '../../utils/constants';
import ApiVitals from '../../api/services/ApiVitals';
import { enrichVitalsWithCalculations } from '../../utils/vitalsCalculations';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import {
  errorMessage,
  getClinic,
  getClinicName,
  getDeviceSdkData,
  getTokenData,
  getVoiceRxMoengageBasePayload,
  isVoiceRxFree,
  trackEvent,
} from '../../utils/utils';
import CashManagerContext from '../../context/CashManagerContext';
import MobileRxPadProcessing from './MobileRxPadProcessing';
import MobileRxPadSkeleton from './MobileRxPadSkeleton';
import MobileRxPadContent from './MobileRxPadContent';
import MobileEndVisitScreen from './MobileEndVisitScreen';
import RxPadInfoBottomSheet from './RxPadInfoBottomSheet';
import ExpiredSubModal from '../../pages/monetization/components/ExpiredSubModal';
import FreeTrialButton from '../../pages/monetization/components/FreeTrialButton';

import './MobileRxPad.scss';
import { ASSETS } from "../../assets";
const documentNormalSvg = ASSETS.mobile.documentNormal;
const minimiseIcon = ASSETS.images.minimise;
const infoIcon = ASSETS.mobile.icon2;
const {
  endVisit: visitEndIcon,
  closeVisit: closeVisitIcon,
} = ASSETS.images;

/** ensure voice BP (bloodPressure) populates Rx Pad by deriving Systolic/Diastolic when missing. */
function normalizeVitalsBloodPressure(vitals) {
  if (!vitals || typeof vitals !== 'object') return vitals;
  const v = vitals;
  let systolic = String(v.Systolic ?? v.systolic ?? '').trim();
  let diastolic = String(v.Diastolic ?? v.diastolic ?? '').trim();
  const bloodPressure = v.bloodPressure ?? v.blood_press ?? '';
  if ((!systolic || !diastolic) && bloodPressure) {
    const parts = String(bloodPressure).trim().split('/');
    if (parts.length >= 2) {
      systolic = parts[0].trim();
      diastolic = parts[1].trim();
    }
  }
  if (!systolic && !diastolic) return vitals;
  return { ...v, Systolic: systolic, Diastolic: diastolic };
}

function MobileRxPad({ visible, onClose, onDataReady, onQuickEdit, queries = [], existingData = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { profile, userId, servicesList } = useSelector((state) => state.doctors);
  const clinic = useMemo(() => getClinic(profile?.hospital_data), [profile?.hospital_data]);
  const { listVitalsTodayIds } = useSelector((state) => state.vitals);
  const { medicalHistoryData, setMedicalHistoryData } = useContext(CashManagerContext) || {};

  const { state } = location;
  const {
    patient_data,
    caseManagerData,
    fromVoiceRecording,
    audioBlob: audioBlobFromLocation,
    inputText: inputTextFromLocation,
    mode,
    consent,
    existingPrescriptionData, // For merging with new data
    existingGenRxDetails, // To check if updating existing Rx
    fromEndVisitEdit, // Edit from End Visit: always re-fetch getGenRx, never use stale existingData
  } = state || {};

  // Check if we're in "review mode" (just viewing existing data, no new input).
  // When fromEndVisitEdit: never use existingData (it can be stale); we will re-fetch via load-on-edit.
  const isReviewMode =
    !audioBlobFromLocation &&
    !inputTextFromLocation &&
    existingData?.prescriptionData &&
    !fromEndVisitEdit;

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showEndVisitScreen, setShowEndVisitScreen] = useState(false);
  const [showInfoBottomSheet, setShowInfoBottomSheet] = useState(false);
  const [endVisitCaseManagerData, setEndVisitCaseManagerData] = useState(null); // Store saved caseManagerData with print_url
  const [isEndingVisit, setIsEndingVisit] = useState(false); // Loading state for saving
  const [isSubModalOpen, setIsSubModalOpen] = useState(false); // Credit modal state
  // Initialize with existing data if in review mode, otherwise wait for API
  const [prescriptionData, setPrescriptionData] = useState(() => {
    if (isReviewMode) {
      return existingData.prescriptionData;
    }
    return null;
  });
  const [genRxDetails, setGenRxDetails] = useState(() => {
    if (isReviewMode && existingData?.genRxDetails) {
      return existingData.genRxDetails;
    }
    return existingGenRxDetails || null;
  });
  const [fullTranscript, setFullTranscript] = useState(() => {
    if (isReviewMode && existingData?.fullTranscript) {
      return existingData.fullTranscript;
    }
    return '';
  });
  const [conversations, setConversations] = useState(() => {
    if (isReviewMode && existingData?.conversations) {
      return existingData.conversations;
    }
    return [];
  });

  const hasAutoSubmittedRef = useRef(false);
  const lastLocationKeyRef = useRef(location.key); // Track location.key for state changes
  const listVitalsPatientIdRef = useRef(null);
  const persistVitalsInFlightRef = useRef(false);
  const processedInputRef = useRef(null); // Track which input we've already processed (prevents duplicates)
  const onDataReadyCalledRef = useRef(false); // Track if onDataReady was called for current input
  const hasLoadedForEditRef = useRef(null); // Track loaded smart_prescription_filename for edit to avoid duplicate fetch
  const editContextRef = useRef({ smartPrescriptionFilename: null }); // Persist prescription ID for edit mode
  // Numeric tcm_id from addCaseManager/editCaseManager response; used for viewCaseManager and getTcmId so we never use viewCaseManager's string tcm_id
  const endVisitTcmIdRef = useRef(null);
  const decodedToken = getDecodedToken();
  const doctorId = decodedToken?.result?.user_id;

  // Credit and trial logic (matches desktop ConsultationDrawer)
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const VOICE_RX_planDetails = servicesList?.find(service => service.service_name === S_VOICE_RX);
  const DDX_planDetails = servicesList?.find(service => service.service_name === S_DDX);
  
  const isVoiceRxCreditExpired = !isFreeVoiceRxUser && (
    VOICE_RX_planDetails?.plan_tier === FAILED_VERIFICATION ||
    (VOICE_RX_planDetails?.plan_tier === FREE && VOICE_RX_planDetails?.credit_balance <= 0)
  );

  const openSubModal = useCallback(() => {
    setIsSubModalOpen(true);
  }, []);

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen((prev) => !prev);
  }, []);

  const [isAmbientMode, setIsAmbientMode] = useState(() => {
    const activeService = window.TATVA_ACTIVE_VOICE_SERVICE;
    return activeService === S_AMBIENT_VOICE_RX;
  });

  useEffect(() => {
    // Improved mode detection - matches web version (checks multiple sources)
    const shouldBeAmbient = 
      mode === 'ambient' || 
      window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX ||
      genRxDetails?.type === 'ambient' ||
      existingGenRxDetails?.type === 'ambient';
    
    if (shouldBeAmbient) {
      setIsAmbientMode(true);
      window.TATVA_ACTIVE_VOICE_SERVICE = S_AMBIENT_VOICE_RX;
    } else if (mode === 'dictation') {
      setIsAmbientMode(false);
      window.TATVA_ACTIVE_VOICE_SERVICE = S_VOICE_RX;
    }
  }, [mode, genRxDetails?.type, existingGenRxDetails?.type]);

  // Track location.key changes to detect state updates with replace: true
  useEffect(() => {
    if (location.key !== lastLocationKeyRef.current) {
      lastLocationKeyRef.current = location.key;
      // Reset auto-submit ref when location state changes (new input detected)
      hasAutoSubmittedRef.current = false;
    }
  }, [location.key, location.state]);

  // Entry point credit validation for Voice Rx flows
  useEffect(() => {
    if (visible && (fromVoiceRecording || audioBlobFromLocation || inputTextFromLocation)) {
      // This is a Voice Rx entry - check credits
      if (isVoiceRxCreditExpired) {
        openSubModal();
      }
    }
  }, [visible, fromVoiceRecording, audioBlobFromLocation, inputTextFromLocation, isVoiceRxCreditExpired, openSubModal]);

  // Reset auto-submit ref ONLY when drawer closes (not when input values change)
  // This prevents infinite loop - input values stay in location.state even after processing
  useEffect(() => {
    // Only reset when drawer closes (visible becomes false)
    // This allows new input to be processed when drawer opens again
    if (!visible) {
      hasAutoSubmittedRef.current = false;
      processedInputRef.current = null;
      onDataReadyCalledRef.current = false;
      hasLoadedForEditRef.current = null; // Reset so edit-load can run again on next open
      editContextRef.current.smartPrescriptionFilename = null; // Reset edit context
      listVitalsPatientIdRef.current = null; // Refetch vitals on next pad open
    }
  }, [visible]); // Only depend on visible, not input values

  // Populate editContextRef when entering edit mode (persist prescription ID)
  useEffect(() => {
    const id = caseManagerData?.smart_prescription_filename;
    if (id && typeof id === 'string' && id.trim()) {
      editContextRef.current.smartPrescriptionFilename = id;
    }
  }, [caseManagerData?.smart_prescription_filename]);

  // New consultation (e.g. from walk-in add patient): no Voice RX input and no existing prescription.
  // Initialize with empty template so Rx Pad content (Vitals, History, etc.) shows like on web.
  useEffect(() => {
    if (!visible || !patient_data) return;
    if (prescriptionData != null) return;
    if (existingData?.prescriptionData) return;
    if (inputTextFromLocation || audioBlobFromLocation) return;
    setPrescriptionData(getEmptyPrescriptionTemplate());
  }, [visible, patient_data, prescriptionData, existingData?.prescriptionData, inputTextFromLocation, audioBlobFromLocation]);

  // Load patient's last medical history when starting new consultation (matches web TabPrescription behavior)
  useEffect(() => {
    if (!visible || !patient_data?.patient_unique_id) return;
    if (caseManagerData) return; // Only for new consultation (no existing case manager data)
    if (!setMedicalHistoryData) return;
    
    const loadLastHistory = async () => {
      try {
        const action = await dispatch(
          getPatientLastHistory({
            patient_unique_id: patient_data.patient_unique_id,
          })
        );
        if (action.meta.requestStatus === 'fulfilled' && action.payload) {
          setMedicalHistoryData(JSON.parse(JSON.stringify(action.payload)));
        }
      } catch (error) {
        console.error('Error loading patient last history:', error);
      }
    };
    
    loadLastHistory();
  }, [visible, patient_data?.patient_unique_id, caseManagerData, dispatch, setMedicalHistoryData]);

  // Fetch today's vitals on pad open and set listVitalsTodayIds (matches desktop: same isVoiceOrAmbientRx condition)
  const isVoiceOrAmbientRx = isAmbientMode || mode === 'ambient' || mode === 'dictation' || fromVoiceRecording === true ||
    window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient';
  useEffect(() => {
    if (!visible || !patient_data?.patient_unique_id || !isVoiceOrAmbientRx) return;
    const pid = patient_data.patient_unique_id;
    if (listVitalsPatientIdRef.current === pid) return;
    if (listVitalsPatientIdRef.current != null && listVitalsPatientIdRef.current !== pid) {
      dispatch(clearListVitalsToday());
    }
    listVitalsPatientIdRef.current = pid;
    const listPayload = {
      patient_unique_id: patient_data.patient_unique_id,
      pam_id: patient_data.pam_id ?? 0,
      mode: ADD,
      pm_pid: patient_data.pm_pid ?? 0,
      pm_id: patient_data.pm_id ?? 0,
    };
    ApiVitals.getVitals(listPayload)
      .then((listRes) => {
        const list = listRes?.data && Array.isArray(listRes.data) ? listRes.data : [];
        const today = moment().format('YYYY-MM-DD');
        const existingToday = list.find((v) => (v.date || v.createdAt || v.created_at || '').toString().startsWith(today));
        const flow = (isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient') ? 'ambient' : 'voice';
        dispatch(setListVitalsToday({
          flow,
          patient_unique_id: patient_data.patient_unique_id,
          tcv_id: existingToday?.tcv_id ?? 0,
          tcbc_id: existingToday?.tcbc_id ?? 0,
          dev_unique_id: existingToday?.dev_unique_id ?? 0,
        }));
        // Pre-fill Rx Pad with today's vitals so they are visible (matches desktop)
        if (existingToday && Object.values(existingToday).some((val) => val != null && String(val).trim() !== '')) {
          const mapApiToRxPad = (row) => ({
            temperature: row.temp,
            pulse: row.pres,
            respRate: row.resp_rate,
            bloodPressure: row.blood_press,
            Systolic: (row.blood_press || '').split('/')[0]?.trim(),
            Diastolic: (row.blood_press || '').split('/')[1]?.trim(),
            spo2: row.spo2,
            height: row.height,
            weight: row.weight,
            ofc: row.ofc,
            general_rbs: row.general_rbs,
            fib4: row.fib4,
            waist_circumference: row.waist_circumference,
            bmi: row.bmi,
            bmr: row.bmr,
            bsa: row.bsa,
            tcv_id: row.tcv_id,
            tcbc_id: row.tcbc_id,
            dev_unique_id: row.dev_unique_id,
          });
          setPrescriptionData((prev) => ({
            ...prev,
            vitalsAndBodyComposition: prev?.vitalsAndBodyComposition && Object.keys(prev.vitalsAndBodyComposition).length > 0
              ? prev.vitalsAndBodyComposition
              : mapApiToRxPad(existingToday),
          }));
        }
      })
      .catch(() => {
        listVitalsPatientIdRef.current = null;
      });
  }, [visible, patient_data?.patient_unique_id, patient_data?.pam_id, patient_data?.pm_pid, patient_data?.pm_id, isAmbientMode, mode, fromVoiceRecording, genRxDetails?.type, isVoiceOrAmbientRx, dispatch]);

  // Reset vitals ref when pad closes so next open refetches getVitals (fresh data)
  useEffect(() => {
    if (!visible) listVitalsPatientIdRef.current = null;
  }, [visible]);

  // TODO: Re-enable when getTodayVitals and getTodayLabResults are implemented/imported (e.g. from ApiVitals / lab API).
  // useEffect(() => {
  //   if (!visible || !patient_data?.patient_unique_id) return;
  //   const loadTodayData = async () => {
  //     const todayVitals = await getTodayVitals(patient_data);
  //     const todayLabResults = await getTodayLabResults(patient_data);
  //     if (todayVitals) {
  //       setPrescriptionData(prev => ({ ...prev, vitalsAndBodyComposition: todayVitals }));
  //     }
  //     if (todayLabResults && Array.isArray(todayLabResults) && todayLabResults.length > 0) {
  //       setPrescriptionData(prev => ({ ...prev, labResults: todayLabResults }));
  //     }
  //   };
  //   loadTodayData();
  // }, [visible, patient_data?.patient_unique_id, patient_data?.pam_id, patient_data?.pm_pid, patient_data?.pm_id]);
  // Load existing Voice RX when opening for Edit or Repeat (caseManagerData.smart_prescription_filename, no new audio/input).
  // Matches web ConsultationDrawer getGenRxDetails: getGenRx -> optionally getAmbientRx -> parse -> setPrescriptionData, genRxDetails.
  // For Repeat (tcm_id 0): web also loads the old Rx; we match that behavior.
  // When fromEndVisitEdit: always re-fetch (do not skip) so we get the latest saved data (e.g. updated symptoms/lab) from getGenRx.
  useEffect(() => {
    if (!visible) return;
    const id = caseManagerData?.smart_prescription_filename;
    if (!id || typeof id !== 'string' || !String(id).trim()) return;
    if (audioBlobFromLocation) return;
    if (inputTextFromLocation && typeof inputTextFromLocation === 'string' && inputTextFromLocation.trim().length > 0) return;
    if (existingData?.prescriptionData && !fromEndVisitEdit) return; // review mode: already have data; fromEndVisitEdit: always re-fetch
    if (hasLoadedForEditRef.current === id && !fromEndVisitEdit) return; // avoid duplicate fetch; fromEndVisitEdit: always re-fetch

    let cancelled = false;
    const run = async () => {
      setIsProcessing(true);
      try {
        const initialResponse = await getGenRx(id);
        if (cancelled) return;
        if (!initialResponse?.success || !initialResponse?.data) {
          throw new Error(initialResponse?.error || initialResponse?.data?.message || 'Failed to load prescription');
        }

        const conversation = initialResponse.data?.history?.[0]?.conversation;
        const hasConversation = conversation && Array.isArray(conversation) && conversation.length > 0;

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
        if (hasConversation) {
          const ambientResponse = await getAmbientRx(id);
          if (cancelled) return;
          if (ambientResponse?.success) {
            response = ambientResponse;
          }
        }

        if (!response?.success || !response?.data) {
          throw new Error(response?.error || 'Failed to load prescription');
        }

        const hasAmbientType =
          (response.data?.rxDigitizationHistory || []).some((h) => h?.category === 'ambient-rx') || hasConversation;

        if (hasAmbientType) {
          let parsed = null;
          if (response.data.editedData) {
            parsed = response.data.editedData;
          } else if (response.data.digitizeData) {
            parsed = response.data.digitizeData;
          } else if (response.data.digitize) {
            const d = response.data.digitize;
            if (d && typeof d === 'object' && !Array.isArray(d)) {
              const numeric = Object.keys(d).filter((k) => /^\d+$/.test(k));
              if (numeric.length > 0) parsed = d[numeric[0]];
              else if (d.symptoms || d.medications || d.vitalsAndBodyComposition) parsed = d;
              else parsed = d;
            } else {
              parsed = d;
            }
          } else {
            const amb = (response.data.rxDigitizationHistory || []).filter((h) => h?.category === 'ambient-rx');
            const last = amb[amb.length - 1];
            parsed = last?.response || last?.payload?.response || last?.payload || null;
          }

          if (parsed?.vitalsAndBodyComposition) {
            const raw = parsed.vitalsAndBodyComposition;
            const actual = raw._doc || raw;
            const cleaned = {};
            Object.keys(actual || {}).forEach((k) => {
              if (actual[k] !== undefined && actual[k] !== null) cleaned[k] = actual[k];
            });
            parsed.vitalsAndBodyComposition = cleaned;
          }

          if (parsed) {
            const validated = validatePrescriptionData(parsed);
            if (cancelled) return;
            const toSet = (validated && typeof validated === 'object') ? validated : (parsed && typeof parsed === 'object' ? parsed : null);
            if (toSet != null) {
              const rawV = toSet.vitalsAndBodyComposition;
              const normalizedV = rawV && typeof rawV === 'object' && Object.keys(rawV).length > 0
                ? normalizeVitalsBloodPressure(rawV)
                : rawV;
              const toSetWithVitals = normalizedV
                ? { ...toSet, vitalsAndBodyComposition: normalizedV }
                : toSet;
              setPrescriptionData(toSetWithVitals);
              if (normalizedV && Object.keys(normalizedV).length > 0) {
                persistVitalsFromApiResponse(normalizedV);
              }
            }
          }

          setGenRxDetails({
            _id: response.data._id || id,
            source: response.data.source || '',
            source_duration: response.data.source_duration,
            timeRequiredInMs: response.data.timeRequiredInMs,
            type: 'ambient',
          });
          if (response.data?.source) {
            setFullTranscript(response.data.source);
          }
          const hist = (response.data?.history || []).filter(
            (h) => h?.conversation && Array.isArray(h.conversation) && h.conversation.length > 0
          );
          if (hist.length > 0) {
            const all = hist.flatMap((h) => h.conversation || []);
            setConversations(all);
          }
        } else {
          // Dictate
          const fromResponse = response.data?.editedData || response.data?.digitizeData;
          if (fromResponse) {
            const validated = validatePrescriptionData(fromResponse);
            if (cancelled) return;
            const toSet = (validated && typeof validated === 'object') ? validated : (fromResponse && typeof fromResponse === 'object' ? fromResponse : null);
            if (toSet != null) {
              const rawV = toSet.vitalsAndBodyComposition;
              const normalizedV = rawV && typeof rawV === 'object' && Object.keys(rawV).length > 0
                ? normalizeVitalsBloodPressure(rawV)
                : rawV;
              const toSetWithVitals = normalizedV
                ? { ...toSet, vitalsAndBodyComposition: normalizedV }
                : toSet;
              setPrescriptionData(toSetWithVitals);
              if (normalizedV && Object.keys(normalizedV).length > 0) {
                persistVitalsFromApiResponse(normalizedV);
              }
            }
          }
          let transcriptSource = response.data?.source;
          if (!transcriptSource && (response.data?.history || []).length > 0) {
            const t = (response.data.history || [])
              .map((h) => h?.transcription)
              .filter((x) => x && x !== 'null' && String(x).trim());
            if (t.length > 0) transcriptSource = t.join(' ');
          }
          setGenRxDetails({
            _id: response.data._id || id,
            source: transcriptSource || response.data?.source || '',
            source_duration: response.data?.source_duration,
            timeRequiredInMs: response.data?.timeRequiredInMs,
            type: response.data?.type || 'dictate',
          });
          if (transcriptSource) {
            setFullTranscript(transcriptSource);
          }
        }

        hasLoadedForEditRef.current = id;
      } catch (e) {
        if (!cancelled) {
          message.error(e?.message || 'Failed to load prescription');
          hasLoadedForEditRef.current = null;
        }
      } finally {
        if (!cancelled) setIsProcessing(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [
    visible,
    caseManagerData?.smart_prescription_filename,
    audioBlobFromLocation,
    inputTextFromLocation,
    existingData?.prescriptionData,
    fromEndVisitEdit,
  ]);

  // Auto-submit effect - matches web version: allows subsequent inputs (no prescriptionData check)
  useEffect(() => {
    // Skip auto-submit in review mode (just viewing existing data)
    if (isReviewMode) {
      return;
    }

    // Reset if location.key changed (new navigation with replace: true)
    if (location.key !== lastLocationKeyRef.current) {
      hasAutoSubmittedRef.current = false;
    }

    if (hasAutoSubmittedRef.current) {
      return;
    }

    // Check if this input was already processed (prevent duplicate processing)
    const currentInputId = audioBlobFromLocation 
      ? `audio-${audioBlobFromLocation.size || 'unknown'}` 
      : inputTextFromLocation 
        ? `text-${inputTextFromLocation.substring(0, 20)}` 
        : null;
    
    if (currentInputId && processedInputRef.current === currentInputId) {
      return;
    }

    // Remove !prescriptionData check to allow subsequent inputs (matches web handleSend behavior)
    const shouldAutoSubmit = visible && (
      (fromVoiceRecording && audioBlobFromLocation) ||
      (inputTextFromLocation && typeof inputTextFromLocation === 'string' && inputTextFromLocation.trim().length > 0)
    ) && !isProcessing;

    if (!shouldAutoSubmit) return;

    hasAutoSubmittedRef.current = true;
    
    // Mark input as being processed
    if (currentInputId) {
      processedInputRef.current = currentInputId;
    }

    const run = async () => {
      try {
        await new Promise((r) => setTimeout(r, 80));
        setIsProcessing(true);

        // Prioritize text input over audio blob (text input is explicit user action)
        // If both are present, use text input (matches web version behavior)
        if (inputTextFromLocation && typeof inputTextFromLocation === 'string' && inputTextFromLocation.trim().length > 0) {
          await handleVoiceDigitize(null, inputTextFromLocation);
        } else if (audioBlobFromLocation) {
          await handleVoiceDigitize(audioBlobFromLocation, '');
        }
      } catch (e) {
        setIsProcessing(false);
        hasAutoSubmittedRef.current = false;
        // Reset processed input on error to allow retry
        processedInputRef.current = null;
        onDataReadyCalledRef.current = false;
      }
    };
    run();
  }, [visible, fromVoiceRecording, audioBlobFromLocation, inputTextFromLocation, isProcessing, location.key, isReviewMode, prescriptionData]);

  // Remove Smart Capture items (matches web version)
  const removeScItems = (data) => {
    if (!data || typeof data !== 'object') {
      return data;
    }
    return {
      ...data,
      symptoms: Array.isArray(data.symptoms) ? data.symptoms.filter((symptom) => !symptom.SC) : [],
      medicalHistory: Array.isArray(data.medicalHistory) ? data.medicalHistory.filter((history) => !history.SC) : [],
    };
  };

  // Prepare payload for API (matches web version logic, simplified for mobile)
  const preparePayloadForApi = () => {
    // Use current prescriptionData state or existingPrescriptionData from location.state
    const currentData = prescriptionData || existingPrescriptionData;
    if (!currentData) {
      return {};
    }
    
    const cleanedData = removeScItems(currentData);
    const { dynamicFields = {} } = cleanedData;
    
    // Include ALL dynamic fields (including local modules) so custom module edits are preserved.
    // Optionally prune strictly empty arrays to keep payload lean.
    const filteredDynamicFields = Object.entries(dynamicFields).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) {
        // Remove purely empty/whitespace items
        const trimmed = value
          .map((v) => (typeof v === "string" ? v.trim() : v))
          .filter((v) => (typeof v === "string" ? v.length > 0 : v !== null && v !== undefined));
        acc[key] = trimmed;
      } else if (value && typeof value === 'object') {
        acc[key] = value;
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

  const validatePrescriptionData = (data) => {
    if (!data || typeof data !== 'object') {
      return false;
    }
    const mappedLabResults = Array.isArray(data.labResults) ? data.labResults : [];
    // Normalize labInvestigation: map instruction → notes so voice/API note shows on Rx Pad (match ConsultationDrawer)
    const mappedLabInvestigation = Array.isArray(data.labInvestigation)
      ? data.labInvestigation.map((item) => {
          const obj = typeof item === 'object' && item !== null ? { ...item } : { name: item, lineItem: item };
          const noteText = obj.notes ?? obj.instruction ?? '';
          return { ...obj, notes: noteText, instruction: noteText };
        })
      : [];
    const cleanedData = {
      symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
      medications: Array.isArray(data.medications) ? data.medications : [],
      vitalsAndBodyComposition: data.vitalsAndBodyComposition || {},
      advice: Array.isArray(data.advice) ? data.advice : [],
      diagnosis: Array.isArray(data.diagnosis) ? data.diagnosis : [],
      examinations: Array.isArray(data.examinations) ? data.examinations : [],
      followUp: typeof data.followUp === 'string' ? data.followUp : "",
      labInvestigation: mappedLabInvestigation,
      labResults: mappedLabResults,
      medicalHistory: Array.isArray(data.medicalHistory) ? data.medicalHistory : [],
      vaccinations: Array.isArray(data.vaccinations) ? data.vaccinations : [],
      others: Array.isArray(data.others) ? data.others : [],
      dynamicFields: data.dynamicFields || {},
    };
    return cleanedData;
  };

  // Empty prescription template (matches web: show form sections when starting new consultation with no Voice Rx input)
  const getEmptyPrescriptionTemplate = () => ({
    symptoms: [],
    medications: [],
    vitalsAndBodyComposition: {},
    advice: [],
    diagnosis: [],
    examinations: [],
    followUp: '',
    labInvestigation: [],
    labResults: [],
    medicalHistory: [],
    vaccinations: [],
    others: [],
    dynamicFields: {},
  });

  // Match web ConsultationDrawer: format lab results for case manager API
  const formatLabResultsForApi = (labResults = []) => {
    if (!Array.isArray(labResults) || labResults.length === 0) return [];
    const today = moment().format('YYYY-MM-DD');
    const groupedByDate = {};
    labResults.forEach((result = {}) => {
      const dateKey = result.date || today;
      const testname = result.testname || result.name || 'Result';
      const value = result.value || '';
      const units = result.units || '';
      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
      let cleanValue = value;
      let cleanUnits = units;
      if (value && !units) {
        const parts = String(value).trim().split(/\s+/);
        if (parts.length > 1) {
          cleanValue = parts.slice(0, -1).join(' ');
          cleanUnits = parts[parts.length - 1];
        }
      }
      groupedByDate[dateKey].push({
        reportName: result.reportName || '',
        testName: testname,
        value: cleanValue,
        units: cleanUnits,
        refRange: result.refRange || '',
        arrowDirection: result.arrowDirection || '',
      });
    });
    return Object.entries(groupedByDate)
      .map(([date, inputs]) => ({ date, inputs: inputs.filter((i) => i.value && String(i.value).trim() !== '') }))
      .filter((r) => r.inputs.length > 0);
  };

  const getFilledModulesSummary = (data = {}) => {
    const modules = [];
    const hasArrayData = (value) => Array.isArray(value) && value.length > 0;
    const hasObjectData = (value) =>
      value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
    const hasStringData = (value) => typeof value === "string" && value.trim().length > 0;

    if (hasArrayData(data?.symptoms)) modules.push("symptoms");
    if (hasArrayData(data?.diagnosis)) modules.push("diagnosis");
    if (hasArrayData(data?.medications)) modules.push("medications");
    if (hasArrayData(data?.medicalHistory)) modules.push("medicalHistory");
    if (hasArrayData(data?.labInvestigation)) modules.push("labInvestigation");
    if (hasArrayData(data?.labResults)) modules.push("labResults");
    if (hasArrayData(data?.advice) || hasStringData(data?.advice)) modules.push("advice");
    if (hasArrayData(data?.others)) modules.push("others");
    if (hasStringData(data?.followUp)) modules.push("followUp");
    if (hasObjectData(data?.vitalsAndBodyComposition)) modules.push("vitalsAndBodyComposition");

    return {
      rxModulesFilledCount: modules.length,
      filledModules: modules,
    };
  };

  const persistLabResultsToApi = async (labResultsDataForApi = []) => {
    if (!Array.isArray(labResultsDataForApi) || labResultsDataForApi.length === 0 || !patient_data?.patient_unique_id) return;
    const decodedToken = getDecodedToken();
    const fallbackDoctorId = decodedToken?.result?.user_id;
    const doctorId = profile?.doctor_unique_id || fallbackDoctorId;
    if (!doctorId) return; // Avoid API call that would fail; labParamsData still sent to case manager
    try {
      await addPatientLabReports({
        patientId: patient_data.patient_unique_id,
        doctorId,
        results: labResultsDataForApi,
      });
    } catch (err) {
      console.error('Error saving lab results to API:', err);
    }
  };

  const handleVoiceDigitize = async (audioBlobParam, transcribedText) => {
    let submitId = "";
    let requestId = "";
    let voiceApiStartMs = 0;
    let modeForEvent = "dictation";
    let didTrackVoiceApiSuccess = false;

    try {
      // Real-time credit check before voice processing (matches desktop ConsultationDrawer)
      if (!isFreeVoiceRxUser && (
        VOICE_RX_planDetails?.plan_tier === FREE && VOICE_RX_planDetails?.credit_balance <= 0
      )) {
        setIsProcessing(false);
        showHideSubModal();
        return;
      }
      if (!isFreeVoiceRxUser && VOICE_RX_planDetails?.plan_tier === FAILED_VERIFICATION) {
        setIsProcessing(false);
        showHideSubModal();
        return;
      }

      // Additional real-time credit validation via API
      if (!isFreeVoiceRxUser) {
        const sendData = {
          b2c_id: profile?.b2c,
          service_name: S_VOICE_RX,
        };
        const action = await dispatch(checkCredits(sendData));
        if (action.meta.requestStatus === "fulfilled") {
          if (action?.payload?.hasOwnProperty("service_name")) {
            if (
              action?.payload?.plan_tier === FREE &&
              action?.payload?.credit_balance <= 0
            ) {
              await dispatch(services(sendData?.b2c_id));
              setIsProcessing(false);
              showHideSubModal();
              return;
            } else if (
              action?.payload?.plan_tier === FAILED_VERIFICATION
            ) {
              setIsProcessing(false);
              showHideSubModal();
              return;
            }
          }
        }
      }

      voiceApiStartMs = Date.now();
      submitId = `mobile-rxpad-voice-submit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      requestId = submitId;

      let response;
      const patientId = patient_data?.patient_unique_id || '';
      const admissionId = caseManagerData?.admission_id || null;
      
      // Calculate duration for audio input (store for query duration)
      // Check response first, then calculate from blob (matches web version)
      let currentRecordingDuration = null;
      // Note: We'll check response after API call, but calculate here as fallback
      if (audioBlobParam) {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const arrayBuffer = await audioBlobParam.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          currentRecordingDuration = audioBuffer.duration;
        } catch (e) {
          // Could not calculate audio duration
        }
      }

      // Determine if updating existing prescription or creating new one
      // Use multiple fallbacks to ensure prescription ID is preserved across state updates
      const existingRxId =
        genRxDetails?._id ||
        existingGenRxDetails?._id ||
        caseManagerData?.smart_prescription_filename ||
        editContextRef.current?.smartPrescriptionFilename;
      const isUpdatingRx = !!existingRxId;

      // Improved mode detection - matches web version
      const isAmbient = isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient' || existingGenRxDetails?.type === 'ambient';

      modeForEvent = isAmbient ? "ambient" : "dictation";
      const fromVoiceRecordingEvent = !!fromVoiceRecording;
      const audioSizeBytes = Number(audioBlobParam?.size || 0);
      const audioMimeType = audioBlobParam?.type || "";
      const isTypedTranscriptInput =
        !audioBlobParam && typeof transcribedText === "string" && transcribedText.trim().length > 0;

      if (isTypedTranscriptInput) {
        trackEvent("TP_App_AV_TypeTranscript", {
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
      }

      if (isUpdatingRx) {
        const clinic_name = getClinicName(profile?.hospital_data);
        trackEvent("TP_App_VoiceRx_editRx", {
          patient_contact: patient_data?.pm_contact_no || "",
          patient_id: patient_data?.patient_unique_id || "",
          doctor_speciality: profile?.dp_name,
          doctor_unique_id: profile?.doctor_unique_id,
          clinic_name,
          rx_id: existingRxId || genRxDetails?._id || "",
        });
      }

      trackEvent("TP_App_Voice_Submit_Click", {
        ...getVoiceRxMoengageBasePayload({
          profile,
          userId,
          patientData: patient_data,
          clinic,
          format: "technical",
        }),
        prescriptionUrl: "",
        network:
          navigator?.connection?.effectiveType ||
          (typeof navigator?.onLine === "boolean" && !navigator.onLine ? "offline" : "stable"),
        micBeingUsed: "Unknown",
        browser: "mobile_web",
        durationOfAudioInSeconds: currentRecordingDuration != null ? Math.round(currentRecordingDuration) : 0,
        voiceApiCalled: true,
        sessionId: genRxDetails?._id || "",
        submitId,
        requestId,
        audioSizeBytes,
        audioMimeType,
        mode: modeForEvent,
        fromVoiceRecording: fromVoiceRecordingEvent,
        upload_latency_ms: null,
        upload_failed: false,
        upload_error_message: "",
        voicecall: modeForEvent === "ambient" ? 1 : 0,
        timestamp: new Date().toISOString(),
      });

      if (isAmbient) {
        const formData = new FormData();

        if (audioBlobParam) {
          const audioFile = new File(
            [audioBlobParam],
            `ambient-voice-rx-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`,
            { type: audioBlobParam.type || 'audio/webm' }
          );
          formData.append('file', audioFile);
          formData.append('source_duration', currentRecordingDuration ? currentRecordingDuration.toString() : '0');
        } else if (transcribedText) {
          formData.append('voice_prescription_text', transcribedText);
        }

        formData.append('doctorId', doctorId);
        formData.append('patientId', patientId);
        formData.append('schemaKey', 'default');
        formData.append('getConversation', 'true');

        if (consent && typeof consent === 'object') {
          formData.append('consent', JSON.stringify(consent));
        }

        // UPDATE vs NEW logic (matches web version)
        if (isUpdatingRx) {
          // Update local transcript for text inputs
          if (transcribedText) {
            const updatedTranscript = [fullTranscript, transcribedText].filter(Boolean).join(" ");
            setFullTranscript(updatedTranscript);
            
            // For text input: Create new FormData with only new text (matches web version)
            const newFormData = new FormData();
            newFormData.append("voice_prescription_text", (transcribedText || "").trim());
            
            // Copy other fields (excluding voice_prescription_text and voice_prescription_previous_context)
            Array.from(formData.entries()).forEach(([key, value]) => {
              if (key !== '' && key !== 'voice_prescription_text' && key !== 'voice_prescription_previous_context') {
                newFormData.append(key, value);
              }
            });
            
            // Ensure voice_prescription_previous_context is included with latest data
            const data = preparePayloadForApi();
            newFormData.append("voice_prescription_previous_context", JSON.stringify(data));
            
            // Ensure all required fields are in FormData
            if (!newFormData.has("doctorId")) {
              newFormData.append("doctorId", doctorId);
            }
            if (!newFormData.has("patientId")) {
              newFormData.append("patientId", patientId);
            }
            if (!newFormData.has("schemaKey")) {
              newFormData.append("schemaKey", "default");
            }
            if (!newFormData.has("getConversation")) {
              newFormData.append("getConversation", "true");
            }
            if (consent && typeof consent === 'object' && !newFormData.has("consent")) {
              newFormData.append("consent", JSON.stringify(consent));
            }
            
            response = await updateAmbientRx(
              newFormData,
              existingRxId,
              patientId,
              admissionId
            );
          } else {
            // For audio input: Use existing formData
            const data = preparePayloadForApi();
            formData.append("voice_prescription_previous_context", JSON.stringify(data));
            
            // Ensure all required fields are in FormData
            if (!formData.has("doctorId")) {
              formData.append("doctorId", doctorId);
            }
            if (!formData.has("patientId")) {
              formData.append("patientId", patientId);
            }
            if (!formData.has("schemaKey")) {
              formData.append("schemaKey", "default");
            }
            if (!formData.has("getConversation")) {
              formData.append("getConversation", "true");
            }
            if (consent && typeof consent === 'object' && !formData.has("consent")) {
              formData.append("consent", JSON.stringify(consent));
            }
            
            response = await updateAmbientRx(
              formData,
              existingRxId,
              patientId,
              admissionId
            );
          }
        } else {
          // NEW Rx - Use generateAmbientRx
          // Ensure all required fields are in FormData
          if (!formData.has("doctorId")) {
            formData.append("doctorId", doctorId);
          }
          if (!formData.has("patientId")) {
            formData.append("patientId", patientId);
          }
          if (!formData.has("schemaKey")) {
            formData.append("schemaKey", "default");
          }
          if (!formData.has("getConversation")) {
            formData.append("getConversation", "true");
          }
          if (consent && typeof consent === 'object' && !formData.has("consent")) {
            formData.append("consent", JSON.stringify(consent));
          }
          
          response = await generateAmbientRx(formData, patientId, admissionId);
          
          if (transcribedText) {
            setFullTranscript(transcribedText);
          }
        }
      } else {
        // Dictate Mode - Same UPDATE/NEW logic
        const formData = new FormData();

        if (audioBlobParam) {
          formData.append('file', audioBlobParam); // Web version uses blob directly
          formData.append('voice_prescription_filename', `${uuidv4()}.webm`);
          formData.append('source_duration', currentRecordingDuration || 0);
        } else if (transcribedText) {
          formData.append('voice_prescription_text', transcribedText);
        }

        formData.append('doctorId', doctorId);
        formData.append('patientId', patientId);

        // UPDATE existing Rx for dictate mode
        if (isUpdatingRx) {
          const data = preparePayloadForApi();
          formData.append('voice_prescription_previous_context', JSON.stringify(data));
          
          response = await updateGenRx(formData, existingRxId);
        } else {
        response = await generateRx(formData);
        }
      }

      // Process response (matches web version)
      const responseData = response?.data || response;
      const actualData = responseData?.data || responseData;

      // Improved success check - matches web version (comprehensive)
      const isSuccess = (response?.success !== false || responseData?.success !== false || actualData?.success !== false) && (actualData || responseData) && (
        actualData?.digitize || 
        responseData?.digitize ||
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
        const moduleSummary = getFilledModulesSummary(actualData || responseData || {});
        trackEvent("TP_App_Voice_Api_Result", {
          ...getVoiceRxMoengageBasePayload({
            profile,
            userId,
            patientData: patient_data,
            clinic,
            format: "technical",
          }),
          prescriptionUrl: "",
          _id: actualData?._id || responseData?._id || "",
          voice_failed: false,
          error_message: "",
          retry_attempts: 0,
          isemptyprescription: moduleSummary.rxModulesFilledCount === 0,
          submitId,
          requestId,
          voice_api_latency_ms: Date.now() - voiceApiStartMs,
          http_status: response?.statusCode || response?.status || null,
          error_code: "",
          error_type: "",
          rx_modules_filled_count: moduleSummary.rxModulesFilledCount,
          filled_modules: moduleSummary.filledModules.join(","),
          voicecall: modeForEvent === "ambient" ? 1 : 0,
          timestamp: new Date().toISOString(),
        });
        didTrackVoiceApiSuccess = true;

        const finalResponseData = actualData || responseData;
        
        if (!finalResponseData) {
          throw new Error('No data received from API');
        }
        
        let prescriptionData = null;
        let conversationData = null;

        // Improved data extraction - matches web version priority order
        if (isAmbient) {
          // Priority 1: Check for editedData (contains user edits including dosage)
          if (finalResponseData.editedData || actualData?.editedData || responseData?.editedData) {
            prescriptionData = finalResponseData.editedData || actualData?.editedData || responseData.editedData;
          }
          // Priority 2: Check for digitizeData (aggregated data)
          else if (finalResponseData.digitizeData || actualData?.digitizeData || responseData?.digitizeData) {
            prescriptionData = finalResponseData.digitizeData || actualData?.digitizeData || responseData.digitizeData;
          }
          // Priority 3: Check for digitize object (single digitization)
          else if (finalResponseData.digitize || actualData?.digitize || responseData?.digitize) {
            prescriptionData = finalResponseData.digitize || actualData?.digitize || responseData.digitize;
          }
          // Priority 4: Check for rxDigitizationHistory (latest ambient entry)
          else if (finalResponseData.rxDigitizationHistory && Array.isArray(finalResponseData.rxDigitizationHistory) && finalResponseData.rxDigitizationHistory.length > 0) {
            const ambientEntries = responseData.rxDigitizationHistory.filter(h => h.category === "ambient-rx");
            const latestAmbientEntry = ambientEntries[ambientEntries.length - 1];
            
            if (latestAmbientEntry) {
              prescriptionData = latestAmbientEntry.payload?.response || 
                               latestAmbientEntry.response || 
                               latestAmbientEntry.payload;
              
              if (latestAmbientEntry.payload?.conversation) {
                conversationData = latestAmbientEntry.payload.conversation;
              }
            }
          }
          // Priority 5: Direct prescription data in response (fallback)
          else if (responseData.symptoms || responseData.medications || responseData.vitalsAndBodyComposition) {
            prescriptionData = responseData;
          }
          
          // Handle conversation data for ambient mode (if not already set)
          if (!conversationData) {
            if (responseData.conversation) {
              conversationData = responseData.conversation;
            } else if (responseData.rxDigitizationHistory?.[0]?.payload?.conversation) {
              conversationData = responseData.rxDigitizationHistory[0].payload.conversation;
            }
          }
        } else {
          // Dictate mode - improved extraction
          // Priority 1: Check for editedData
          if (actualData?.editedData) {
            prescriptionData = actualData.editedData;
          }
          else if (responseData?.editedData) {
            prescriptionData = responseData.editedData;
          }
          // Priority 2: Check for digitizeData
          else if (actualData?.digitizeData) {
            prescriptionData = actualData.digitizeData;
          }
          else if (responseData?.digitizeData) {
            prescriptionData = responseData.digitizeData;
          }
          // Priority 3: Check for direct prescription data
          else if (responseData?.symptoms || responseData?.medications || responseData?.vitalsAndBodyComposition) {
            prescriptionData = responseData;
          }
          // Priority 4: Check for rxDigitizationHistory
          else if (responseData?.rxDigitizationHistory?.[0]?.payload?.response) {
            prescriptionData = responseData.rxDigitizationHistory[0].payload.response;
          }
          else if (responseData?.rxDigitizationHistory?.[0]?.response) {
            prescriptionData = responseData.rxDigitizationHistory[0].response;
          }
          // Priority 5: Check for digitize
          else if (responseData?.digitize || actualData?.digitize) {
            prescriptionData = responseData?.digitize || actualData?.digitize;
          }
          
          // Handle conversation data for dictate mode
          if (responseData?.conversation) {
            conversationData = responseData.conversation;
          } else if (responseData?.rxDigitizationHistory?.[0]?.payload?.conversation) {
            conversationData = responseData.rxDigitizationHistory[0].payload.conversation;
          }
        }

        if (prescriptionData) {
          const validated = validatePrescriptionData(prescriptionData);
          const validatedData = (validated && typeof validated === 'object')
            ? validated
            : (prescriptionData && typeof prescriptionData === 'object' ? prescriptionData : {});

          const genRxDetailsData = {
            _id: responseData?._id || actualData?._id,
            source: responseData?.source || actualData?.source || '',
            source_duration: responseData?.source_duration || actualData?.source_duration,
            type: responseData?.type || actualData?.type || mode,
          };

          // Extract transcript text - match web version logic: transcription first, then history, then source
          let transcriptText = '';
          
          // First check for direct transcription field (matches web version line 2376)
          const transcription = responseData?.data?.transcription || responseData?.transcription || actualData?.transcription;
          if (transcription) {
            transcriptText = transcription;
          } 
          // Second check for history array (matches web version line 2437-2454)
          else {
            const history = responseData?.data?.history || responseData?.history || actualData?.history;
            if (history && Array.isArray(history) && history.length > 0) {
              const validTranscriptions = history
                .map(({ transcription, source_duration }) => ({
                  text: transcription,
                  isAudio: !!source_duration,
                  duration: source_duration || null
                }))
                .filter((query) => query.text && query.text !== "null" && query.text);
              
              if (validTranscriptions.length > 0) {
                transcriptText = validTranscriptions.map(q => q.text).join(' ');
              }
            }
            // Third fallback to source (matches web version line 2455-2464)
            // Only use source if it doesn't look like a filename (contains .webm, .mp3, etc.)
            else {
              const source = responseData?.data?.source || responseData?.source || actualData?.source;
              if (source && !source.match(/\.(webm|mp3|wav|m4a|ogg)$/i)) {
                transcriptText = source;
              }
            }

          }

          // Update full transcript
          let updatedFullTranscript = fullTranscript;
          if (transcriptText) {
            if (isUpdatingRx) {
              // Append for updates
              const existingTranscript = fullTranscript || genRxDetails?.source || '';
              updatedFullTranscript = existingTranscript ? 
                (existingTranscript + ' ' + transcriptText).trim() : transcriptText;
            } else {
              // Set for new Rx
              updatedFullTranscript = transcriptText;
            }
            setFullTranscript(updatedFullTranscript);
          }

          setGenRxDetails(genRxDetailsData);
          if (conversationData && Array.isArray(conversationData)) {
            setConversations(conversationData);
          }

          // Create query object (matches web version logic)
          const isAudioInput = !!audioBlobParam;
          
          // Get duration from response first, then use calculated duration (matches web version line 2385)
          let queryDuration = null;
          if (isAudioInput) {
            queryDuration = responseData?.data?.source_duration || responseData?.source_duration || actualData?.source_duration || currentRecordingDuration || genRxDetailsData.source_duration || null;
          }
          
          // For ambient mode, handle conversations like web version
          let conversationsToStore = [];
          if (isAmbient) {
            if (!isAudioInput && transcribedText) {
              // Text input: Use only the text that was just typed (matches web version line 1931-1938)
              conversationsToStore = [{
                speaker: 'doctor',
                text: transcribedText,
                message: transcribedText,
                content: transcribedText
              }];
            } else if (isAudioInput && conversationData) {
              // Audio input: Extract only NEW conversations that weren't in previous queries (matches web version lines 1939-1971)
              // Get all previous conversations from existing queries
              const previousConversations = queries.flatMap(q => {
                if (q && typeof q === 'object' && q.conversations && Array.isArray(q.conversations)) {
                  return q.conversations;
                }
                return [];
              });
              
              // Extract only new conversations that weren't in previous queries
              // Compare by text content and speaker to identify new ones
              const newConversations = conversationData.filter(newConv => {
                const newText = newConv?.message || newConv?.text || newConv?.content || '';
                const newSpeaker = (newConv?.speaker || '').toLowerCase();
                
                // Check if this conversation already exists in previous queries
                return !previousConversations.some(prevConv => {
                  const prevText = prevConv?.message || prevConv?.text || prevConv?.content || '';
                  const prevSpeaker = (prevConv?.speaker || '').toLowerCase();
                  return prevText === newText && prevSpeaker === newSpeaker;
                });
              });
              
              // Use new conversations if found, otherwise fallback to transcription text
              conversationsToStore = newConversations.length > 0 ? newConversations : (
                transcribedText ? [{
                  speaker: 'doctor',
                  text: transcribedText,
                  message: transcribedText,
                  content: transcribedText
                }] : []
              );
            }
          }

          // Ensure audio queries ALWAYS have meaningful text content
          let queryText = '';
          if (isAudioInput) {
            // For audio inputs, prioritize transcriptText, then conversation text, then fallback
            if (transcriptText && transcriptText.trim()) {
              queryText = transcriptText.trim();
            } else if (isAmbient && conversationsToStore.length > 0) {
              // For ambient audio, use conversation text
              queryText = conversationsToStore
                .map(conv => conv.text || conv.message || conv.content)
                .filter(Boolean)
                .join(' ')
                .trim();
            }
            // Fallback for audio without transcript
            if (!queryText) {
              queryText = 'Audio recording processed';
            }
          } else {
            // For text inputs, use the transcribed text
            queryText = (transcribedText || transcriptText || '').trim();
          }
          
          const newQuery = isAmbient ? {
            conversations: conversationsToStore,
            isAudio: isAudioInput,
            duration: queryDuration,
            text: queryText // Always has meaningful text
          } : {
            text: queryText, // Always has meaningful text
            isAudio: isAudioInput,
            duration: queryDuration
          };

          setIsProcessing(false);

          // Single short delay then show content (avoids double-load: was 700ms + 2s skeleton)
          const transitionMs = 220;
          // normalize voice BP so Rx Pad shows Systolic/Diastolic when API returns only bloodPressure
          const rawVitals = validatedData?.vitalsAndBodyComposition;
          const normalizedVitals = rawVitals && typeof rawVitals === 'object' && Object.keys(rawVitals).length > 0
            ? normalizeVitalsBloodPressure(rawVitals)
            : rawVitals;

          setTimeout(() => {
            // Use callback pattern to merge data (matches web version setPrescriptionData logic)
            setPrescriptionData((prevData) => {
                const apiDynamicFields = validatedData?.dynamicFields || {};
                const prevDynamicFields = prevData?.dynamicFields || {};
                const mergedDynamicFields = {
                  ...prevDynamicFields,
                  ...apiDynamicFields,
                };
                const vitalsToSet = normalizedVitals ?? validatedData?.vitalsAndBodyComposition;

                if (isUpdatingRx && prevData) {
                  const hasMeaningfulData = validatedData.symptoms?.length > 0 || 
                                            validatedData.medications?.length > 0 || 
                                            validatedData.vitalsAndBodyComposition || 
                                            Object.keys(validatedData).length > 2;
                  
                  if (hasMeaningfulData) {
                    return {
                      ...validatedData,
                      vitalsAndBodyComposition: vitalsToSet ?? validatedData?.vitalsAndBodyComposition,
                      medicalHistory: validatedData.medicalHistory || prevData?.medicalHistory || [],
                      dynamicFields: mergedDynamicFields,
                    };
                  } else {
                    // Preserve medical history even when there's no meaningful data (matches web version line 2136-2141)
                    return {
                      ...(prevData || {}),
                      medicalHistory: prevData?.medicalHistory || validatedData?.medicalHistory || [],
                      dynamicFields: mergedDynamicFields,
                    };
                  }
                } else {
                  return {
                    ...validatedData,
                    vitalsAndBodyComposition: vitalsToSet ?? validatedData?.vitalsAndBodyComposition,
                    medicalHistory: validatedData.medicalHistory || prevData?.medicalHistory || [],
                    dynamicFields: mergedDynamicFields,
                  };
                }
              });
              if (normalizedVitals && Object.keys(normalizedVitals).length > 0) {
                setTimeout(() => persistVitalsFromApiResponse(normalizedVitals), 0);
              }

              // Calculate final prescription data for onDataReady callback (before state update)
              // Use existingPrescriptionData from location.state or current prescriptionData state
              const prevData = existingPrescriptionData || prescriptionData;
              const apiDynamicFields = validatedData?.dynamicFields || {};
              const prevDynamicFields = prevData?.dynamicFields || {};
              const mergedDynamicFields = {
                ...prevDynamicFields,
                ...apiDynamicFields,
              };

              let finalPrescriptionData;
              if (isUpdatingRx && prevData) {
                const hasMeaningfulData = validatedData.symptoms?.length > 0 || 
                                          validatedData.medications?.length > 0 || 
                                          validatedData.vitalsAndBodyComposition || 
                                          Object.keys(validatedData).length > 2;
                
                if (hasMeaningfulData) {
                  finalPrescriptionData = {
                    ...validatedData,
                    medicalHistory: validatedData.medicalHistory || prevData?.medicalHistory || [],
                    dynamicFields: mergedDynamicFields,
                  };
                } else {
                  // Preserve medical history even when there's no meaningful data (matches web version)
                  finalPrescriptionData = {
                    ...(prevData || {}),
                    medicalHistory: prevData?.medicalHistory || validatedData?.medicalHistory || [],
                    dynamicFields: mergedDynamicFields,
                  };
                }
              } else {
                finalPrescriptionData = {
                  ...validatedData,
                  medicalHistory: validatedData.medicalHistory || prevData?.medicalHistory || [],
                  dynamicFields: mergedDynamicFields,
                };
              }

              // Call onDataReady immediately to prevent data loss (not after delay)
              // Prevent duplicate calls using ref
              if (onDataReady && !onDataReadyCalledRef.current) {
                onDataReadyCalledRef.current = true;
                
                // Mark this input as processed
                const currentInputId = audioBlobFromLocation 
                  ? `audio-${audioBlobFromLocation.size || 'unknown'}` 
                  : inputTextFromLocation 
                    ? `text-${inputTextFromLocation.substring(0, 20)}` 
                    : null;
                if (currentInputId) {
                  processedInputRef.current = currentInputId;
                }
                
                // isEditing should be false for new inputs (even if updating Rx)
                // Only true when explicitly editing an existing query, not when adding new input
                // Subsequent inputs to existing Rx should add new queries, not replace
                const isEditing = false; // Always add new queries, never replace (matches web behavior)
                
                onDataReady({
                  prescriptionData: finalPrescriptionData,
                  genRxDetails: genRxDetailsData,
                  fullTranscript: updatedFullTranscript || transcriptText,
                  conversations: conversationData || [],
                  query: newQuery,
                  isEditing: isEditing, // Always false - add new queries, don't replace
                });
                
                // Clear processed input from location.state to prevent reprocessing
                // This prevents duplicate queries when navigating back to Rx Pad
                if (location.state && (audioBlobFromLocation || inputTextFromLocation)) {
                  navigate(location.pathname, {
                    state: {
                      ...location.state,
                      audioBlob: undefined,
                      inputText: undefined,
                      fromVoiceRecording: false,
                    },
                    replace: true,
                  });
                }
              }
          }, transitionMs);
        } else {
          setIsProcessing(false);
          message.error('No prescription data received');
        }
      } else {
        trackEvent("TP_App_Voice_Api_Result", {
          ...getVoiceRxMoengageBasePayload({
            profile,
            userId,
            patientData: patient_data,
            clinic,
            format: "technical",
          }),
          prescriptionUrl: "",
          _id: "",
          voice_failed: true,
          error_message: "Voice API returned unsuccessful response",
          retry_attempts: 0,
          isemptyprescription: true,
          submitId,
          requestId,
          voice_api_latency_ms: voiceApiStartMs ? Date.now() - voiceApiStartMs : 0,
          http_status: response?.statusCode || response?.status || null,
          error_code: "",
          error_type: "api_error",
          rx_modules_filled_count: 0,
          filled_modules: "",
          voicecall: modeForEvent === "ambient" ? 1 : 0,
          timestamp: new Date().toISOString(),
        });
        setIsProcessing(false);
        message.error('Failed to process. Please try again.');
      }
    } catch (error) {
      if (!didTrackVoiceApiSuccess && voiceApiStartMs) {
        trackEvent("TP_App_Voice_Api_Result", {
          ...getVoiceRxMoengageBasePayload({
            profile,
            userId,
            patientData: patient_data,
            clinic,
            format: "technical",
          }),
          prescriptionUrl: "",
          _id: "",
          voice_failed: true,
          error_message: error?.message || "Voice API failed",
          retry_attempts: 0,
          isemptyprescription: true,
          submitId,
          requestId,
          voice_api_latency_ms: Date.now() - voiceApiStartMs,
          http_status: error?.response?.status || null,
          error_code: error?.code || "",
          error_type: error?.response ? "api_error" : "network",
          rx_modules_filled_count: 0,
          filled_modules: "",
          voicecall: modeForEvent === "ambient" ? 1 : 0,
          timestamp: new Date().toISOString(),
        });
      }
      setIsProcessing(false);
      message.error(error?.message || 'Failed to process. Please try again.');
    }
  };

  // Check if prescription is empty (matches web version)
  const isPrescriptionDataEmpty = (data) => {
    if (!data || typeof data !== "object") return true;
    const {
      symptoms,
      medications,
      vitalsAndBodyComposition,
      advice,
      diagnosis,
      examinations,
      followUp,
      labInvestigation,
      labResults,
      medicalHistory,
      vaccinations,
      others,
      dynamicFields,
    } = data;

    const hasSymptoms = Array.isArray(symptoms) && symptoms.length > 0;
    const hasMedications = Array.isArray(medications) && medications.length > 0;
    const hasVitals = vitalsAndBodyComposition && typeof vitalsAndBodyComposition === "object" && Object.keys(vitalsAndBodyComposition).length > 0;
    const hasAdvice = Array.isArray(advice) && advice.length > 0;
    const hasDiagnosis = Array.isArray(diagnosis) && diagnosis.length > 0;
    const hasExaminations = Array.isArray(examinations) && examinations.length > 0;
    const hasFollowUp = typeof followUp === "string" && followUp.trim().length > 0;
    const hasLabInvestigation = Array.isArray(labInvestigation) && labInvestigation.length > 0;
    const hasLabResults = Array.isArray(labResults) && labResults.length > 0;
    const hasMedicalHistory = Array.isArray(medicalHistory) && medicalHistory.length > 0;
    const hasVaccinations = Array.isArray(vaccinations) && vaccinations.length > 0;
    const hasOthers = Array.isArray(others) && others.length > 0;
    const hasDynamicFields = dynamicFields && typeof dynamicFields === "object" && Object.keys(dynamicFields).some(key => {
      const value = dynamicFields[key];
      return Array.isArray(value) && value.length > 0;
    });

    return !(
      hasSymptoms ||
      hasMedications ||
      hasVitals ||
      hasAdvice ||
      hasDiagnosis ||
      hasExaminations ||
      hasFollowUp ||
      hasLabInvestigation ||
      hasLabResults ||
      hasMedicalHistory ||
      hasVaccinations ||
      hasOthers ||
      hasDynamicFields
    );
  };

  // Persist vitals from API response (getGenRx/digitization) and apply ids to prescription (matches desktop)
  const persistVitalsFromApiResponse = useCallback(async (vitalsObject) => {
    if (!vitalsObject || typeof vitalsObject !== 'object') return;
    const hasMeaningfulVitals = Object.values(vitalsObject).some((val) => {
      const s = String(val ?? '').trim();
      return s !== '' && s !== 'undefined' && s !== 'null';
    });
    if (!hasMeaningfulVitals || !patient_data?.patient_unique_id) return;
    if (persistVitalsInFlightRef.current) return;
    persistVitalsInFlightRef.current = true;
    const flow = (isAmbientMode || mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX || genRxDetails?.type === 'ambient') ? 'ambient' : 'voice';
    const today = moment().format('YYYY-MM-DD');
    let tcv_id = 0;
    let tcbc_id = 0;
    let dev_unique_id = 0;
    const patientMatch = listVitalsTodayIds != null && String(listVitalsTodayIds.patient_unique_id) === String(patient_data.patient_unique_id);
    if (patientMatch && listVitalsTodayIds) {
      tcv_id = Number(listVitalsTodayIds.tcv_id ?? 0);
      tcbc_id = Number(listVitalsTodayIds.tcbc_id ?? 0);
      dev_unique_id = Number(listVitalsTodayIds.dev_unique_id ?? 0);
    }
    if (!patientMatch || (tcv_id === 0 && tcbc_id === 0 && dev_unique_id === 0)) {
      try {
        const listPayload = {
          patient_unique_id: patient_data.patient_unique_id,
          pam_id: patient_data.pam_id ?? 0,
          mode: ADD,
          pm_pid: patient_data.pm_pid ?? 0,
          pm_id: patient_data.pm_id ?? 0,
        };
        const list = await dispatch(getVitals(listPayload)).unwrap();
        const existingToday = Array.isArray(list) ? list.find((row) => (row.date || '').toString().startsWith(today)) : null;
        if (existingToday) {
          tcv_id = existingToday.tcv_id ?? 0;
          tcbc_id = existingToday.tcbc_id ?? 0;
          dev_unique_id = existingToday.dev_unique_id ?? 0;
        }
      } catch (_) {
        // proceed with 0 ids
      }
    }
    let systolic = String(vitalsObject.Systolic || vitalsObject.systolic || '').trim();
    let diastolic = String(vitalsObject.Diastolic || vitalsObject.diastolic || '').trim();
    let blood_press = vitalsObject.bloodPressure || vitalsObject.blood_press || '';
    if (blood_press && !systolic && !diastolic) {
      const parts = String(blood_press).split('/');
      if (parts.length >= 2) {
        systolic = parts[0].trim();
        diastolic = parts[1].trim();
      }
    } else if (!blood_press && systolic && diastolic) blood_press = `${systolic}/${diastolic}`;
    if (!systolic || !diastolic) blood_press = '';
    const vitalsArray = [{
      date: today,
      temp: String(vitalsObject.temperature || vitalsObject.temp || '').trim(),
      pres: String(vitalsObject.pulse || vitalsObject.pres || '').trim(),
      resp_rate: String(vitalsObject.respRate || vitalsObject.resp_rate || '').trim(),
      systolic,
      diastolic,
      ...(systolic && diastolic ? { blood_press } : {}),
      spo2: String(vitalsObject.spo2 || vitalsObject.SPO2 || '').trim(),
      height: String(vitalsObject.height || vitalsObject.Height || '').trim(),
      weight: String(vitalsObject.weight || vitalsObject.Weight || '').trim(),
      ofc: String(vitalsObject.ofc || vitalsObject.OFC || '').trim(),
      sugar: String(vitalsObject.sugar || vitalsObject.Sugar || '').trim(),
      general_rbs: String(vitalsObject['General RBS'] || vitalsObject.general_rbs || vitalsObject.generalRBS || vitalsObject.genralRBS || '').trim(),
      fib4: String(vitalsObject.FIB4 || vitalsObject.fib4 || '').trim(),
      waist_circumference: String(vitalsObject['Waist Circumference'] || vitalsObject.waist_circumference || '').trim(),
      bmi: String(vitalsObject.BMI || vitalsObject.bmi || '').trim(),
      bmr: String(vitalsObject.BMR || vitalsObject.bmr || '').trim(),
      bsa: String(vitalsObject.BSA || vitalsObject.bsa || '').trim(),
      tcv_id,
      tcbc_id,
      dev_unique_id,
    }];
    const sendData = {
      patient_unique_id: patient_data.patient_unique_id,
      pm_pid: patient_data.pm_pid ?? 0,
      pm_id: patient_data.pm_id ?? 0,
      pam_id: patient_data.pam_id ?? 0,
      patient_birth_weight: null,
      data: vitalsArray,
    };
    try {
      const addRes = await ApiVitals.addUpdateVitals(sendData);
      if (addRes?.status !== false && addRes?.statusCode !== 400 && addRes?.data?.length) {
        const saved = addRes.data.find((row) => (row.date || '').toString().startsWith(today)) || addRes.data[0];
        const rid = { tcv_id: saved?.tcv_id ?? 0, tcbc_id: saved?.tcbc_id ?? 0, dev_unique_id: saved?.dev_unique_id ?? 0 };
        dispatch(setVitalsIdsFromAddVitals({ flow, patient_unique_id: patient_data.patient_unique_id, ...rid }));
        setPrescriptionData((prev) => ({
          ...prev,
          vitalsAndBodyComposition: { ...(prev.vitalsAndBodyComposition || {}), tcv_id: rid.tcv_id, tcbc_id: rid.tcbc_id, dev_unique_id: rid.dev_unique_id },
        }));
      }
    } catch (_) {
      // addVitals failed
    } finally {
      persistVitalsInFlightRef.current = false;
    }
  }, [patient_data, listVitalsTodayIds, isAmbientMode, mode, genRxDetails?.type, dispatch]);

  // Handle End Visit - matches web version's onEndVisitClick
  const handleEndVisit = async () => {
    if (!prescriptionData) {
      message.error('Prescription data is missing. Please try again.');
      return;
    }

    // Validate prescription is not empty (matches web version)
    if (isPrescriptionDataEmpty(prescriptionData)) {
      message.error('Please fill your prescription to end visit.');
      return;
    }

    setIsEndingVisit(true);
    try {
      // MoEngage: match web ConsultationDrawer onEndVisitClick (TP_AV_SaveRx before save; counts not tracked on mobile pad yet — use 0)
      const isAmbientRx =
        isAmbientMode ||
        mode === 'ambient' ||
        window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX ||
        genRxDetails?.type === 'ambient';
      const rxType = isAmbientRx ? 'ambient' : 'voice_rx';
      const totalAudioDuration = queries
        .filter((query) => query.isAudio && query.duration)
        .reduce((total, query) => {
          const duration =
            typeof query.duration === 'number'
              ? query.duration
              : parseFloat(query.duration) || 0;
          return total + duration;
        }, 0);

      trackEvent('TP_App_AV_SaveRx', {
        patient_id: patient_data?.patient_unique_id || '',
        patient_name: patient_data?.pm_fullname || '',
        patient_mobile_number: patient_data?.pm_contact_no || '',
        doctor_id: profile?.doctor_unique_id,
        user_id: userId,
        doctor_name: profile?.um_name,
        doctor_specialty: profile?.dp_name,
        doctor_mobile_number: profile?.um_contact,
        hm_id: clinic?.hm_id,
        clinic_name: clinic?.hm_name,
        rx_type: rxType,
        no_of_submits_count: 0,
        no_of_typed_messages: 0,
        no_of_times_user_clicked_no_stay: 0,
        no_of_times_user_clicked_cross_button: 0,
        no_of_times_user_clicked_mute_pause_button: 0,
        total_audio_duration_seconds: totalAudioDuration || 0,
        no_of_edits_in_digitization_pad: 0,
      });

      // Step 1: Sanitize medications and get quantities (matches web version)
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

      // Step 2: Update GenRx with quantities (matches web version's handleUpdateGenRX)
      const updatedPrescriptionData = {
        ...prescriptionData,
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

          return {
            ...item,
            quantity,
          };
        }),
      };

      // Step 2: Update prescription via API (only if Voice RX was used - genRxDetails exists)
      // For manual entry (no Voice RX), skip this step and go straight to case manager
      const rxId = genRxDetails?._id || caseManagerData?.smart_prescription_filename;
      if (rxId && typeof rxId === 'string' && rxId.trim()) {
        let updateResponse;
        if (isAmbientMode && genRxDetails?.type === "ambient") {
          updateResponse = await editAmbientRxDetails(
            { editedData: updatedPrescriptionData },
            rxId
          );
        } else {
          updateResponse = await editGenRxDetails(
            { editedData: updatedPrescriptionData },
            rxId
          );
        }

        if (updateResponse.status !== 204 && !updateResponse.success) {
          throw new Error('Failed to update prescription');
        }

        // Update genRxDetails state with the prescription ID to ensure consistency
        if (updateResponse?.data?._id || rxId) {
          setGenRxDetails(prev => ({
            ...prev,
            _id: updateResponse?.data?._id || rxId,
            type: updateResponse?.data?.type || prev?.type || (isAmbientMode ? 'ambient' : 'dictate'),
          }));
        }
      }

      // Step 3: Save case manager data (matches web version)
      // Distinguish between EDIT (came with smart_prescription_filename) vs NEW (created just now)
      const isEditingExistingPrescription = !!caseManagerData?.smart_prescription_filename;
      let tcmId = caseManagerData?.tcm_id;
      
      // Skip case manager update ONLY when editing and tcm_id is missing (undefined/null).
      // Do NOT skip when tcm_id === 0: that is Repeat RX — we must call addCaseManager to create a new visit.
      const tcmIdIsMissing = (tcmId === undefined || tcmId === null);
      if (isEditingExistingPrescription && tcmIdIsMissing) {
        // Prescription is already updated - show success screen to user
        setEndVisitCaseManagerData({
          ...caseManagerData,
          smart_prescription_filename: rxId,
          tcm_id: caseManagerData?.tcm_id,
        });
        setShowEndVisitScreen(true);
        setIsEndingVisit(false);
        message.success('Prescription updated successfully.');
        return;
      }
      
      // Default to 0 for new prescriptions; coerce to number so API always receives numeric tcm_id
      const rawTcmId = tcmId ?? 0;
      tcmId = (rawTcmId !== '' && rawTcmId != null) ? (typeof rawTcmId === 'number' ? rawTcmId : parseInt(rawTcmId, 10)) : 0;
      if (Number.isNaN(tcmId)) tcmId = 0;
      const consultationDate = caseManagerData?.consultation_date || moment().format('YYYY-MM-DD HH:mm:ss');
      const pamId = patient_data?.pam_id || 0;
      const labReportID = caseManagerData?.labReportID || null;

      // Build vitals for case manager (matches desktop: getVitals -> todayVitals -> vitalsForCase)
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
        const today = moment().format('YYYY-MM-DD');
        const todayVitals = Array.isArray(allVitals) ? allVitals.filter((v) => (v.date || '').toString().startsWith(today)) : [];
        const patientInfo = patient_data ? { age: patient_data.ageYears || patient_data.age || patient_data.pm_age, gender: patient_data.pm_gender || patient_data.gender } : {};
        const hasRxPadVitals = updatedPrescriptionData?.vitalsAndBodyComposition && Object.keys(updatedPrescriptionData.vitalsAndBodyComposition).length > 0;

        if (hasRxPadVitals && todayVitals.length > 0) {
          vitalsForCase = todayVitals.map((vitalEntry) => {
            let systolic = String(vitalEntry.blood_press || '').split('/')[0]?.trim() || '';
            let diastolic = String(vitalEntry.blood_press || '').split('/')[1]?.trim() || '';
            const vital = {
              date: today,
              temp: String(vitalEntry.temp || '').trim(),
              pres: String(vitalEntry.pres || '').trim(),
              resp_rate: String(vitalEntry.resp_rate || '').trim(),
              systolic,
              diastolic,
              blood_press: vitalEntry.blood_press || '',
              spo2: String(vitalEntry.spo2 || '').trim(),
              height: String(vitalEntry.height || '').trim(),
              weight: String(vitalEntry.weight || '').trim(),
              ofc: String(vitalEntry.ofc || '').trim(),
              sugar: String(vitalEntry.sugar || '').trim(),
              general_rbs: String(vitalEntry.general_rbs || '').trim(),
              fib4: String(vitalEntry.fib4 || '').trim(),
              waist_circumference: String(vitalEntry.waist_circumference || '').trim(),
              bmi: String(vitalEntry.bmi || '').trim(),
              bmr: String(vitalEntry.bmr || '').trim(),
              bsa: String(vitalEntry.bsa || '').trim(),
              tcv_id: Number(vitalEntry.tcv_id ?? 0),
              tcbc_id: Number(vitalEntry.tcbc_id ?? 0),
              dev_unique_id: Number(vitalEntry.dev_unique_id ?? 0),
              pam_id: patient_data?.pam_id ?? pamId ?? 0,
            };
            return enrichVitalsWithCalculations(vital, patientInfo);
          });
        } else if (hasRxPadVitals) {
          // Match desktop: sanitize then build single vital; ids from prescription first, then listVitalsTodayIds
          const sanitizeVitalsValue = (key, value) => {
            if (key === 'tcv_id' || key === 'tcbc_id' || key === 'dev_unique_id' || key === 'pam_id' || key === 'date') return value;
            if (value === undefined || value === null) return '';
            const str = String(value).trim();
            if (key === 'bloodPressure' || key === 'blood_press') return str.replace(/[^0-9/.-]/g, '').replace(/\/+/g, '/');
            if (key === 'general_rbs' || key === 'General RBS' || key === 'ofc' || key === 'OFC' || key === 'fib4' || key === 'FIB4') return str;
            return str.replace(/[^0-9.-]/g, '');
          };
          const cleanVitals = Object.fromEntries(
            Object.entries(updatedPrescriptionData.vitalsAndBodyComposition || {}).map(([k, v]) => [k, sanitizeVitalsValue(k, v)])
          );
          let systolic = String(cleanVitals.Systolic || cleanVitals.systolic || '').trim();
          let diastolic = String(cleanVitals.Diastolic || cleanVitals.diastolic || '').trim();
          let blood_press = cleanVitals.bloodPressure || cleanVitals.blood_press || '';
          if (blood_press && !systolic && !diastolic) {
            const bpParts = String(blood_press).split('/');
            if (bpParts.length >= 2) { systolic = bpParts[0].trim(); diastolic = bpParts[1].trim(); }
          }
          if (!systolic || !diastolic) blood_press = '';
          else if (!blood_press) blood_press = `${systolic}/${diastolic}`;
          const patientMatch = listVitalsTodayIds != null && String(listVitalsTodayIds.patient_unique_id) === String(patient_data.patient_unique_id);
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
            tcv_id: Number(cleanVitals.tcv_id ?? (patientMatch ? listVitalsTodayIds?.tcv_id : null) ?? 0),
            tcbc_id: Number(cleanVitals.tcbc_id ?? (patientMatch ? listVitalsTodayIds?.tcbc_id : null) ?? 0),
            dev_unique_id: Number(cleanVitals.dev_unique_id ?? (patientMatch ? listVitalsTodayIds?.dev_unique_id : null) ?? 0),
            pam_id: patient_data?.pam_id ?? pamId ?? 0,
          };
          if (systolic && diastolic) rxPadVital.blood_press = blood_press;
          vitalsForCase = [enrichVitalsWithCalculations(rxPadVital, patientInfo)];
        }
        vitalsForCase = vitalsForCase.map((entry) => {
          const cleaned = { ...entry };
          const s = String(cleaned.systolic || '').trim();
          const d = String(cleaned.diastolic || '').trim();
          if (!s || !d) cleaned.blood_press = '';
          return cleaned;
        });
      } catch (err) {
        console.error('Error building vitals for case manager payload:', err);
      }

      // Match web: persist lab results to API and include in case manager payload
      const labResultsDataForApi = formatLabResultsForApi(updatedPrescriptionData?.labResults || prescriptionData?.labResults || []);
      await persistLabResultsToApi(labResultsDataForApi);

      // Match web: format medical history from context for case manager
      let formattedMedicalHistory = [];
      if (medicalHistoryData && Array.isArray(medicalHistoryData) && medicalHistoryData.length > 0) {
        const remarks = medicalHistoryData[0]?.medical_history_remarks;
        formattedMedicalHistory = medicalHistoryData.map((section, index) => ({
          title: section?.title || section?.section_name || '',
          tmmhs_id: section?.tmmhs_id || 0,
          no_know_history: section?.no_know_history !== undefined ? section?.no_know_history : false,
          tags: !section?.no_know_history && Array.isArray(section?.tags)
            ? section.tags.filter((t) => t?.enable === 'Y' || t?.enable === 'N').map((t) => {
                const tagData = {
                  tmmhst_id: t?.tmmhst_id || 0,
                  title: t?.title || '',
                  pms_default: t?.pms_default || 0,
                  since: t?.since || '',
                  status: t?.status || '',
                  medication: t?.medication || '',
                  note: t?.note || '',
                  enable: t?.enable || 'Y',
                  relationship: t?.relationship || '',
                };
                // Add surgical history specific fields if they exist
                if (section?.tmmhs_id === 5 && t?.date) {
                  tagData.date = t.date;
                  tagData.dateType = t?.dateType || 'onlyYear';
                }
                return tagData;
              })
            : [],
          ...(remarks && index === 0 && { medical_history_remarks: remarks.trim() })
        }));
      }

      const sendData = {
        action: tcmId === 0 ? "add" : "edit",
        tcm_id: tcmId,
        patient_unique_id:
          patient_data !== undefined ? patient_data.patient_unique_id : 0,
        pam_id: pamId,
        consultation_date: consultationDate,
        smart_prescription_filename: genRxDetails?._id || rxId,
        labReportID: labReportID,
        ...(vitalsForCase.length > 0 && { vitals: vitalsForCase }),
        ...(formattedMedicalHistory.length > 0 && { medical_history: formattedMedicalHistory }),
        ...(labResultsDataForApi.length > 0 && { labParamsData: labResultsDataForApi }),
      };

      const action =
        tcmId == 0
          ? await dispatch(addCaseManager(sendData))
          : await dispatch(editCaseManager(sendData));

      if (action.meta.requestStatus === "fulfilled") {
        dispatch(clearListVitalsToday());
        
        // Credit deduction logic (matches desktop ConsultationDrawer)
        const useVoiceRx = !!(genRxDetails?._id || rxId); // Voice Rx was used if we have prescription ID
        const useDDX = !!(prescriptionData?.ddxUsed); // DDx billing only when DDx workflow was explicitly used (not on diagnosis.length)
        
        if (!isFreeVoiceRxUser && useVoiceRx) {
          const sendData = {
            b2c_id: profile?.b2c,
            service_name: S_VOICE_RX,
          };
          dispatch(updateCredits(sendData));
        }
        
        if (useDDX) {
          const sendData = {
            b2c_id: profile?.b2c,
            service_name: S_DDX,
          };
          dispatch(updateCredits(sendData));
        }
        
        // Note: services list is automatically refreshed by updateCredits thunk
        
        // Use numeric tcm_id from addCaseManager/editCaseManager; viewCaseManager expects number
        const fromPayload = action?.payload?.tcm_id ?? tcmId;
        const numericTcmId = typeof fromPayload === 'number' ? fromPayload : parseInt(fromPayload, 10);
        endVisitTcmIdRef.current = Number.isNaN(numericTcmId) ? tcmId : numericTcmId;

        // Show styled success message (matches web version)
        message.open({
          key: MESSAGE_KEY,
          type: "",
          className: "message-appointment",
          content: (
            <div className="d-flex align-items-center">
              <img src={visitEndIcon} className="me-3" alt="Visit End Icon" />
              <div>
                <div className="title-common-digitised text-start fontroboto">
                  {`${patient_data?.pm_first_name || 'Patient'}'s visit ended successfully.`}
                </div>
              </div>
              <img
                src={closeVisitIcon}
                className="ms-3"
                alt="Close Visit Icon"
                onClick={() => message.destroy(MESSAGE_KEY)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          ),
          duration: 5,
        });

        const clinic_name = getClinicName(profile?.hospital_data);
        const deviceSdkData = getDeviceSdkData();
        const tokenData = getTokenData();
        trackEvent('TP_App_Voice_Submit', {
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
        
        // Fetch updated case (viewCaseManager) then set endVisitCaseManagerData.
        // Use endVisitTcmIdRef so viewCaseManager always gets numeric tcm_id; override tcm_id in state so Edit/Repeat never see viewCaseManager's string tcm_id.
        setTimeout(async () => {
          try {
            const viewAction = await dispatch(viewCaseManager({
              patient_unique_id: patient_data?.patient_unique_id || 0,
              tcm_id: endVisitTcmIdRef.current,
            }));
            const base = (viewAction.meta.requestStatus === 'fulfilled' && viewAction.payload)
              ? viewAction.payload
              : action.payload;
            setEndVisitCaseManagerData({
              ...base,
              tcm_id: endVisitTcmIdRef.current,
              smart_prescription_filename: base?.smart_prescription_filename || genRxDetails?._id,
            });
          } catch (error) {
            setEndVisitCaseManagerData({
              ...(action.payload || {}),
              tcm_id: endVisitTcmIdRef.current,
              smart_prescription_filename: action.payload?.smart_prescription_filename || genRxDetails?._id,
            });
          }
          setShowEndVisitScreen(true);
          setIsEndingVisit(false);
        }, 2000);
      } else {
        throw new Error(action.error || 'Failed to save case manager data');
      }
    } catch (error) {
      message.error(error?.message || 'Failed to end visit. Please try again.');
    } finally {
      setIsEndingVisit(false);
    }
  };

  // Get print URL from endVisitCaseManagerData or caseManagerData
  const getPrintUrl = () => {
    if (endVisitCaseManagerData?.print_url) {
      return endVisitCaseManagerData.print_url;
    }
    if (endVisitCaseManagerData?.print_rx_url) {
      return endVisitCaseManagerData.print_rx_url;
    }
    if (caseManagerData?.print_url) {
      return caseManagerData.print_url;
    }
    if (caseManagerData?.print_rx_url) {
      return caseManagerData.print_rx_url;
    }
    return null;
  };

  // Get tcm_id: prefer numeric id from addCaseManager/editCaseManager (ref) so viewCaseManager never receives string.
  // Never return NaN so downstream (MobileEndVisitScreen) never sends invalid id.
  const getTcmId = () => {
    if (endVisitTcmIdRef.current != null) {
      return endVisitTcmIdRef.current;
    }
    if (endVisitCaseManagerData?.tcm_id != null) {
      const id = endVisitCaseManagerData.tcm_id;
      if (typeof id === 'number' && !Number.isNaN(id)) return id;
      const parsed = parseInt(id, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return caseManagerData?.tcm_id ?? genRxDetails?._id ?? null;
  };

  return (
    <>
      <Drawer
        placement="bottom"
        onClose={onClose}
        open={visible && !showEndVisitScreen}
        height="100%"
        className="mobile-rx-pad-drawer"
        closable={false}
        maskClosable={false}
        destroyOnClose
      >
      <div className="mobile-rx-pad-container">
        <div className="mobile-rx-pad-header">
          <div className="rx-pad-title-section">
            <img src={documentNormalSvg} alt="Rx Pad" className="rx-pad-icon" />
            <span className="rx-pad-title">Rx Pad</span>
            {!isFreeVoiceRxUser && (
              <FreeTrialButton
                title={S_VOICE_RX}
                showHideSubModal={showHideSubModal}
              />
            )}
            <button 
              className="rx-pad-info-button" 
              onClick={() => setShowInfoBottomSheet(true)}
              type="button"
              aria-label="Info"
            >
              <img src={infoIcon} alt="Info" className="rx-pad-info-icon" />
            </button>
          </div>
          <button className="rx-pad-close-button" onClick={onClose} type="button">
            <img src={minimiseIcon} alt="Minimise" className="rx-pad-close-icon" />
          </button>
        </div>

        <div className="mobile-rx-pad-content">
          {isProcessing ? (
            <MobileRxPadProcessing isProcessing={isProcessing} />
          ) : showSkeleton ? (
            <MobileRxPadSkeleton />
          ) : prescriptionData ? (
            <MobileRxPadContent 
              prescriptionData={prescriptionData}
              onUpdate={(updatedData) => {
                setPrescriptionData(updatedData);
              }}
              onEditWithVoice={(section) => {
                // Quick Edit: save state and close pad
                // In Voice RX flow: closes pad and shows Consultation Summary
                // In fromWalkInMobile: closes pad and returns to normal prescription view
                if (onQuickEdit) {
                  onQuickEdit({
                    prescriptionData,
                    genRxDetails,
                    fullTranscript,
                    conversations,
                    queries,
                  });
                }
                // Always close the pad after Quick Edit (works for both Voice RX and fromWalkInMobile)
                if (onClose) {
                  onClose();
                }
              }}
              onEndVisit={handleEndVisit}
              isProcessing={isProcessing}
              endVisitLoading={isEndingVisit}
              isPrescriptionEmpty={isPrescriptionDataEmpty(prescriptionData)}
              patient_data={patient_data}
              caseManagerData={caseManagerData}
              isVoiceAmbientFlow={true}
              vitalsFlow={isAmbientMode || mode === 'ambient' ? 'ambient' : 'voice'}
            />
          ) : null}
        </div>
      </div>
    </Drawer>

    {/* End Visit Screen */}
    <MobileEndVisitScreen
      visible={showEndVisitScreen}
      onClose={() => {
        endVisitTcmIdRef.current = null;
        setShowEndVisitScreen(false);
        onClose();
      }}
      prescriptionData={prescriptionData}
      genRxDetails={genRxDetails}
      patient_data={patient_data}
      tcm_id={getTcmId()}
      print_url={getPrintUrl()}
      isAmbientRx={isAmbientMode}
      caseManagerData={endVisitCaseManagerData || caseManagerData}
    />

    {/* Info Bottom Sheet */}
    <RxPadInfoBottomSheet
      visible={showInfoBottomSheet}
      onClose={() => setShowInfoBottomSheet(false)}
    />

    {/* Credit/Trial Modal */}
    {!isFreeVoiceRxUser && visible && (
      <ExpiredSubModal
        title={S_VOICE_RX}
        styles={{
          overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1050,
          },
        }}
        isSubModalOpen={isSubModalOpen}
        showHideSubModal={showHideSubModal}
      />
    )}
    </>
  );
}

export default MobileRxPad;


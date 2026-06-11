import React, { useCallback, useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal, Drawer, message } from "antd";
import GenRxKnowMore from "../components/GenRxKnowMore";
import ProfilePopover from "../common/ProfilePopover";
import PatientSummary from "../components/PatientSummary";
import VoiceWaveVisualizer from "../components/WaveVisualizer";

import styles from "./VoiceRxConsult.module.scss";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { getClinic, getClinicName, getDeviceSdkData, getTokenData, isVoiceRxFree, getSupportedMimeType, errorMessage, stopAllActiveRecorders } from "../utils/utils";
import { useSelector, useDispatch } from "react-redux";
import { FAILED_VERIFICATION, FREE, GB_VOICE_RX_FREE, S_AMBIENT_VOICE_RX, S_VOICE_RX } from "../utils/constants";
import FreeTrialButton from "../pages/monetization/components/FreeTrialButton";
import ExpiredSubModal from "../pages/monetization/components/ExpiredSubModal";
import { fetchSymptomsCollectorData } from "../api/services/ApiGenRx";
import { setShowSCPopup, setSymptomCollector } from "../redux/ddxSlice";
import SCPopup from "../components/SCPopup";
import { getDecodedToken } from "../utils/localStorage";
import CommonModal from "../common/CommonModal";
import { checkCredits } from "../redux/monetizationSlice";
import { services, setB2C_Profile } from "../redux/doctorsSlice";
import { fetchSubscriptionDetails } from "../redux/subscriptionSlice";
import { resetVitalsState } from "../redux/vitalsSlice";
import { ASSETS } from "../assets";
const {
  tutorial,
  check: checkIcon,
  close: closeIcon,
  voiceModeDictation,
  voiceMode2,
  dictateActive: dictateActiveIcon,
  ambientModeActive: ambientActiveIcon,
  stopIcon,
  microphone2: muteIcon,
  mutedMicrophoneIcon,
  vitalsIcons,
  alerticon: alertIcon,
  textBox: startConsultImg,
} = ASSETS.images;

const VoiceRxConsult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { profile, userId, servicesList, servicesLoading } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const { showSCPopup } = useSelector((state) => state.ddx);
  const AI_planDetails = servicesList?.find(e => e.service_name === S_VOICE_RX)
  
  const { patient_data, isFromTabView , autoOpenModal, fromPrescription } = location.state || {};
  const decodedToken = getDecodedToken();
  const clinicId = decodedToken?.result?.clinic_id;
  
  const [popOverVideo, setPopOverVideo] = useState(false);
  const [isVoiceRxModalOpen, setIsVoiceRxModalOpen] = useState(autoOpenModal || false);
  const [showWelcome, setShowWelcome] = useState(!autoOpenModal);
  const [consentChecked, setConsentChecked] = useState(true);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showQuitRecordingModal, setShowQuitRecordingModal] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const savedChunksRef = useRef([]);
  const savedRecordingTimeRef = useRef(0);
  const noStayClickCountRef = useRef(0);
  const crossButtonClickCountRef = useRef(0);
  const mutePauseButtonClickCountRef = useRef(0);
  const consentRef = useRef(null);
  const quitFromBackRef = useRef(false);

  const VOICE_RX_planDetails = servicesList?.find(
    (service) => service.service_name === S_VOICE_RX
  );
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const tokenData = getTokenData();
  const clinic = getClinic(profile?.hospital_data);
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");

  const isVoiceRxCreditExpired =
    !isFreeVoiceRxUser &&
    (VOICE_RX_planDetails?.plan_tier === FAILED_VERIFICATION ||
      (VOICE_RX_planDetails?.plan_tier === FREE &&
        VOICE_RX_planDetails?.credit_balance <= 0));

  useEffect(() => {
    if (!planDetails && !isReceptionist) {
      dispatch(fetchSubscriptionDetails());
    }
  }, [planDetails, dispatch]);

  useEffect(() => {
    if (profile && !profile?.b2c && planDetails?.profile_b2c && !isReceptionist) {
      dispatch(setB2C_Profile(planDetails.profile_b2c));
    }
  }, [profile, profile?.b2c, planDetails?.profile_b2c, dispatch]);

  useEffect(() => {
    const b2c = profile?.b2c ?? planDetails?.profile_b2c;
    if (b2c && !isReceptionist) {
      dispatch(services(b2c));
    }
  }, [profile?.b2c, planDetails?.profile_b2c, dispatch]);

  useEffect(() => {
    if (
      !servicesLoading &&
      VOICE_RX_planDetails !== undefined &&
      (VOICE_RX_planDetails?.plan_tier === FREE ||
        VOICE_RX_planDetails?.plan_tier === FAILED_VERIFICATION)
    ) {
      const timer = setTimeout(() => {
        setIsSubModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [VOICE_RX_planDetails, servicesLoading]);

  const getSymptomsCollectorData = useCallback(async () => {
    if (!patient_data?.patient_unique_id || !userId || !clinicId) {
      return;
    }
    
    const payload = {
      um_id: String(userId),
      patient_unique_id: String(patient_data?.patient_unique_id),
      hm_id: String(clinicId),
      pam_id: patient_data?.pam_id ? String(patient_data.pam_id) : 0,
    };
    
    try {
      const response = await fetchSymptomsCollectorData(payload);
      if (response && Object.keys(response)?.length > 0) {
        dispatch(
          setSymptomCollector({
            ...response?.summary_json_doctor,
            _id: response?._id,
          })
        );
        if (patient_data?.pam_status === "0" && (isFreeVoiceRxUser || (AI_planDetails?.credit_balance ?? 1) > 0)) {
          dispatch(setShowSCPopup(true));
        }
      }
    } catch (error) {
      console.error("Error fetching symptoms collector data:", error);
    }
  }, [patient_data, userId, clinicId, dispatch, isFreeVoiceRxUser, AI_planDetails?.credit_balance]);

  useEffect(() => {
    getSymptomsCollectorData();
  }, [getSymptomsCollectorData]);

  const cleanupRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping recorder:', err);
      }
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    savedChunksRef.current = [];
    savedRecordingTimeRef.current = 0;
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setSelectedMode('');
    window.mediaRecorderRef = null;
    window.audioStreamRef = null;
  }, []);

  useEffect(() => {
    return () => {
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
    };
  }, []);

  // Voice Rx flow: clear vitals state when leaving the page (back/leave)
  useEffect(() => {
    return () => {
      dispatch(resetVitalsState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording, isPaused]);

  const showHideVideoListPopover = () => {
    setPopOverVideo(!popOverVideo);
  };

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen((prev) => !prev);
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
  }, [profile, tokenData]);

  const handleBack = () => {
    quitFromBackRef.current = true;
    setShowQuitRecordingModal(true);
  };

  const handleStartConsultation = () => {
    if (isVoiceRxCreditExpired) {
      showHideSubModal();
      return;
    }
    setIsVoiceRxModalOpen(true);
  };

  const handleModalClose = () => {
    setIsVoiceRxModalOpen(false);
    setShowWelcome(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleStartRecording = async () => {
    const shouldResetTime = audioChunksRef.current.length === 0;
    if (shouldResetTime) {
      setRecordingTime(0);
    } else {
      setRecordingTime(savedRecordingTimeRef.current);
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mimeType = getSupportedMimeType();
      mediaRecorderRef.current = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        message.error("Recording error occurred. Please try again.");
      };

      try {
        mediaRecorderRef.current.start();
        setIsRecording(true);
        window.mediaRecorderRef = mediaRecorderRef;
        window.audioStreamRef = audioStreamRef;
      } catch (startError) {
        console.error("Error starting MediaRecorder:", startError);
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        message.error("Unable to start recording. Please try again.");
      }
    } catch (error) {
      console.error("Error accessing microphone:", error);
      message.error("Unable to access microphone");
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
    }
  };

  const handleCancelRecordingClick = () => {
    if (isRecording || isPaused) {
      crossButtonClickCountRef.current += 1;
    }
    quitFromBackRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    savedChunksRef.current = [...audioChunksRef.current];
    savedRecordingTimeRef.current = recordingTime;
    setIsPaused(true);
    setShowQuitRecordingModal(true);
  };

  const handleQuitRecording = () => {
    setShowQuitRecordingModal(false);
    if (quitFromBackRef.current) {
      quitFromBackRef.current = false;
      if (fromPrescription && patient_data) {
        navigate("/prescription", { state: { patient_data } });
      } else {
        navigate("/", { replace: true });
      }
    } else {
      cleanupRecording();
    }
  };

  const handleStayRecording = async () => {
    noStayClickCountRef.current += 1;
    setShowQuitRecordingModal(false);
    if (quitFromBackRef.current) {
      quitFromBackRef.current = false;
      return;
    }
    audioChunksRef.current = [...savedChunksRef.current];
    setRecordingTime(savedRecordingTimeRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } catch (error) {
        console.error('Error resuming recording:', error);
        await handleStartRecording();
      }
    } else if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      await handleStartRecording();
    }
  };

  const handlePauseResume = () => {
    if (isRecording || isPaused) {
      mutePauseButtonClickCountRef.current += 1;
    }
    
    if (!mediaRecorderRef.current) {
      if (isRecording) {
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
      }
      return;
    }
    
    try {
      const currentState = mediaRecorderRef.current.state;
      
      if (currentState === 'inactive' && isRecording) {
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        return;
      }
      
      if (isPaused) {
        if (currentState === 'paused') {
          mediaRecorderRef.current.resume();
          setIsPaused(false);
        } else if (currentState === 'inactive') {
          setIsRecording(false);
          setIsPaused(false);
          setRecordingTime(0);
        }
      } else {
        if (currentState === 'recording') {
          mediaRecorderRef.current.pause();
          setIsPaused(true);
        } else if (currentState === 'inactive') {
          setIsRecording(false);
          setIsPaused(false);
          setRecordingTime(0);
        }
      }
    } catch (error) {
      console.error('Error pausing/resuming recording:', error);
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
    }
  };

  const handleSend = async () => {
    if (!isFreeVoiceRxUser && VOICE_RX_planDetails?.plan_tier === FREE && VOICE_RX_planDetails?.credit_balance <= 0) {
      showHideSubModal();
      return;
    }
    if (!isFreeVoiceRxUser && VOICE_RX_planDetails?.plan_tier === FAILED_VERIFICATION) {
      showHideSubModal();
      return;
    }

    let sendData = {
      b2c_id: profile?.b2c ?? planDetails?.profile_b2c,
      service_name: S_VOICE_RX,
    };
    const action = await dispatch(checkCredits(sendData));
    if (action.meta.requestStatus === "fulfilled") {
      if (action?.payload?.hasOwnProperty("service_name")) {
        if (!isFreeVoiceRxUser && action?.payload?.plan_tier === FREE && action?.payload?.credit_balance <= 0) {
          if (action?.payload?.credit_balance !== VOICE_RX_planDetails?.credit_balance) {
            await dispatch(services(sendData?.b2c_id));
          }
          showHideSubModal();
          return;
        }
        if (!isFreeVoiceRxUser && action?.payload?.plan_tier === FAILED_VERIFICATION) {
          showHideSubModal();
          return;
        }
      } else {
        typeof action?.payload?.data?.error === "object"
          ? errorMessage(action?.payload?.data?.error?.description)
          : errorMessage(action?.payload?.data?.message);
        return;
      }
    } else {
      errorMessage(action?.payload?.message || action?.error || "An error occurred");
      return;
    }

    try {
      window.Moengage.track_event("TP_AV_Submit", {
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
        mode: selectedMode,
      });

      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);

      let blob;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        blob = await new Promise((resolve) => {
          const finalize = () => {
            const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const createdBlob = new Blob(audioChunksRef.current, { type: mimeType });
            resolve(createdBlob);
          };
          const originalOnStop = mediaRecorderRef.current.onstop;
          mediaRecorderRef.current.onstop = () => {
            if (typeof originalOnStop === 'function') originalOnStop();
            finalize();
          };
          mediaRecorderRef.current.stop();
        });
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
      } else {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
      }

      stopAllActiveRecorders();
      window.mediaRecorderRef = null;
      window.audioStreamRef = null;

      if (!blob || blob.size === 0) {
        message.error('No audio captured. Please try again.');
        return;
      }

      const activeMode = selectedMode || 'dictation';
      const activeService = activeMode === 'ambient' ? S_AMBIENT_VOICE_RX : S_VOICE_RX;
      window.TATVA_ACTIVE_VOICE_SERVICE = activeService;

      const audioUrl = URL.createObjectURL(blob);
      const arrayBuffer = await blob.arrayBuffer();
      const activeMicLabel =
        audioStreamRef.current?.getAudioTracks?.()?.[0]?.label || "Unknown";

      navigate('/prescription', {
        state: {
          patient_data,
          fromVoiceRecording: true,
          audioBlob: blob,
          audioBlobUrl: audioUrl,
          micBeingUsed: activeMicLabel,
          consent: consentRef.current,
          audioBlobArrayBuffer: arrayBuffer,
          mode: activeMode,
          noStayClickCount: noStayClickCountRef.current,
          crossButtonClickCount: crossButtonClickCountRef.current,
          mutePauseButtonClickCount: mutePauseButtonClickCountRef.current
        }
      });
    } catch (err) {
      console.error('Error sending recording:', err);
      message.error('Failed to send recording');
    }
  };

  const handleDictationMode = () => {
    window.Moengage.track_event("TP_AV_StartDictate", {
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
    setSelectedMode('dictation');
    setIsVoiceRxModalOpen(false);
    setShowWelcome(true);
    setTimeout(() => {
      handleStartRecording();
    }, 300);
  };

  const handleAmbientMode = async () => {
    if (!consentChecked) {
      alert("Please confirm patient consent before proceeding");
      return;
    }
    window.Moengage.track_event("TP_AV_StartConversation", {
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
    
    let userIp = '';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      userIp = ipData.ip || '';
    } catch (error) {
      console.error('Error fetching IP address:', error);
    }
    
    const consentData = {
      timestamp: Date.now(),
      ip: userIp,
      given: true
    };
    consentRef.current = consentData;
    
    setSelectedMode('ambient');
    setIsVoiceRxModalOpen(false);
    setShowWelcome(true);
    setTimeout(() => {
      handleStartRecording();
    }, 300);
  };

  const handleGenRx = () => {
    setSelectedMode('dictation');
    setIsVoiceRxModalOpen(false);
    setShowWelcome(true);
    setTimeout(() => {
      handleStartRecording();
    }, 300);
  };

  const startPrefilledVoiceRx = useCallback(
    (voicePayload, targetMode = "dictation") => {
      if (!voicePayload || !patient_data) return;
      try {
        const payloadString = JSON.stringify(voicePayload);
        if (typeof window !== "undefined") {
          window.TATVA_ACTIVE_VOICE_SERVICE =
            targetMode === "ambient" ? S_AMBIENT_VOICE_RX : S_VOICE_RX;
        }
        const clinic_name = getClinicName(profile?.hospital_data);
        window.Moengage?.track_event(
          targetMode === "ambient"
            ? "TP_AV_SC_Autofill_Ambient"
            : "TP_AV_SC_Autofill_Voice",
          {
            patient_id: patient_data?.patient_unique_id || "",
            patient_name: patient_data?.pm_fullname || "",
            doctor_id: profile?.doctor_unique_id,
            user_id: userId,
            doctor_name: profile?.um_name,
            doctor_specialty: profile?.dp_name,
            hm_id: clinic?.hm_id,
            clinic_name,
          }
        );
        dispatch(setShowSCPopup(false));
        navigate("/prescription", {
          state: {
            patient_data,
            inputText: payloadString,
            mode: targetMode,
            isFromTabView: isFromTabView || false,
          },
        });
      } catch (error) {
        console.error("Error launching Voice Rx with symptom collector data:", error);
      }
    },
    [clinic?.hm_id, dispatch, isFromTabView, navigate, patient_data, profile, userId]
  );

  return (
    <div className={styles.voiceRxConsultPage}>
      <div className={styles.header}>
        <div className={styles.leftSection}>
          <div className={styles.backButtonContainer}>
            <div
              onClick={handleBack}
              className="btn-headerback align-items-center d-flex h-100 justify-content-center cursor-pointer"
            >
              <i className="icon-right"></i>
            </div>
          </div>
          <ProfilePopover 
            locationPath="/voice-rx-consult"
            patient_data={patient_data}
            isPrescriptionPage={true}
          />
          {selectedMode && (
            <div className={styles.modeIndicator}>
              {selectedMode === 'dictation' ? (
                <>
                  <img src={dictateActiveIcon} alt="Dictate mode" className={styles.modeIcon} />
                  <span className={styles.modeText}>Dictate Mode</span>
                </>
              ) : (
                <>
                  <img src={ambientActiveIcon} alt="Conversation mode" className={styles.modeIcon} />
                  <span className={styles.modeText}>Conversation Mode</span>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.rightSection}>
          {!isFreeVoiceRxUser && (
            <FreeTrialButton
              title={S_VOICE_RX}
              showHideSubModal={showHideSubModal}
            />
          )}
          <button className={styles.tutorialButton} onClick={showHideVideoListPopover}>
              <span className={styles.tutorialButtonContent}>
                <img height={42} src={tutorial} alt="Tutorial" />
                Tutorial
              </span>
            </button>
        </div>
      </div>

      <div className={styles.mainContent}>
        {showWelcome && (
          <>
            <div className={styles.welcomeSection}>
              <div className={styles.greeting}>
                <span className={styles.greetingText}>Hi, Doctor</span>
                <span className={styles.greetingEmoji}>&nbsp;👋</span>
              </div>
              <div className={styles.title}>Start Your Consultation!</div>
              <div className={styles.description}>
                Simply by <strong>dictating the Rx</strong> or by <strong>capturing your conversation with the
                patient</strong>. I'll transcribe & structure the <strong>Rx automatically!</strong>
              </div>
            </div>
            <div className={styles.patientSummaryWrapper}>
              <PatientSummary patientData={patient_data} hideSymptomsBanner={!isFreeVoiceRxUser && AI_planDetails?.credit_balance === 0} />
            </div>
            {isRecording ? (
              <div className={styles.bottomCenterBar}>
                <div className={styles.recBar}>
                  <button className={styles.deleteButton} onClick={handleCancelRecordingClick}>
                    <img src={stopIcon} alt="stop" className={styles.stopIcon} />
                  </button>
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
                  <div className={styles.timeLabel}>{formatTime(recordingTime)}</div>
                  <div className={styles.waveArea}>
                    <VoiceWaveVisualizer isRecording={isRecording} isPaused={isPaused} />
                  </div>
                  <button className={styles.sendCta} onClick={handleSend}>
                    <img src={vitalsIcons} alt="Submit" className={styles.vitalsIcon} />
                  </button>
                </div>
                <div className={styles.listeningSection}>
                  <div className={styles.gradientEllipse}></div>
                  <div className={styles.listeningText}>
                    {isPaused ? "Unmute to Continue Recording" : "I'm Listening..."}
                  </div>
                </div>
              </div>
            ) : (
            <div className={styles.inputSection}>
              <div className={styles.inputContainer}>
                <img
                  src={startConsultImg}
                  alt="Start Consultation"
                  style={{
                    cursor: isVoiceRxCreditExpired ? 'not-allowed' : 'pointer',
                    opacity: isVoiceRxCreditExpired ? 0.6 : 1
                  }}
                  onClick={handleStartConsultation}
                />
              </div>
            </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={isVoiceRxModalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={775}
        centered
        className={styles.voiceRxModal}
        title={<span className={styles.modalTitleText}>Choose the Voice Rx mode</span>}
        closeIcon={<img src={closeIcon} alt="Close" className={styles.closeIconImg} />}
      >
        <div className={styles.modalContent}>
          <div className={styles.modeCards}>
            <div className={styles.modeCard}>
              <div className={styles.cardIcon}>
                <div className={styles.iconBackground}>
                  <img src={voiceModeDictation} alt="Dictation icon" width={72} height={72} />
                </div>
              </div>
              <h3 className={styles.cardTitle}>Dictation Mode</h3>
              <p className={styles.cardDescription}>
                Dictate your prescription or Clinical notes directly here. I'll transcribe & structur it into the Rx Pad automatically!
              </p>
              <button className={styles.modeButton} onClick={handleDictationMode}>
                  <i className="icon-mic"></i>
                Start Dictation
              </button>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.cardIcon}>
                <div className={styles.iconBackground}>
                  <img src={voiceMode2} alt="Ambient icon" width={72} height={72} />
                </div>
              </div>
              <h3 className={styles.cardTitle}>Conversation Mode</h3>
              <p className={styles.cardDescription}>
                Capture your <strong>live conversation</strong> with the patient. I'll listen in the background and <strong>transcribe & structure</strong> it into the <strong>Rx Pad</strong> automatically!
              </p>
              <div className={styles.consentContainer}>
                <div className={styles.consentCheckbox}>
                  <span
                    className={`${styles.checkBox} ${consentChecked ? styles.checked : ''}`}
                    onClick={() => {
                      setConsentChecked(!consentChecked);
                       window.Moengage.track_event("TP_AV_StartDictate", {
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
                         status: consentChecked ? "enabled" : "disabled",
                       });
                    }}
                    role="checkbox"
                    aria-checked={consentChecked}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setConsentChecked(!consentChecked); }}
                  >
                    {consentChecked && (
                      <img src={checkIcon} alt="Checked" width={18} height={18} />
                    )}
                  </span>
                  <span className={styles.consentText} onClick={() => setConsentChecked(!consentChecked)}>
                    <span className={styles.confirmText}>I confirm</span> that I've taken the <strong>patient's consent</strong> before recording.
                  </span>
                </div>
              </div>
              <button 
                className={styles.modeButton} 
                onClick={handleAmbientMode}
                disabled={!consentChecked}
              >
                  <i className="icon-mic"></i>
                Start Conversation
              </button>
            </div>
          </div>
          <div className={styles.disclaimerText}>*These conversations help us improve accuracy and your overall experience.</div>
        </div>
      </Modal>

      {!isFreeVoiceRxUser && AI_planDetails?.service_type === "ai" && ([0 ,1, 2, 5].includes(AI_planDetails?.credit_balance)) && (
        <ExpiredSubModal
          title={S_VOICE_RX}
          styles={{
            mask: {
              marginLeft: 0,
              marginTop: 60,
              background: "rgba(0, 0, 0, 0.28)",
              backdropFilter: "blur(2px)",
            },
            wrapper: {
              marginLeft: 0,
              marginTop: 60,
              background: "rgba(0, 0, 0, 0.28)",
            },
          }}
          isSubModalOpen={isSubModalOpen}
          showHideSubModal={showHideSubModal}
        />
      )}

      <Drawer
        placement="right"
        width={window.innerWidth ? Math.min(window.innerWidth * 0.8, 1200) : 1200}
        closeIcon={null}
        destroyOnClose
        maskClosable
        open={popOverVideo}
        onClose={showHideVideoListPopover}
        bodyStyle={{ padding: 0, height: '100%', overflow: 'hidden' }}
      >
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <GenRxKnowMore handleGenRxKnowMore={showHideVideoListPopover} />
        </div>
      </Drawer>

      {showSCPopup && (isFreeVoiceRxUser || AI_planDetails?.credit_balance !== 0) && (
        <SCPopup
          handlePopup={() => dispatch(setShowSCPopup(false))}
          handleGenRx={handleGenRx}
          onVoiceAutofill={(payload) => startPrefilledVoiceRx(payload, "dictation")}
          onAmbientAutofill={(payload) => startPrefilledVoiceRx(payload, "ambient")}
        />
      )}

      <CommonModal
        isModalOpen={showQuitRecordingModal}
        onCancel={handleStayRecording}
        modalWidth={480}
        title={'Are you sure you want to quit?'}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-3 d-flex align-items-center mb-4">
              <img src={alertIcon} alt="Warning" className="me-3" />
              <span>
                If you quit, all progress in this session will be lost and you'll need to start over.
              </span>
            </div>
            <div className="d-flex justify-content-end align-items-center">
              <button
                type="button"
                className={`btn btn-link text-decoration-underline ms-4 ${styles.quitButton}`}
                onClick={handleQuitRecording}
                style={{ color: 'red' }}
              >
                Yes, Quit
              </button>
              <button
                type="button"
                className={`btn btn-primary3 btn-41 px-4 ${styles.stayButton}`}
                onClick={handleStayRecording}
                style={{ color: 'white' }}
              >
                No, Stay
              </button>
            </div>
          </>
        }
      />
  </div>
);
};

export default VoiceRxConsult;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { message, Drawer } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import VoiceWaveVisualizer from '../../../components/WaveVisualizer';
import ExpiredSubModal from '../../monetization/components/ExpiredSubModal';
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import {
  errorMessage,
  getClinic,
  getClinicName,
  getSupportedMimeType,
  getVoiceRxMoengageBasePayload,
  isVoiceRxFree,
} from '../../../utils/utils';
import { S_AMBIENT_VOICE_RX, S_VOICE_RX, FREE, FAILED_VERIFICATION, GB_VOICE_RX_FREE } from '../../../utils/constants';
import { useVoiceRxNavigation } from '../../../utils/voiceRxNavigation';
import { checkCredits } from '../../../redux/monetizationSlice';
import { services } from '../../../redux/doctorsSlice';
import PatientDetailsBottomSheet from '../../../components/mobile/PatientDetailsBottomSheet';
import './MobileVoiceRecording.scss';
import { ASSETS } from "../../../assets";
const {
  arrowLeft: arrowLeftIcon,
  userGray: userGrayIcon,
  imageBackground,
  ddx: ddxIcon,
  close2_2: close2Icon,
  microphone3: muteIcon,
} = ASSETS.mobile;
const mutedMicrophoneIcon = ASSETS.images.mutedMicrophoneIcon;
const frame2Icon = ASSETS.mobile.frame2;
const {
  dictateActive: dictateActiveIcon,
  ambientModeActive: ambientActiveIcon,
} = ASSETS.images;

function MobileVoiceRecording() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigateVoiceRx = useVoiceRxNavigation();
  const dispatch = useDispatch();
  const { profile, userId, servicesList } = useSelector((state) => state.doctors);

  const VOICE_RX_planDetails = servicesList?.find(
    (e) => e.service_name === S_VOICE_RX
  );
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);

  const [selectedMode, setSelectedMode] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showQuitRecordingModal, setShowQuitRecordingModal] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [showPatientSummary, setShowPatientSummary] = useState(true);
  const [floatingBadgeVisible, setFloatingBadgeVisible] = useState(true);
  const [patientSheetOpen, setPatientSheetOpen] = useState(false);

  const contentRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  const patient_data = location.state?.patient_data || {};
  const mode = location.state?.mode || '';
  const isFromTabView = location.state?.isFromTabView || false;
  const consent = location.state?.consent || null;
  const existingPrescriptionData = location.state?.existingPrescriptionData || null;
  const existingGenRxDetails = location.state?.existingGenRxDetails || null;
  const caseManagerData = location.state?.caseManagerData || null;

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const hasAutoStartedRef = useRef(false);
  const savedChunksRef = useRef([]);
  const savedRecordingTimeRef = useRef(0);
  const noStayClickCountRef = useRef(0);
  const crossButtonClickCountRef = useRef(0);
  const mutePauseButtonClickCountRef = useRef(0);

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
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
  }, []);

  useEffect(() => {
    if (mode) {
      setSelectedMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording, isPaused]);

  const showHideSubModal = useCallback(() => {
    setIsSubModalOpen(!isSubModalOpen);
  }, [isSubModalOpen]);

  const handleBack = () => {
    navigateVoiceRx({ patient_data, isFromTabView }, {}, "mobile_voice_recording_back");
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
      
      if (audioChunksRef.current.length === 0) {
        audioChunksRef.current = [];
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const recorder = mediaRecorderRef.current;
        const mimeType = recorder?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
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
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage?.track_event?.("TP_App_VoiceRx_Paused", {
      patient_contact: patient_data?.pm_contact_no || "",
      patient_id: patient_data?.patient_unique_id || "",
      doctor_speciality: profile?.dp_name,
      doctor_unique_id: profile?.doctor_unique_id,
      clinic_name,
      rx_id: existingGenRxDetails?._id || caseManagerData?.smart_prescription_filename || "",
    });
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
    cleanupRecording();
    navigateVoiceRx({ patient_data, isFromTabView }, {}, "mobile_voice_recording_quit");
  };

  const handleStayRecording = async () => {
    noStayClickCountRef.current += 1;
    setShowQuitRecordingModal(false);
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
      b2c_id: profile?.b2c,
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
      const clinic = getClinic(profile?.hospital_data);
      window.Moengage.track_event("TP_App_AV_Submit", {
        ...getVoiceRxMoengageBasePayload({
          profile,
          userId,
          patientData: patient_data,
          clinic,
        }),
        mode: selectedMode || mode,
      });
      
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
      } else {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        blob = new Blob(audioChunksRef.current, { type: mimeType });
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);

      if (!blob || blob.size === 0) {
        message.error('No audio captured. Please try again.');
        return;
      }

      const activeMode = selectedMode || mode || 'dictation';
      const activeService = activeMode === 'ambient' ? S_AMBIENT_VOICE_RX : S_VOICE_RX;
      window.TATVA_ACTIVE_VOICE_SERVICE = activeService;

      const audioUrl = URL.createObjectURL(blob);
      const arrayBuffer = await blob.arrayBuffer();

      navigate('/prescription', {
        state: {
          patient_data,
          fromVoiceRecording: true,
          audioBlob: blob,
          audioBlobUrl: audioUrl,
          consent: consent,
          audioBlobArrayBuffer: arrayBuffer,
          mode: activeMode,
          noStayClickCount: noStayClickCountRef.current,
          crossButtonClickCount: crossButtonClickCountRef.current,
          mutePauseButtonClickCount: mutePauseButtonClickCountRef.current,
          existingPrescriptionData,
          existingGenRxDetails,
          caseManagerData,
          mobileQueries: location.state?.mobileQueries || [],
        }
      });
    } catch (err) {
      console.error('Error sending recording:', err);
      message.error('Failed to send recording');
    }
  };

  useEffect(() => {
    if (mode && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      setTimeout(() => {
        handleStartRecording();
      }, 300);
    }
  }, [mode]);

  const getPatientAge = () => {
    if (!patient_data) return '';
    const parts = [];
    if (patient_data?.ageYears) parts.push(`${patient_data.ageYears}y`);
    return parts.join(' ');
  };

  const getPatientGender = () => {
    if (!patient_data?.pm_gender) return '';
    const gender = patient_data.pm_gender.toLowerCase();
    if (gender === 'm' || gender === 'male') return 'M';
    if (gender === 'f' || gender === 'female') return 'F';
    return patient_data.pm_gender;
  };

  const togglePatientSummary = () => {
    setShowPatientSummary(!showPatientSummary);
  };

  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const st = el.scrollTop;
    const last = lastScrollTopRef.current;
    if (st <= 10) {
      setFloatingBadgeVisible(true);
    } else if (st > last && st - last > 5) {
      setFloatingBadgeVisible(false);
    } else if (st < last && last - st > 5) {
      setFloatingBadgeVisible(true);
    }
    lastScrollTopRef.current = st;
  }, []);

  return (
    <div className="mobile-voice-recording">
      <div className="mobile-voice-recording-header">
        <button className="back-button" onClick={handleBack} type="button">
          <img src={arrowLeftIcon} alt="Back" />
        </button>
        <h1 className="header-title">Consultation</h1>
        <div className="mode-indicator">
          {selectedMode === 'dictation' || mode === 'dictation' ? (
            <>
              <img src={dictateActiveIcon} alt="Dictate mode" className="mode-icon" />
              <span className="mode-text">Dictate Mode</span>
            </>
          ) : (
            <>
              <img src={ambientActiveIcon} alt="Ambient mode" className="mode-icon" />
              <span className="mode-text">Ambient Mode</span>
            </>
          )}
        </div>
      </div>

      {patient_data && Object.keys(patient_data).length > 0 && (
        <div
          className={`patient-info-badge-floating-wrapper ${!floatingBadgeVisible ? 'patient-info-badge-floating-wrapper--hidden' : ''}`}
          onClick={() => setPatientSheetOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPatientSheetOpen(true); } }}
          role="button"
          tabIndex={0}
        >
          <div className="patient-info-badge">
            <img src={userGrayIcon} alt="User" className="user-icon" />
            <div className="patient-info-text">
              <span className="patient-name">
                {patient_data?.pm_fullname || 'Patient'}
              </span>
              <span className="patient-details">
                ({getPatientGender()}, {getPatientAge()})
              </span>
            </div>
          </div>
        </div>
      )}

      <div 
        className={`mobile-voice-recording-content ${patient_data && Object.keys(patient_data).length > 0 ? 'has-patient-badge' : ''}`} 
        ref={contentRef} onScroll={handleScroll}>
        <div className="welcome-message-card">
          <div className="ai-icon-wrapper">
            <img src={imageBackground} alt="AI" className="ai-icon" />
          </div>
          <p className="welcome-text">
            Hi Doctor! Start your consultation by <strong>dictating the Rx</strong> or{' '}
            <strong>by capturing your conversation with the patient</strong>. I'll{' '}
            <strong>transcribe</strong> & <strong>structure</strong> it into the{' '}
            <strong>Rx Pad</strong> automatically!
          </p>
        </div>

        {/* Patient summary section - commented out
        <div className="patient-summary-card">
          <div className="summary-header">
            <div className="summary-title-section">
              <img src={ddxIcon} alt="DDx" className="summary-icon" />
              <p className="summary-title">Patient's Summary</p>
            </div>
          </div>
          <div className="summary-divider" />
          <div className={`summary-content ${showPatientSummary ? 'expanded' : ''}`}>
            <p className="summary-text">
              <strong>26-year-old male with diabetes and hypertension</strong>, presented
              for follow-up. Known case of diabetes and hypertension for <strong>2 years</strong>,
              on regular medication. <strong>Last visit (24/12/2025)</strong> summary noted{' '}
              <strong>viral fever with mild dehydration</strong>; the patient was prescribed{' '}
              <strong>Paracetamol 650 mg</strong> SOS
            </p>
          </div>
          <button className="view-summary-button" onClick={togglePatientSummary} type="button">
            <span>View Detailed Summary</span>
            <i className={`icon-right ${showPatientSummary ? 'rotated' : ''}`} />
          </button>
        </div>
        */}
      </div>

      {isRecording && (
        <div className="recording-controls-container">
          <div className="recording-controls">
            <button className="control-button cancel-button" onClick={handleCancelRecordingClick} type="button">
              <img src={close2Icon} alt="Cancel" className="control-icon" />
            </button>
            
            <button 
              className={`control-button pause-button ${isPaused ? 'paused' : ''}`}
              onClick={handlePauseResume}
              type="button"
            >
              {isPaused ? (
                <img src={mutedMicrophoneIcon} alt="Muted" className="control-icon muted-icon" />
              ) : (
                <img src={muteIcon} alt="Unmuted" className="control-icon" />
              )}
            </button>
            
            <div className="time-label">{formatTime(recordingTime)}</div>
            
            <div className="wave-visualizer">
              <VoiceWaveVisualizer isRecording={isRecording} isPaused={isPaused} />
            </div>
            
            <button className="control-button submit-button" onClick={handleSend} type="button">
              <img src={frame2Icon} alt="Submit" className="control-icon" />
            </button>
          </div>
          
          <div className="listening-indicator">
            <div className="listening-text">
              {isPaused ? "Unmute to Continue Recording" : "I'm Listening..."}
            </div>
          </div>
        </div>
      )}

      <Drawer
        placement="bottom"
        onClose={handleStayRecording}
        open={showQuitRecordingModal}
        height="auto"
        className="quit-recording-bottom-sheet"
        closable={false}
        maskClosable={true}
        destroyOnClose={true}
      >
        <div className="quit-recording-sheet-content">
          <div className="quit-sheet-header">
            <h3 className="quit-sheet-title">Are you sure you want to quit?</h3>
            <button 
              className="quit-sheet-close-btn" 
              onClick={handleStayRecording} 
              type="button"
              aria-label="Close"
            >
              <img src={close2Icon} alt="Close" className="quit-sheet-close-icon" />
            </button>
          </div>
          
          <div className="quit-sheet-description">
            <p>If you quit, all progress in this session will be lost and you'll need to start over</p>
          </div>
          
          <div className="quit-sheet-actions">
            <button
              type="button"
              className="quit-sheet-btn quit-btn"
              onClick={handleQuitRecording}
            >
              Yes, Quit
            </button>
            <button
              type="button"
              className="quit-sheet-btn stay-btn"
              onClick={handleStayRecording}
            >
              No, Stay
            </button>
          </div>
        </div>
      </Drawer>

      {patient_data && Object.keys(patient_data).length > 0 && (
        <PatientDetailsBottomSheet
          visible={patientSheetOpen}
          onClose={() => setPatientSheetOpen(false)}
          patient_data={patient_data}
          onBeforeNavigate={cleanupRecording}
        />
      )}

      {!isFreeVoiceRxUser && (
        <ExpiredSubModal
          title={S_VOICE_RX}
          styles={{
            mask: {
              marginLeft: 0,
              marginTop: 0,
              background: "rgba(0, 0, 0, 0.28)",
              backdropFilter: "blur(2px)",
            },
            wrapper: {
              marginLeft: 0,
              marginTop: 0,
              background: "rgba(0, 0, 0, 0.28)",
            },
          }}
          isSubModalOpen={isSubModalOpen}
          showHideSubModal={showHideSubModal}
        />
      )}
    </div>
  );
}

export default MobileVoiceRecording;

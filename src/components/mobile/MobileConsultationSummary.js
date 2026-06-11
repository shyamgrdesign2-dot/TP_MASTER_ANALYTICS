import React, { useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { message } from 'antd';

import { S_AMBIENT_VOICE_RX } from '../../utils/constants';
import { useVoiceRxNavigation } from '../../utils/voiceRxNavigation';
import PatientDetailsBottomSheet from './PatientDetailsBottomSheet';
import './MobileConsultationSummary.scss';
import { ASSETS } from "../../assets";
const {
  arrowLeft: arrowLeftIcon,
  userGray: userGrayIcon,
  imageBackground,
  ddx: ddxIcon,
} = ASSETS.mobile;
const {
  dictateActive: dictateActiveIcon,
  ambientModeActive: ambientActiveIcon,
} = ASSETS.images;
const startVoiceIcon = ASSETS.mobile.startVoice;
const {
  doctorAvatar,
  genrxsendcta: genRxSendCta,
} = ASSETS.images;
const fullScreenIcon = ASSETS.mobile.fullScreen;

function MobileConsultationSummary({ onOpenRxPad, onTypedInputSubmit, onVoiceRxClick, mobileRxData, queries = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigateVoiceRx = useVoiceRxNavigation();

  const { state } = location;
  // Merge mobileRxData (from Rx Pad) with location.state
  // mobileRxData has: prescriptionData, genRxDetails, fullTranscript, conversations
  // location.state has: patient_data, caseManagerData, mode, and potentially the Rx data
  const {
    patient_data,
    caseManagerData,
    mode,
    genRxDetails: stateGenRxDetails,
    fullTranscript: stateFullTranscript,
    conversations: stateConversations,
    prescriptionData: statePrescriptionData,
  } = state || {};

  // Use mobileRxData if available (from Rx Pad), otherwise use location.state
  const genRxDetails = mobileRxData?.genRxDetails || stateGenRxDetails;
  const fullTranscript = mobileRxData?.fullTranscript || stateFullTranscript;
  const conversations = mobileRxData?.conversations || stateConversations;
  const prescriptionData = mobileRxData?.prescriptionData || statePrescriptionData;

  const [showPatientSummary, setShowPatientSummary] = useState(true);
  const [typedInput, setTypedInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [floatingBadgeVisible, setFloatingBadgeVisible] = useState(true);
  const [patientSheetOpen, setPatientSheetOpen] = useState(false);

  const contentRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  const isAmbientMode = mode === 'ambient' || window.TATVA_ACTIVE_VOICE_SERVICE === S_AMBIENT_VOICE_RX;

  const handleBack = () => {
    navigateVoiceRx({ patient_data }, {}, "mobile_consultation_summary_back");
  };

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

  // Include saved-Rx signals so "Your Rx is ready" card shows when landing from End Visit Edit
  // (mobileRxData/state may not have prescriptionData yet; caseManagerData is always passed)
  const hasTranscript =
    queries.length > 0 ||
    fullTranscript ||
    (conversations && conversations.length > 0) ||
    prescriptionData ||
    !!caseManagerData?.smart_prescription_filename ||
    !!caseManagerData?.tcm_id;

  const handleTypedInputSend = () => {
    if (!typedInput || typedInput.trim().length === 0) {
      message.warning('Please type something to send');
      return;
    }

    // Call parent callback to process typed text (matches web behavior)
    if (onTypedInputSubmit) {
      onTypedInputSubmit(typedInput);
      setTypedInput(''); // Clear input after sending
    }
  };

  const handleVoiceRxClick = () => {
    // Use parent callback if provided (for passing existing data), otherwise navigate directly
    if (onVoiceRxClick) {
      onVoiceRxClick();
    } else {
    navigate('/voice-recording', {
      state: {
        patient_data,
        mode,
        isFromTabView: true,
      }
    });
    }
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTypedInputSend();
    }
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
    <div className="mobile-consultation-summary">
      <div className="mobile-voice-recording-header">
        <button className="back-button" onClick={handleBack} type="button">
          <img src={arrowLeftIcon} alt="Back" />
        </button>
        <h1 className="header-title">Consultation</h1>
        <div className="mode-indicator">
          {isAmbientMode ? (
            <>
              <img src={ambientActiveIcon} alt="Ambient mode" className="mode-icon" />
              <span className="mode-text">Ambient Mode</span>
            </>
          ) : (
            <>
              <img src={dictateActiveIcon} alt="Dictate mode" className="mode-icon" />
              <span className="mode-text">Dictate Mode</span>
            </>
          )}
        </div>
      </div>

      {patient_data && (
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
                {patient_data?.pm_fullname || patient_data?.patient_name || 'Patient'}
              </span>
              <span className="patient-details">
                ({getPatientGender()}, {getPatientAge()})
              </span>
            </div>
          </div>
        </div>
      )}

      <div 
        className={`mobile-voice-recording-content ${patient_data ? 'has-patient-badge' : ''}`} 
        ref={contentRef} 
        onScroll={handleScroll}
      >
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
        {patient_data && (
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
                {patient_data?.ageYears && `${patient_data.ageYears}-year-old `}
                {patient_data?.pm_gender && (
                  <>
                    <strong>{getPatientGender().toLowerCase()}</strong>{' '}
                  </>
                )}
                {patient_data?.medicalHistory && (
                  <>
                    with <strong>{patient_data.medicalHistory}</strong>
                  </>
                )}
              </p>
            </div>
            <button className="view-summary-button" onClick={togglePatientSummary} type="button">
              <span>{showPatientSummary ? 'View Less' : 'View Detailed Summary'}</span>
              <i className={`icon-right ${showPatientSummary ? 'up' : 'down'}`} />
            </button>
          </div>
        )}
        */}

        {/* Render all queries with proper handling for ambient mode conversations */}
        {queries.length > 0 && queries.map((query, idx) => {
          const isAudio = query && typeof query === 'object' && query.isAudio;
          const hasConversations = query?.conversations && query.conversations.length > 0;
          
          // Check if it's text-only (matches web version logic - lines 5373-5385)
          // For ambient mode: text inputs create single doctor conversation matching text → show as plain text
          const isTextOnly = !isAudio && (
            typeof query === 'string' ||
            (query && typeof query === 'object' && !query.isAudio && (
              !query.conversations ||
              // Ambient mode text input: single doctor conversation matching text
              (query.conversations && query.conversations.length === 1 &&
               query.text &&
               (query.conversations[0]?.speaker?.toLowerCase() === 'doctor' ||
                query.conversations[0]?.speaker?.toLowerCase() === 'dr') &&
               (query.conversations[0]?.text === query.text ||
                query.conversations[0]?.message === query.text ||
                query.conversations[0]?.content === query.text))
            ))
          );
          
          // Extract text for simple display
          let queryText = '';
          if (typeof query === 'string') {
            queryText = query;
          } else if (query && typeof query === 'object') {
            queryText = query.text || '';
          }
          
          // Don't render if no content
          if (!queryText || !queryText.trim()) {
            // Unless it's a conversation that we should show
            if (!(hasConversations && query.conversations.length > 0)) {
              return null;
            }
          }
          
          return (
            <React.Fragment key={idx}>
              <div className="text-only-box" style={{ marginTop: idx > 0 ? '16px' : 0 }}>
                {/* Show conversation bubbles ONLY for audio in ambient mode (multi-party) */}
                {/* Text input in ambient mode shows as plain text (matches web) */}
                {hasConversations && !isTextOnly ? (
                  <div className="conversations-list">
                    {query.conversations.map((conv, convIdx) => {
                      const text = conv?.message || conv?.text || conv?.content || '';
                      const speaker = (conv?.speaker || '').toLowerCase();
                      const isDoctor = speaker === 'doctor' || speaker === 'dr';
                      
                      return (
                        <div key={convIdx} className={`conversation-item ${isDoctor ? 'doctor-msg' : 'patient-msg'}`}>
                          <span className="speaker-name">{isDoctor ? 'Doctor' : 'Patient'}:</span>
                          <span className="conversation-text">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* For text-only (typed input) or dictate mode, show simple text without labels */
                  <div className="text-only-content">{queryText}</div>
                )}
              </div>
              {/* Show "Rx is ready" message after each query */}
              <div className="rx-ready-content" style={{ marginTop: '16px' }}>
                <div className="ai-content-icon">
                  <img src={doctorAvatar} alt="Doctor" className="doctor-avatar" />
                </div>
                <div className="rx-ready-text">
                  Your <strong>Rx is ready</strong>! You can review it in the <strong>Rx Pad</strong>. You can also make changes using <strong>VoiceRx</strong> or by simply <strong>typing below</strong>!
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* Show "Review Rx & End Visit" button only if we have queries */}
        {hasTranscript && (
          <div className="rx-ready-wrapper" style={{ marginTop: queries.length > 0 ? '16px' : 0 }}>
            <div className="rx-ready-card">
              <div className="rx-ready-title">Your Rx Is ready!</div>
              <button className="review-rx-button" onClick={onOpenRxPad} type="button">
                <span>Review Rx & End Visit</span>
                <img src={fullScreenIcon} alt="Full Screen" className="fullscreen-icon" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="consultation-footer">
        <div className="footer-content">
          <div className="input-container">
            <input
              type="text"
              placeholder="Type Rx here..."
              className="rx-input"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              onKeyPress={handleInputKeyPress}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setTimeout(() => setIsTyping(false), 200)}
            />
            {(isTyping || typedInput.trim().length > 0) ? (
              <button 
                className="send-button" 
                type="button"
                onClick={handleTypedInputSend}
              >
                <img src={genRxSendCta} alt="Send" className="send-icon" />
              </button>
            ) : (
            <button 
              className="voice-rx-button" 
              type="button"
              onClick={handleVoiceRxClick}
            >
              <img src={startVoiceIcon} alt="Start Voice" className="start-voice-icon" />
              <span className="voice-rx-text">Voice Rx</span>
            </button>
            )}
          </div>
          <div className="home-indicator" />
        </div>
      </div>

      {patient_data && (
        <PatientDetailsBottomSheet
          visible={patientSheetOpen}
          onClose={() => setPatientSheetOpen(false)}
          patient_data={patient_data}
        />
      )}
    </div>
  );
}

export default MobileConsultationSummary;

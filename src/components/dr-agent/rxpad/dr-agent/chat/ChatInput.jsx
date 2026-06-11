import { useCallback, useState, useEffect, useRef, useId } from "react";
import { cn } from "../../../utils";
import styles from "./ChatInput.module.scss";

import { SecuritySafe } from "iconsax-reactjs";
import { AI_GRADIENT } from "../constants";
import { VoiceRxWaveGlyph } from "../../../voicerx/VoiceRxBrandIcon";

/* ── Inline SVG Icons (14-16px) ── */

function PaperclipIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function AiVoiceIcon({ size = 24 }) {
  const gid = useId().replace(/[:]/g, "");
  const grad = `url(#aiv${gid})`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`aiv${gid}`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="3.04%" stopColor="#D565EA" />
          <stop offset="66.74%" stopColor="#673AAC" />
          <stop offset="130.45%" stopColor="#1A1994" />
        </linearGradient>
      </defs>
      <path
        opacity="0.4"
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        fill={grad}
      />
      <path
        d="M6 14.8896C5.59 14.8896 5.25 14.5496 5.25 14.1396V9.84961C5.25 9.43961 5.59 9.09961 6 9.09961C6.41 9.09961 6.75 9.43961 6.75 9.84961V14.1396C6.75 14.5596 6.41 14.8896 6 14.8896Z"
        fill={grad}
      />
      <path
        d="M9 16.3197C8.59 16.3197 8.25 15.9797 8.25 15.5697V8.42969C8.25 8.01969 8.59 7.67969 9 7.67969C9.41 7.67969 9.75 8.01969 9.75 8.42969V15.5697C9.75 15.9897 9.41 16.3197 9 16.3197Z"
        fill={grad}
      />
      <path
        d="M12 17.75C11.59 17.75 11.25 17.41 11.25 17V7C11.25 6.59 11.59 6.25 12 6.25C12.41 6.25 12.75 6.59 12.75 7V17C12.75 17.41 12.41 17.75 12 17.75Z"
        fill={grad}
      />
      <path
        d="M15 16.3197C14.59 16.3197 14.25 15.9797 14.25 15.5697V8.42969C14.25 8.01969 14.59 7.67969 15 7.67969C15.41 7.67969 15.75 8.01969 15.75 8.42969V15.5697C15.75 15.9897 15.41 16.3197 15 16.3197Z"
        fill={grad}
      />
      <path
        d="M18 14.8896C17.59 14.8896 17.25 14.5496 17.25 14.1396V9.84961C17.25 9.43961 17.59 9.09961 18 9.09961C18.41 9.09961 18.75 9.43961 18.75 9.84961V14.1396C18.75 14.5596 18.41 14.8896 18 14.8896Z"
        fill={grad}
      />
    </svg>
  );
}

function AiSendIcon({ size = 24 }) {
  const gid = useId().replace(/[:]/g, "");
  const grad = `url(#ais${gid})`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`ais${gid}`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="3.04%" stopColor="#D565EA" />
          <stop offset="66.74%" stopColor="#673AAC" />
          <stop offset="130.45%" stopColor="#1A1994" />
        </linearGradient>
      </defs>
      <path
        opacity="0.4"
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        fill={grad}
      />
      <path
        d="M15.53 10.9704L12.53 7.97043C12.24 7.68043 11.76 7.68043 11.47 7.97043L8.47 10.9704C8.18 11.2604 8.18 11.7404 8.47 12.0304C8.76 12.3204 9.24 12.3204 9.53 12.0304L11.25 10.3104V15.5004C11.25 15.9104 11.59 16.2504 12 16.2504C12.41 16.2504 12.75 15.9104 12.75 15.5004V10.3104L14.47 12.0304C14.62 12.1804 14.81 12.2504 15 12.2504C15.19 12.2504 15.38 12.1804 15.53 12.0304C15.82 11.7404 15.82 11.2604 15.53 10.9704Z"
        fill={grad}
      />
    </svg>
  );
}

function MicIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 001.5.86l11.04-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="5 13 10 18 19 6" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ── Recording wave animation bars ── */
function WaveAnimation() {
  return (
    <div className={styles.waveAnimation}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className={styles.waveBar}
          style={{
            background: AI_GRADIENT,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Recording timer — pauses when isPaused is true ── */
function RecordingTimer({ isPaused }) {
  const [elapsed, setElapsed] = useState(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    if (isPaused) return;
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed((prev) => prev + Math.round((now - lastTickRef.current) / 1000));
      lastTickRef.current = now;
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <span className={styles.timerText}>
      {mm}:{ss}
    </span>
  );
}

/** Patient chip — shows name + (meta) inside input box. Locked mode for RxPad. */
function PatientChip({
  name,
  meta,
  locked,
  lockedMessage,
  onClick,
  onLockedClick,
  isClinic,
}) {
  const [showLockedTip, setShowLockedTip] = useState(false);

  const handleClick = () => {
    if (locked) {
      setShowLockedTip(true);
      setTimeout(() => setShowLockedTip(false), 2500);
      onLockedClick?.();
    } else {
      onClick?.();
    }
  };

  const metaParts = meta ? meta.split(/[|\/]/) : [];
  const gender = metaParts[0]?.trim() || "";
  const age = metaParts[1]?.trim() || "";

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          styles.patientChip,
          locked ? styles.chipLocked : styles.chipClickable
        )}
        aria-label={`Patient context: ${name}`}
      >
        {/* Context icon */}
        <span style={{ flexShrink: 0, color: "var(--tp-slate-600)" }}>
          {isClinic ? (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <path
                opacity="0.4"
                d="M2 22H22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17 2H7C4 2 3 3.79 3 6V22H21V6C21 3.79 20 2 17 2Z"
                fill="currentColor"
                opacity="0.4"
              />
              <path
                d="M14.06 15H9.93996C9.47996 15 9.09998 15.38 9.09998 15.84V22H14.9V15.84C14.9 15.38 14.52 15 14.06 15Z"
                fill="currentColor"
              />
              <path
                d="M10 11H8C7.45 11 7 10.55 7 10V8.5C7 7.95 7.45 7.5 8 7.5H10C10.55 7.5 11 7.95 11 8.5V10C11 10.55 10.55 11 10 11Z"
                fill="currentColor"
              />
              <path
                d="M16 11H14C13.45 11 13 10.55 13 10V8.5C13 7.95 13.45 7.5 14 7.5H16C16.55 7.5 17 7.95 17 8.5V10C17 10.55 16.55 11 16 11Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <path
                opacity="0.4"
                d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                fill="currentColor"
              />
              <path
                d="M12 14.5c-5.01 0-9.09 3.36-9.09 7.5 0 .28.22.5.5.5h17.18c.28 0 .5-.22.5-.5 0-4.14-4.08-7.5-9.09-7.5Z"
                fill="currentColor"
              />
            </svg>
          )}
        </span>
        <span className={styles.chipName}>{name}</span>
        {meta && (
          <span className={styles.chipMeta}>
            <span className={styles.chipMetaText}>(</span>
            <span className={styles.chipMetaText}>{gender}</span>
            {age && (
              <>
                <span className={styles.chipMetaDivider}>|</span>
                <span className={styles.chipMetaText}>{age}</span>
              </>
            )}
            <span className={styles.chipMetaText}>)</span>
          </span>
        )}
        {!locked && (
          <svg
            width={12}
            height={12}
            viewBox="0 0 12 12"
            fill="none"
            className={styles.chipChevron}
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      {/* Locked tooltip */}
      {showLockedTip && (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: "100%",
            marginBottom: 6,
            zIndex: 50,
          }}
        >
          <div className={styles.lockedTooltip}>
            {lockedMessage || "Context switching is not available on this page"}
            <div
              style={{
                position: "absolute",
                left: 16,
                top: "100%",
                borderWidth: 4,
                borderStyle: "solid",
                borderColor: "transparent",
                borderTopColor: "var(--tp-slate-800)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatInput({
  value,
  onChange,
  onSend,
  quickActions = [],
  onQuickActionTap,
  onAttach,
  onVoiceTranscription,
  disabled = false,
  placeholder = "Ask about this patient...",
  className,
  isPrefilled = false,
  patientName,
  patientMeta,
  onPatientClick,
  patientLocked = false,
  patientLockedMessage,
  onLockedChipClick,
  isClinicContext = false,
  voiceRxCta = false,
  onVoiceRxCtaClick,
  voiceRxFooterLayout = false,
}) {
  const hasText = value.trim().length > 0;
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxH = 120;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey && hasText && !disabled) {
        e.preventDefault();
        onSend();
      }
    },
    [hasText, disabled, onSend]
  );

  const handleMicClick = useCallback(() => {
    setIsRecording(true);
    setIsPaused(false);
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleDiscard = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const handleSendRecording = useCallback(() => {
    const mockTranscribedText =
      "Patient complaining of fever since 3 days, dry cough and body ache since 2 days. " +
      "On examination, throat congested, bilateral chest clear, no lymphadenopathy. " +
      "Diagnosis: Acute viral pharyngitis with allergic rhinitis. " +
      "Prescribing Paracetamol 650mg 1-0-1 after food for 5 days, Cetirizine 10mg 0-0-1 for 5 days, Pantoprazole 40mg 1-0-0 before breakfast for 5 days. " +
      "Advising rest, warm fluids, steam inhalation, salt gargle twice daily. " +
      "Suggest test CBC, ESR if fever persists. " +
      "Follow up in 5 days if not better.";

    if (onVoiceTranscription) {
      onVoiceTranscription(mockTranscribedText);
    } else {
      onChange(mockTranscribedText);
    }
    setIsRecording(false);
    setIsPaused(false);
  }, [onChange, onVoiceTranscription]);

  return (
    <div className={cn(styles.root, className)}>
      {/* Heavier bottom fade above input */}
      <div className={styles.gradientOverlay} />

      {/* ── Recording mode ── */}
      {isRecording ? (
        <div className={styles.recordingRow}>
          <div
            className={cn(
              styles.recordingBar,
              isPaused ? styles.recordingBarPaused : styles.recordingBarActive
            )}
          >
            <span
              className={cn(
                styles.recordingDot,
                isPaused ? styles.recordingDotPaused : styles.recordingDotActive
              )}
            />
            {isPaused ? (
              <span className={styles.pausedLabel}>Paused</span>
            ) : (
              <WaveAnimation />
            )}
            <span style={{ flex: 1 }} />
            <RecordingTimer isPaused={isPaused} />
            <button
              type="button"
              onClick={handlePause}
              className={styles.recordingAction}
              title={isPaused ? "Resume recording" : "Pause recording"}
            >
              {isPaused ? <ResumeIcon /> : <PauseIcon />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSendRecording}
            className={styles.recordingSend}
            title="Submit for transcription"
          >
            <CheckIcon />
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className={styles.recordingDiscard}
            title="Discard recording"
          >
            <CrossIcon />
          </button>
        </div>
      ) : (
        /* ── Normal input mode — two-row layout ── */
        <div
          className={cn(
            styles.inputContainer,
            isPrefilled && styles.inputContainerPrefilled,
            disabled && styles.inputContainerDisabled
          )}
        >
          {/* Row 1: Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className={styles.textarea}
          />

          {/* Row 2: Footer row */}
          <div className={cn(styles.footerRow)}>
            <div className={styles.footerLeft}>
              {voiceRxFooterLayout && onAttach ? (
                <button
                  type="button"
                  onClick={onAttach}
                  disabled={disabled}
                  className={cn(
                    styles.iconBtn,
                    disabled && styles.iconBtnDisabled
                  )}
                  title="Add files and more"
                >
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M0 12C0 5.37258 5.37258 0 12 0V0C18.6274 0 24 5.37258 24 12V12C24 18.6274 18.6274 24 12 24V24C5.37258 24 0 18.6274 0 12V12Z"
                      fill="var(--tp-slate-100, #F1F5F9)"
                    />
                    <path
                      d="M7.625 12H16.375"
                      stroke="#667085"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 7.625V16.375"
                      stroke="#667085"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : !voiceRxFooterLayout && patientName ? (
                <PatientChip
                  name={patientName}
                  meta={patientMeta}
                  locked={patientLocked}
                  lockedMessage={patientLockedMessage}
                  onClick={onPatientClick}
                  onLockedClick={onLockedChipClick}
                  isClinic={isClinicContext}
                />
              ) : (
                <div />
              )}
            </div>

            <div className={styles.footerRight}>
              {!voiceRxFooterLayout && onAttach && (
                <button
                  type="button"
                  onClick={onAttach}
                  disabled={disabled}
                  className={cn(
                    styles.iconBtn,
                    disabled && styles.iconBtnDisabled
                  )}
                  title="Add files and more"
                >
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M0 12C0 5.37258 5.37258 0 12 0V0C18.6274 0 24 5.37258 24 12V12C24 18.6274 18.6274 24 12 24V24C5.37258 24 0 18.6274 0 12V12Z"
                      fill="var(--tp-slate-100, #F1F5F9)"
                    />
                    <path
                      d="M7.625 12H16.375"
                      stroke="#667085"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 7.625V16.375"
                      stroke="#667085"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {/* Send / Voice / Mic button */}
              {hasText ? (
                <button
                  type="button"
                  onClick={onSend}
                  disabled={disabled}
                  className={cn(
                    styles.iconBtn,
                    disabled && styles.iconBtnDisabled
                  )}
                  title="Enter to send · Shift+Enter for new line"
                >
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M0 12C0 5.37258 5.37258 0 12 0V0C18.6274 0 24 5.37258 24 12V12C24 18.6274 18.6274 24 12 24V24C5.37258 24 0 18.6274 0 12V12Z"
                      fill="url(#sendGrad)"
                    />
                    <path
                      d="M8.2063 10.4812L12 6.68745L15.7938 10.4812"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 17.3125V6.79375"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <defs>
                      <linearGradient
                        id="sendGrad"
                        x1="-0.0224"
                        y1="10.3128"
                        x2="24.0296"
                        y2="10.365"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0.0304" stopColor="#D565EA" />
                        <stop offset="0.6674" stopColor="#673AAC" />
                        <stop offset="1" stopColor="#1A1994" />
                      </linearGradient>
                    </defs>
                  </svg>
                </button>
              ) : voiceRxCta ? (
                <button
                  type="button"
                  onClick={() => onVoiceRxCtaClick?.()}
                  disabled={disabled}
                  className={cn(
                    styles.voiceRxCtaBtn,
                    disabled && styles.voiceRxCtaBtnDisabled
                  )}
                  title="VoiceRx — start consultation capture"
                >
                  <VoiceRxWaveGlyph />
                  VoiceRx
                </button>
              ) : (
                /* Plain gray-circle mic */
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={disabled}
                  className={cn(
                    styles.iconBtn,
                    disabled && styles.iconBtnDisabled
                  )}
                  title="Use voice to dictate"
                >
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M0 12C0 5.37258 5.37258 0 12 0V0C18.6274 0 24 5.37258 24 12V12C24 18.6274 18.6274 24 12 24V24C5.37258 24 0 18.6274 0 12V12Z"
                      fill="var(--tp-slate-100, #F1F5F9)"
                    />
                    <g transform="translate(5 5) scale(0.58333)">
                      <path
                        d="M19.1199 9.12035C18.7299 9.12035 18.4199 9.43035 18.4199 9.82035V11.4004C18.4199 14.9404 15.5399 17.8204 11.9999 17.8204C8.45993 17.8204 5.57993 14.9404 5.57993 11.4004V9.81035C5.57993 9.42035 5.26993 9.11035 4.87993 9.11035C4.48993 9.11035 4.17993 9.42035 4.17993 9.81035V11.3904C4.17993 15.4604 7.30993 18.8104 11.2999 19.1704V21.3004C11.2999 21.6904 11.6099 22.0004 11.9999 22.0004C12.3899 22.0004 12.6999 21.6904 12.6999 21.3004V19.1704C16.6799 18.8204 19.8199 15.4604 19.8199 11.3904V9.81035C19.8099 9.43035 19.4999 9.12035 19.1199 9.12035Z"
                        fill="#667085"
                      />
                      <path
                        d="M12.0001 2C9.56008 2 7.58008 3.98 7.58008 6.42V11.54C7.58008 13.98 9.56008 15.96 12.0001 15.96C14.4401 15.96 16.4201 13.98 16.4201 11.54V6.42C16.4201 3.98 14.4401 2 12.0001 2ZM13.3101 8.95C13.2401 9.21 13.0101 9.38 12.7501 9.38C12.7001 9.38 12.6501 9.37 12.6001 9.36C12.2101 9.25 11.8001 9.25 11.4101 9.36C11.0901 9.45 10.7801 9.26 10.7001 8.95C10.6101 8.64 10.8001 8.32 11.1101 8.24C11.7001 8.08 12.3201 8.08 12.9101 8.24C13.2101 8.32 13.3901 8.64 13.3101 8.95ZM13.8401 7.01C13.7501 7.25 13.5301 7.39 13.2901 7.39C13.2201 7.39 13.1601 7.38 13.0901 7.36C12.3901 7.1 11.6101 7.1 10.9101 7.36C10.6101 7.47 10.2701 7.31 10.1601 7.01C10.0501 6.71 10.2101 6.37 10.5101 6.27C11.4701 5.92 12.5301 5.92 13.4901 6.27C13.7901 6.38 13.9501 6.71 13.8401 7.01Z"
                        fill="#667085"
                      />
                    </g>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trust indicator */}
      <div className={styles.trustRow}>
        <SecuritySafe
          size={12}
          variant="Bulk"
          style={{ flexShrink: 0, color: "var(--tp-slate-300)" }}
        />
        <span className={styles.trustText}>
          Data stays private · AI-assisted, you decide
        </span>
      </div>
    </div>
  );
}

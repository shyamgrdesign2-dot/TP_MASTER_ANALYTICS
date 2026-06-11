import { cn } from "../../../utils";
import { VoiceRxIcon } from "../../../voicerx/voice-consult-icons";
import { Tooltip } from "../../../atoms/Tooltip";
import { PillBar } from "../chat/PillBar";
import { AttachPanel } from "../chat/AttachPanel";
import { ChatInput } from "../chat/ChatInput";
import styles from "./FooterBar.module.scss";

export function FooterBar({
  voiceRxMode,
  voiceRxRecording,
  voiceFirstTimeMode,
  pills,
  messages,
  isTyping,
  glanceInlinePillsActive,
  showAttachPanel,
  inputValue,
  isPrefilled,
  isDisabled,
  patientLabel,
  patientGender,
  patientAge,
  onPillTap,
  onAttachSelect,
  onAttachClose,
  onStartVoice,
  onInputChange,
  onSend,
  onAttach,
  onVoiceTranscription,
  onLockedChipClick,
  // True when any other mic / mini-recorder is already running.
  voiceLocked = false,
}) {
  return (
    <div
      className={cn(
        styles.footerRoot,
        voiceRxMode && voiceRxRecording ? styles.footerRecording : styles.footerNormal
      )}
    >
      {/* Fade gradient above footer */}
      <div
        className={styles.fadeGradient}
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0.55) 42%, transparent)",
        }}
      />

      {pills.length > 0 &&
        messages.length > 0 &&
        !isTyping &&
        !glanceInlinePillsActive &&
        !voiceFirstTimeMode &&
        !voiceRxMode && (
          <div className={styles.pillBarWrap}>
            <PillBar pills={pills} onTap={onPillTap} disabled={false} />
          </div>
        )}

      {showAttachPanel && !voiceFirstTimeMode && (
        <AttachPanel onSelect={onAttachSelect} onClose={onAttachClose} />
      )}

      {voiceFirstTimeMode && messages.length > 0 && (
        <div className={styles.ctaWrap}>
          {/* da-* styles live in globals.css */}
          {voiceLocked ? (
            <Tooltip
              content="Another mic is active. Close that dictation first."
              side="top"
            >
              <button
                type="button"
                aria-disabled="true"
                onClick={(e) => e.preventDefault()}
                className="vrx-ai-cta"
                style={{
                  position: "relative",
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  height: 48,
                  overflow: "hidden",
                  borderRadius: 12,
                  padding: "0 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.35px",
                  color: "#fff",
                  opacity: 0.5,
                  cursor: "not-allowed",
                  border: "none",
                  background:
                    "linear-gradient(135deg, #D565EA 0%, #673AAC 55%, #1A1994 100%)",
                }}
              >
                <span
                  aria-hidden
                  className="vrx-ai-cta-sheen"
                  style={{
                    pointerEvents: "none",
                    position: "absolute",
                    inset: "0 auto 0 0",
                    zIndex: 0,
                    width: "40%",
                  }}
                />
                <VoiceRxIcon size={32} color="#FFFFFF" style={{ position: "relative", zIndex: 1 }} />
                <span style={{ position: "relative", zIndex: 1 }}>Start with Voice</span>
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={onStartVoice}
              className="vrx-ai-cta"
              style={{
                position: "relative",
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                height: 48,
                overflow: "hidden",
                borderRadius: 12,
                padding: "0 18px",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.35px",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                background:
                  "linear-gradient(135deg, #D565EA 0%, #673AAC 55%, #1A1994 100%)",
                transition: "filter 150ms ease, transform 150ms ease",
              }}
            >
              <span
                aria-hidden
                className="vrx-ai-cta-sheen"
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  inset: "0 auto 0 0",
                  zIndex: 0,
                  width: "40%",
                }}
              />
              <VoiceRxIcon size={32} color="#FFFFFF" style={{ position: "relative", zIndex: 1 }} />
              <span style={{ position: "relative", zIndex: 1 }}>Start with Voice</span>
            </button>
          )}
        </div>
      )}

      {!voiceFirstTimeMode && !voiceRxMode && !voiceRxRecording && (
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          onAttach={onAttach}
          onVoiceTranscription={onVoiceTranscription}
          disabled={isDisabled}
          isPrefilled={isPrefilled}
          placeholder={`Ask about ${patientLabel}...`}
          patientName={patientLabel || undefined}
          patientMeta={
            patientGender && patientAge
              ? `${patientGender}|${patientAge}y`
              : undefined
          }
          patientLocked
          patientLockedMessage={`You're inside ${
            patientLabel?.split(" ")[0] || "this patient"
          }'s prescription page — chat is focused on this patient`}
          onLockedChipClick={onLockedChipClick}
          isClinicContext={false}
        />
      )}
    </div>
  );
}

import React, { useId, useState } from "react";
import { cn } from "../utils";
import styles from "./VoiceRxBottomSheet.module.scss";
import { VoiceConsultKindIcon, VoiceRxIcon } from "./voice-consult-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "../atoms/Tooltip";

const VOICE_RX_SHEET_MODE_LABELS = {
  ambient_consultation: "Conversation Mode",
  dictation_consultation: "Dictation Mode",
};

function InfoIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="8" strokeWidth={3} />
      <line x1="12" y1="12" x2="12" y2="16" />
    </svg>
  );
}

function HeaderCloseIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill={color} />
    </svg>
  );
}

export function VoiceRxBottomSheet({ isOpen, onClose, consultOptions, selectedOption, onSelectOption, onConfirm }) {
  const [consentGiven, setConsentGiven] = useState(true);
  const uid = useId();

  if (!isOpen) return null;

  const canStart = consentGiven;
  const startLabel = selectedOption === "ambient_consultation" ? "Start conversation" : "Start dictation";

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.dragHandle}>
          <span className={styles.dragPill} aria-hidden />
        </div>

        <div className={styles.headerRow}>
          <div className={styles.headerTitle}>
            <h3 className={styles.heading}>
              Consultation mode
              <Tooltip>
                <TooltipTrigger asChild>
                  <span role="button" tabIndex={0} className={styles.infoBtn} aria-label="Info">
                    <InfoIcon size={16} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8} className={styles.infoTooltip}>
                  <div className={styles.tooltipTitle}>Consultation modes</div>
                  <div className={styles.tooltipBody}>
                    <div><strong>Conversation:</strong> captures the live doctor-patient discussion in real time.</div>
                    <div><strong>Dictation:</strong> captures only your narrated clinical notes.</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={styles.closeBtn}>
            <HeaderCloseIcon size={26} color="currentColor" />
          </button>
        </div>

        <div className={styles.options}>
          {consultOptions.map((opt) => {
            const isSelected = selectedOption === opt.value;
            const showConsent = opt.value === "ambient_consultation" && isSelected;
            return (
              <React.Fragment key={opt.value}>
                <div className={cn("vrx-option-card", isSelected ? "vrx-option-card--selected" : "vrx-option-card--idle", styles.optionCard)}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectOption(opt.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectOption(opt.value); } }}
                    aria-pressed={isSelected}
                    className={styles.optionRow}
                  >
                    <span className={cn("vrx-option-tile", isSelected && "vrx-option-tile--selected", styles.optionTile)} aria-hidden>
                      <VoiceConsultKindIcon kind={opt.value} size={28} gradientId={`${uid}-${opt.value}-grad`} />
                    </span>
                    <span className={styles.optionLabel}>
                      <span className={cn(styles.optionLabelText, isSelected && styles.optionLabelSelected)}>
                        {VOICE_RX_SHEET_MODE_LABELS[opt.value]}
                      </span>
                    </span>
                    <span className={cn(styles.radio, isSelected && styles.radioSelected)} aria-hidden>
                      {isSelected && <span className={styles.radioDot} />}
                    </span>
                  </div>
                  {showConsent && (
                    <label onClick={(e) => e.stopPropagation()} className={cn("vrx-consent-pill", styles.consentPill)}>
                      <span className={styles.checkboxWrap}>
                        <input
                          type="checkbox"
                          checked={consentGiven}
                          onChange={(e) => setConsentGiven(e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className={styles.checkboxInput}
                          aria-label="Patient consent"
                        />
                        <span className={cn(styles.checkboxBox, consentGiven && styles.checkboxChecked)}>
                          {consentGiven && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M20 6L9 17L4 12" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </span>
                      <span className={styles.consentText}>Patient consents to this session being recorded.</span>
                    </label>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className={styles.ctaWrap}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canStart}
            aria-label={startLabel}
            className={cn(styles.cta, canStart ? styles.ctaEnabled : styles.ctaDisabled)}
          >
            {canStart && <span aria-hidden className="vrx-ai-cta-sheen" style={{ position: "absolute", inset: "0 auto 0 0", width: "40%", zIndex: 0 }} />}
            <VoiceRxIcon size={24} color={canStart ? "#FFFFFF" : "#94A3B8"} className={styles.ctaIcon} />
            <span className={styles.ctaLabel}>{startLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
